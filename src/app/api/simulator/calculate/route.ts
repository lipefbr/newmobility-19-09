import { success, error } from '@/lib/api-utils'
import { getEntradaLevels, getResidualLevels, getVendasLevels } from '@/lib/api-utils'
import { prisma } from '@/lib/db'

// ============================================================================
// /api/simulator/calculate — PRIORIDADE 3: agora lê configs do admin
// ----------------------------------------------------------------------------
// ANTES: todos os valores (plan prices, percentages, bases) eram hardcoded.
// DEPOIS: lê de SystemConfig (admin-editável). Fallback para defaults.
// ============================================================================

const DEFAULT_PLAN_PRICES: Record<string, number> = {
  free: 0, blue3: 99990, blue5: 99990,
}
const DEFAULT_PLAN_NAMES: Record<string, string> = {
  free: 'Gratuito', blue3: 'Blue 3', blue5: 'Blue 5 Premium',
}
const DEFAULT_PLAN_UNLOCKS: Record<string, { entrada: number; residual: number; vendas: number }> = {
  free: { entrada: 0, residual: 0, vendas: 0 },
  blue3: { entrada: 3, residual: 0, vendas: 0 },
  blue5: { entrada: 5, residual: 7, vendas: 9 },
}
const DEFAULT_CB_ENTRADA_BASE = 99900
const DEFAULT_CB_RESIDUAL_BASE = 139900
const DEFAULT_CB_VENDAS_BASE = 19990
const DEFAULT_DIRECT_REFERRAL_PCT = 10
const MATRIX_WIDTH = 4

async function getConfig(key: string, fallback: string): Promise<string> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } })
    return row?.value || fallback
  } catch { return fallback }
}

interface MatrixLevelProjection {
  level: number; percentage: number; maxUsers: number; projectedUsers: number; earningPerUser: number; totalEarning: number
}

function projectMatrix(levelPcts: number[], unlockedLevels: number, baseCents: number, fillPercent: number) {
  const safeFill = Math.max(0, Math.min(100, fillPercent))
  const fillRatio = safeFill / 100
  const levelsToCompute = Math.max(0, Math.min(levelPcts.length, unlockedLevels))
  const levels: MatrixLevelProjection[] = []
  for (let i = 0; i < levelsToCompute; i++) {
    const level = i + 1
    const pct = levelPcts[i]
    const maxPositions = Math.pow(MATRIX_WIDTH, level)
    const filledPositions = Math.floor(maxPositions * fillRatio)
    const earningPerPosition = Math.round((baseCents * pct) / 100)
    const totalEarning = earningPerPosition * filledPositions
    levels.push({ level, percentage: pct, maxUsers: maxPositions, projectedUsers: filledPositions, earningPerUser: earningPerPosition, totalEarning })
  }
  return { levels, total: levels.reduce((s, l) => s + l.totalEarning, 0) }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { plan, directReferrals, matrixFillPercent = 50 } = body

    if (!plan || !(plan in DEFAULT_PLAN_PRICES)) return error('Invalid plan. Use: free, blue3, or blue5', 400)
    if (directReferrals === undefined || directReferrals < 0) return error('directReferrals must be non-negative', 400)

    // Ler configs do admin (com fallback para defaults)
    const planPriceStr = await getConfig(`plan.${plan}.price_cents`, String(DEFAULT_PLAN_PRICES[plan]))
    const planPrice = parseInt(planPriceStr) || DEFAULT_PLAN_PRICES[plan]

    const planNameStr = await getConfig(`plan.${plan}.name`, DEFAULT_PLAN_NAMES[plan])

    const entradaBaseStr = await getConfig('matrix.entrada.base_cents', String(DEFAULT_CB_ENTRADA_BASE))
    const residualBaseStr = await getConfig('matrix.residual.base_cents', String(DEFAULT_CB_RESIDUAL_BASE))
    const vendasBaseStr = await getConfig('matrix.vendas.base_cents', String(DEFAULT_CB_VENDAS_BASE))
    const cbEntradaBase = parseInt(entradaBaseStr) || DEFAULT_CB_ENTRADA_BASE
    const cbResidualBase = parseInt(residualBaseStr) || DEFAULT_CB_RESIDUAL_BASE
    const cbVendasBase = parseInt(vendasBaseStr) || DEFAULT_CB_VENDAS_BASE

    const directPctStr = await getConfig('cashback.direct_referral_pct', String(DEFAULT_DIRECT_REFERRAL_PCT))
    const directReferralPct = parseFloat(directPctStr) || DEFAULT_DIRECT_REFERRAL_PCT

    // Ler percentuais por nível do admin (via getEntradaLevels etc.)
    const entradaPcts = await getEntradaLevels()
    const residualPcts = await getResidualLevels()
    const vendasPcts = await getVendasLevels()

    // Ler unlocks por plano do admin
    const entradaUnlockStr = await getConfig(`plan.${plan}.cashback_levels_entrada`, String(DEFAULT_PLAN_UNLOCKS[plan].entrada))
    const residualUnlockStr = await getConfig(`plan.${plan}.cashback_levels_residual`, String(DEFAULT_PLAN_UNLOCKS[plan].residual))
    const vendasUnlockStr = await getConfig(`plan.${plan}.cashback_levels_vendas`, String(DEFAULT_PLAN_UNLOCKS[plan].vendas))
    const unlocks = {
      entrada: parseInt(entradaUnlockStr) || DEFAULT_PLAN_UNLOCKS[plan].entrada,
      residual: parseInt(residualUnlockStr) || DEFAULT_PLAN_UNLOCKS[plan].residual,
      vendas: parseInt(vendasUnlockStr) || DEFAULT_PLAN_UNLOCKS[plan].vendas,
    }

    const safeDirectReferrals = Math.max(0, Math.floor(Number(directReferrals)))
    const safeFill = Math.max(0, Math.min(100, Number(matrixFillPercent)))

    const perReferralCashback = Math.round((planPrice * directReferralPct) / 100)
    const directReferralCashback = safeDirectReferrals * perReferralCashback

    const entrada = projectMatrix(entradaPcts, unlocks.entrada, cbEntradaBase, safeFill)
    const residual = projectMatrix(residualPcts, unlocks.residual, cbResidualBase, safeFill)
    const vendas = projectMatrix(vendasPcts, unlocks.vendas, cbVendasBase, safeFill)

    const totalMonthly = entrada.total + residual.total + vendas.total
    const totalAnnual = totalMonthly * 12
    const roi = planPrice > 0 ? (totalMonthly * 100) / planPrice : 0

    // Refatorado: usar for...of em vez de .map() para permitir await
    // (anteriormente usava await dentro de .map sem callback async — quebrava build Turbopack)
    const comparisons: Array<{ plan: string; planName: string; monthlyTotal: number; annualTotal: number; roi: number }> = []
    for (const p of ['blue3', 'blue5'] as const) {
      const pPriceStr = await getConfig(`plan.${p}.price_cents`, '99990')
      const pPrice = parseInt(pPriceStr) || 99990
      const pName = await getConfig(`plan.${p}.name`, DEFAULT_PLAN_NAMES[p])
      const eUnlock = parseInt(await getConfig(`plan.${p}.cashback_levels_entrada`, String(DEFAULT_PLAN_UNLOCKS[p].entrada))) || DEFAULT_PLAN_UNLOCKS[p].entrada
      const rUnlock = parseInt(await getConfig(`plan.${p}.cashback_levels_residual`, String(DEFAULT_PLAN_UNLOCKS[p].residual))) || DEFAULT_PLAN_UNLOCKS[p].residual
      const vUnlock = parseInt(await getConfig(`plan.${p}.cashback_levels_vendas`, String(DEFAULT_PLAN_UNLOCKS[p].vendas))) || DEFAULT_PLAN_UNLOCKS[p].vendas
      const e = projectMatrix(entradaPcts, eUnlock, cbEntradaBase, safeFill)
      const r = projectMatrix(residualPcts, rUnlock, cbResidualBase, safeFill)
      const v = projectMatrix(vendasPcts, vUnlock, cbVendasBase, safeFill)
      const monthly = e.total + r.total + v.total
      comparisons.push({
        plan: p, planName: pName, monthlyTotal: monthly, annualTotal: monthly * 12,
        roi: pPrice > 0 ? (monthly * 100) / pPrice : 0,
      })
    }

    return success({
      plan, planName: planNameStr, directReferrals: safeDirectReferrals, matrixFillPercent: safeFill,
      planPrice, perReferralCashback, directReferralCashback,
      entrada: { levels: entrada.levels, total: entrada.total },
      residual: { levels: residual.levels, total: residual.total },
      vendas: { levels: vendas.levels, total: vendas.total },
      totalMonthly, totalAnnual, roi,
      cashbackBases: { entrada: cbEntradaBase, residual: cbResidualBase, vendas: cbVendasBase },
      comparisons,
    })
  } catch (err) {
    console.error('Simulator calculate error:', err)
    return error('Internal server error', 500)
  }
}
