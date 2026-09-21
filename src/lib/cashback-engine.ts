import { prisma } from '@/lib/db'
import { getEntradaLevels, getResidualLevels, getVendasLevels } from '@/lib/api-utils'
import { isKycApproved } from '@/lib/kyc'

// ============================================================================
// MOTOR DE DISTRIBUIÇÃO DE CASHBACK — NewMobility MMN
// ----------------------------------------------------------------------------
// Este módulo é o "elo perdido" entre os eventos de pagamento/venda e as
// tabelas CashbackEntry/CashbackResidual/CashbackSales.
//
// MAPEAMENTO GATILHO → MATRIZ:
//   1. MATRIZ ENTRADA    → compras no app (marketplace orders, serviços)
//   2. MATRIZ RESIDUAL   → pagamento de fatura do plano (mensalidade)
//   3. MATRIZ VENDAS     → vendas de comida, entrega, mobilidade
//
// Cada evento alimenta EXCLUSIVAMENTE a matriz mapeada. Nunca mais de uma.
// ============================================================================

type MatrixType = 'entrada' | 'residual' | 'vendas'

interface DistributionResult {
  matrix: MatrixType
  totalDistributed: number
  entriesCreated: number
  skipped: string[]
}

// ============================================================================
// Função principal: processCashbackDistribution
// ----------------------------------------------------------------------------
// Dado um userId (quem gerou o evento) e o tipo de matriz, percorre a
// árvore de upline via MatrixPosition e distribui o cashback.
//
// Parâmetros:
//   - userId: o usuário cuja ação gerou o cashback (ex: quem comprou, quem
//     pagou a fatura, quem fez a venda)
//   - matrixType: qual matriz alimentar
//   - baseAmountCents: valor base para cálculo (ex: R$ 999,00 = 99900)
//   - eventReferenceId: ID único do evento (invoice ID, order ID) para
//     idempotência — se já existe uma entrada com este referenceId para
//     esta matriz, a distribuição é skipada.
//   - category: (apenas para vendas) 'comida' | 'entrega' | 'mobilidade'
// ============================================================================

export async function processCashbackDistribution(params: {
  userId: string
  matrixType: MatrixType
  baseAmountCents: number
  eventReferenceId: string
  category?: string
}): Promise<DistributionResult> {
  const { userId, matrixType, baseAmountCents, eventReferenceId, category } = params

  const result: DistributionResult = {
    matrix: matrixType,
    totalDistributed: 0,
    entriesCreated: 0,
    skipped: [],
  }

  // 1. IDEMPOTÊNCIA: verificar se já existe distribuição para este evento
  const idempotencyKey = `${matrixType}_${eventReferenceId}`
  try {
    let existing: unknown = null
    if (matrixType === 'entrada') {
      existing = await prisma.cashbackEntry.findFirst({
        where: { fromUserId: userId, referenceId: idempotencyKey },
      })
    } else if (matrixType === 'residual') {
      existing = await prisma.cashbackResidual.findFirst({
        where: { fromUserId: userId, referenceId: idempotencyKey },
      })
    } else if (matrixType === 'vendas') {
      existing = await prisma.cashbackSales.findFirst({
        where: { fromUserId: userId, referenceId: idempotencyKey },
      })
    }
    if (existing) {
      result.skipped.push(`Idempotência: evento ${idempotencyKey} já processado`)
      return result
    }
  } catch {
    // Se a coluna referenceId não existe no schema, continua sem idempotência
  }

  // 2. Obter percentuais por nível
  let levels: number[]
  if (matrixType === 'entrada') {
    levels = await getEntradaLevels()
  } else if (matrixType === 'residual') {
    levels = await getResidualLevels()
  } else {
    // Vendas: se houver categoria, tentar ler percentuais específicos
    levels = await getVendasLevelsForCategory(category)
  }

  // 3. Gateio por plano (apenas entrada)
  if (matrixType === 'entrada') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })
    if (!user) {
      result.skipped.push('Usuário não encontrado')
      return result
    }
    // Tarefa (22/09): ler quantos níveis de entrada o plano do usuário libera
    // do SystemConfig (admin-editável). Antes era hardcoded.
    if (user.plan === 'free') {
      result.skipped.push('Plano gratuito: 0 níveis de Entrada liberados')
      return result
    }
    let maxEntradaLevels = 5
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: `plan.${user.plan}.cashback_levels_entrada` },
      })
      if (config) maxEntradaLevels = parseInt(config.value, 10) || 5
    } catch { /* fallback */ }
    levels = levels.slice(0, maxEntradaLevels)
  }

  // 4. Percorrer a árvore de upline via MatrixPosition
  // Encontrar a posição do usuário na matriz
  const userPosition = await prisma.matrixPosition.findFirst({
    where: { userId, matrixType },
    select: { id: true, level: true, position: true },
  })

  if (!userPosition) {
    result.skipped.push(`Sem posição na matriz ${matrixType}`)
    return result
  }

  // Percorrer upline nível por nível
  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    const pct = levels[levelIdx]
    const targetLevel = userPosition.level - (levelIdx + 1)

    if (targetLevel < 0) break // sem upline neste nível

    // Encontrar o upline neste nível — procurar por posição na mesma matriz
    // cujo nível seja o targetLevel e que tenha o usuário atual como
    // descendente (indiretamente via estrutura BFS)
    //
    // Abordagem: buscar o referredById do usuário e subir nível por nível
    const uplineUser = await findUplineAtLevel(userId, matrixType, levelIdx + 1)

    if (!uplineUser) {
      result.skipped.push(`Sem upline no nível ${levelIdx + 1}`)
      continue
    }

    // Verificar KYC do upline
    const kycOk = await isKycApproved(uplineUser.id)
    if (!kycOk) {
      result.skipped.push(`Upline ${uplineUser.id} sem KYC aprovado (nível ${levelIdx + 1})`)
      continue
    }

    // Verificar se o upline tem plano ativo
    const uplineUserFull = await prisma.user.findUnique({
      where: { id: uplineUser.id },
      select: { plan: true, isActive: true },
    })
    if (!uplineUserFull?.isActive || uplineUserFull.plan === 'free') {
      result.skipped.push(`Upline ${uplineUser.id} inativo ou plano gratuito (nível ${levelIdx + 1})`)
      continue
    }

    // Calcular valor do cashback
    const cashbackAmount = Math.round((baseAmountCents * pct) / 100)

    if (cashbackAmount <= 0) continue

    // 5. Criar entrada na tabela de cashback correspondente
    try {
      if (matrixType === 'entrada') {
        await prisma.cashbackEntry.create({
          data: {
            userId: uplineUser.id,
            fromUserId: userId,
            amount: cashbackAmount,
            level: levelIdx + 1,
            percentage: pct,
            referenceId: idempotencyKey,
          },
        })
      } else if (matrixType === 'residual') {
        await prisma.cashbackResidual.create({
          data: {
            userId: uplineUser.id,
            fromUserId: userId,
            amount: cashbackAmount,
            level: levelIdx + 1,
            percentage: pct,
            referenceId: idempotencyKey,
          },
        })
      } else if (matrixType === 'vendas') {
        await prisma.cashbackSales.create({
          data: {
            userId: uplineUser.id,
            fromUserId: userId,
            amount: cashbackAmount,
            level: levelIdx + 1,
            percentage: pct,
            category: category || 'general',
            referenceId: idempotencyKey,
          },
        })
      }
      result.entriesCreated++
      result.totalDistributed += cashbackAmount
    } catch (createErr) {
      console.error(`[Cashback Motor] Failed to create entry:`, createErr)
      result.skipped.push(`Erro ao criar entrada nível ${levelIdx + 1}`)
    }
  }

  return result
}

// ============================================================================
// findUplineAtLevel — encontra o upline de um usuário em um nível específico
// ----------------------------------------------------------------------------
// Subindo pela cadeia de referredById (patrocinador direto → indireto).
// ============================================================================

async function findUplineAtLevel(
  userId: string,
  matrixType: string,
  levelsUp: number,
): Promise<{ id: string } | null> {
  let currentUser: { id: string; referredById: string | null } | null = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referredById: true },
  })

  for (let i = 0; i < levelsUp; i++) {
    if (!currentUser?.referredById) return null
    currentUser = await prisma.user.findUnique({
      where: { id: currentUser.referredById },
      select: { id: true, referredById: true },
    })
    if (!currentUser) return null
  }

  return currentUser ? { id: currentUser.id } : null
}

// ============================================================================
// getVendasLevelsForCategory — percentuais por categoria de venda
// ----------------------------------------------------------------------------
// Tenta ler do SystemConfig chaves como:
//   cashback_vendas_comida_level_1 ... cashback_vendas_comida_level_9
//   cashback_vendas_entrega_level_1 ... cashback_vendas_entrega_level_9
//   cashback_vendas_mobilidade_level_1 ... cashback_vendas_mobilidade_level_9
//
// Se não existirem, cai no padrão genérico (cashback_vendas_level_N).
// ============================================================================

export async function getVendasLevelsForCategory(category?: string): Promise<number[]> {
  const defaults = await getVendasLevels() // já lê do SystemConfig genérico

  if (!category) return defaults

  try {
    const prefix = `cashback_vendas_${category}_level_`
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: prefix } },
    })

    if (configs.length === 0) return defaults

    const levels = [...defaults]
    let hasAny = false
    for (const c of configs) {
      const idx = parseInt(c.key.replace(prefix, '')) - 1
      if (idx >= 0 && idx < 9) {
        const v = parseFloat(c.value)
        if (!isNaN(v)) {
          levels[idx] = v
          hasAny = true
        }
      }
    }
    return hasAny ? levels : defaults
  } catch {
    return defaults
  }
}

// ============================================================================
// GATILHOS — funções para serem chamadas nos endpoints de eventos
// ============================================================================

// GATILHO 1: Compra no app (marketplace, serviços) → MATRIZ ENTRADA
export async function triggerEntradaCashback(params: {
  buyerId: string
  orderAmountCents: number
  orderReferenceId: string
}): Promise<DistributionResult> {
  return processCashbackDistribution({
    userId: params.buyerId,
    matrixType: 'entrada',
    baseAmountCents: params.orderAmountCents,
    eventReferenceId: params.orderReferenceId,
  })
}

// GATILHO 2: Pagamento de fatura do plano → MATRIZ RESIDUAL
export async function triggerResidualCashback(params: {
  payerId: string
  invoiceAmountCents: number
  invoiceId: string
}): Promise<DistributionResult> {
  return processCashbackDistribution({
    userId: params.payerId,
    matrixType: 'residual',
    baseAmountCents: params.invoiceAmountCents,
    eventReferenceId: params.invoiceId,
  })
}

// GATILHO 3: Venda de comida/entrega/mobilidade → MATRIZ VENDAS
export async function triggerVendasCashback(params: {
  sellerId: string
  saleAmountCents: number
  saleReferenceId: string
  category: 'comida' | 'entrega' | 'mobilidade'
}): Promise<DistributionResult> {
  return processCashbackDistribution({
    userId: params.sellerId,
    matrixType: 'vendas',
    baseAmountCents: params.saleAmountCents,
    eventReferenceId: params.saleReferenceId,
    category: params.category,
  })
}
