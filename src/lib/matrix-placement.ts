// ============================================================================
// src/lib/matrix-placement.ts — Lógica centralizada de spillover das matrizes
// ----------------------------------------------------------------------------
// Tarefa 1 (19/09): Cada posição na matriz trava em NO MÁXIMO 4 indicados
// diretos. Excedentes fazem spillover BFS FIFO (ordem de entrada).
//
// "Indicação direta" (User.referredById) é diferente de "posição na matriz"
// (MatrixPosition.parentId). Uma pessoa pode ter 10 indicados diretos mas
// só 4 ficam no nível 1 dela na matriz; os outros 6 caem em spillover.
//
// Usado por:
//   - /api/auth/register (registro público)
//   - /api/admin/users/create (admin cria usuário)
// ============================================================================

import { prisma } from '@/lib/db'

export const MATRIX_WIDTH = 4
export const MATRIX_DEPTH: Record<string, number> = {
  entrada: 5,
  residual: 7,
  vendas: 9,
}

export type MatrixType = 'entrada' | 'residual' | 'vendas'

export interface PlacementResult {
  parentId: string
  level: number
  position: number
  spillover: boolean // true se foi colocado via spillover (não direto)
}

/**
 * Encontra a próxima posição disponível na sub-árvore da matriz usando BFS FIFO.
 *
 * Algoritmo:
 * 1. Inicia BFS pela posição raiz (referrer).
 * 2. Para cada posição visitada, conta os filhos diretos.
 * 3. Se childCount < MATRIX_WIDTH (4): há espaço — coloca aqui.
 * 4. Se childCount >= 4: posição cheia — enfileira filhos (createdAt ASC).
 * 5. Filhos ordenados por createdAt ASC (FIFO — primeiro registrado é visitado primeiro).
 * 6. Retorna null se a sub-árvore inteira (até maxDepth) estiver cheia.
 */
export async function findSpilloverPosition(
  rootPositionId: string,
  matrixType: string,
  width: number = MATRIX_WIDTH
): Promise<{ parentId: string; level: number; position: number } | null> {
  const maxDepth = MATRIX_DEPTH[matrixType] ?? 5
  const queue: Array<{ id: string; level: number }> = [{ id: rootPositionId, level: 0 }]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current.id)) continue
    visited.add(current.id)

    if (current.level >= maxDepth) continue

    const childCount = await prisma.matrixPosition.count({
      where: { parentId: current.id, matrixType },
    })

    if (childCount < width) {
      // Há espaço — posição = childCount (slot 0, 1, 2, 3 em ordem FIFO)
      return {
        parentId: current.id,
        level: current.level + 1,
        position: childCount,
      }
    }

    // Posição cheia — enfileira filhos para continuar BFS
    const children = await prisma.matrixPosition.findMany({
      where: { parentId: current.id, matrixType },
      orderBy: { createdAt: 'asc' }, // FIFO — primeiro registrado primeiro
      select: { id: true, level: true, createdAt: true },
    })

    for (const child of children) {
      queue.push({ id: child.id, level: current.level + 1 })
    }
  }

  return null
}

/**
 * Posiciona um usuário em uma matriz (entrada, residual ou vendas).
 * Se o referrer tiver < 4 filhos diretos, coloca como filho direto (nível 1).
 * Caso contrário, faz spillover BFS FIFO.
 *
 * @param userId - ID do usuário sendo posicionado
 * @param referrerId - ID do usuário que indicou (patrocinador)
 * @param matrixType - 'entrada' | 'residual' | 'vendas'
 * @returns PlacementResult ou null se não conseguiu posicionar
 */
export async function placeUserInMatrix(
  userId: string,
  referrerId: string,
  matrixType: MatrixType
): Promise<PlacementResult | null> {
  // Busca a posição do referrer nesta matriz
  const referrerPosition = await prisma.matrixPosition.findFirst({
    where: { userId: referrerId, matrixType },
  })

  if (!referrerPosition) {
    // Referrer não tem posição nesta matriz — cria posição raiz para o novo usuário
    await prisma.matrixPosition.create({
      data: {
        userId,
        matrixType,
        parentId: null,
        level: 0,
        position: 0,
        isFilled: true,
      },
    })
    return { parentId: '', level: 0, position: 0, spillover: false }
  }

  // Conta filhos diretos do referrer
  const existingPositions = await prisma.matrixPosition.count({
    where: { parentId: referrerPosition.id, matrixType },
  })

  let placement: PlacementResult
  if (existingPositions < MATRIX_WIDTH) {
    // Há espaço no nível 1 do referrer — coloca como filho direto
    placement = {
      parentId: referrerPosition.id,
      level: referrerPosition.level + 1,
      position: existingPositions,
      spillover: false,
    }
  } else {
    // Nível 1 cheio (4/4) — faz spillover BFS FIFO
    const spillover = await findSpilloverPosition(referrerPosition.id, matrixType, MATRIX_WIDTH)
    if (spillover) {
      placement = { ...spillover, spillover: true }
    } else {
      // Sub-árvore inteira cheia — fallback: coloca sob o referrer mesmo assim
      // (posição inválida mas não falha o registro)
      placement = {
        parentId: referrerPosition.id,
        level: referrerPosition.level + 1,
        position: existingPositions,
        spillover: false,
      }
    }
  }

  await prisma.matrixPosition.create({
    data: {
      userId,
      matrixType,
      parentId: placement.parentId,
      level: placement.level,
      position: placement.position,
      isFilled: true,
    },
  })

  // Atualiza o nível da matriz no User (para cashback engine saber quantos níveis desbloquear)
  const levelField = `${matrixType}Level` as 'entradaLevel' | 'residualLevel' | 'vendasLevel'
  await prisma.user.update({
    where: { id: userId },
    data: { [levelField]: placement.level },
  }).catch(() => { /* silent — não é crítico */ })

  return placement
}

/**
 * Posiciona o usuário nas 3 matrizes (residual + vendas sempre; entrada só se for pago).
 * Idempotente — se o usuário já tem posição, não duplica.
 *
 * @param userId - ID do usuário
 * @param referrerId - ID do patrocinador
 * @param isPayingMember - true se o plano for pago (blue3/blue5) — habilita matriz entrada
 */
export async function placeUserInAllMatrices(
  userId: string,
  referrerId: string | null | undefined,
  isPayingMember: boolean = false
): Promise<void> {
  if (!referrerId) return

  // Verifica se já tem posição em cada matriz (idempotente)
  const existingResidual = await prisma.matrixPosition.findFirst({
    where: { userId, matrixType: 'residual' },
  })
  if (!existingResidual) {
    await placeUserInMatrix(userId, referrerId, 'residual').catch((e) => {
      console.warn(`[matrix-placement] Failed to place user ${userId} in residual:`, e)
    })
  }

  const existingVendas = await prisma.matrixPosition.findFirst({
    where: { userId, matrixType: 'vendas' },
  })
  if (!existingVendas) {
    await placeUserInMatrix(userId, referrerId, 'vendas').catch((e) => {
      console.warn(`[matrix-placement] Failed to place user ${userId} in vendas:`, e)
    })
  }

  // Matriz entrada só para membros pagantes
  if (isPayingMember) {
    const existingEntrada = await prisma.matrixPosition.findFirst({
      where: { userId, matrixType: 'entrada' },
    })
    if (!existingEntrada) {
      await placeUserInMatrix(userId, referrerId, 'entrada').catch((e) => {
        console.warn(`[matrix-placement] Failed to place user ${userId} in entrada:`, e)
      })
    }
  }
}

// ============================================================================
// countMatrixDescendants — Conta descendentes pela árvore da MATRIZ
// (MatrixPosition.parentId), respeitando o cap de 4 por posição + spillover.
// ----------------------------------------------------------------------------
// Diferente de contar pela árvore de patrocínio (User.referredById), esta
// função respeita a estrutura real da matriz: se o admin indicou 10 pessoas,
// só 4 ficam no nível 1 (cap 4-wide), as outras 6 caem em spillover (níveis 2+).
//
// Retorna: { total, byLevel, activeTotal }
// ============================================================================

export async function countMatrixDescendants(
  userId: string,
  matrixType: string,
  maxDepth: number = 9
): Promise<{
  total: number
  byLevel: Record<number, number>
  activeTotal: number
}> {
  // Busca a posição raiz do usuário nesta matriz
  const rootPosition = await prisma.matrixPosition.findFirst({
    where: { userId, matrixType },
  }).catch(() => null)

  if (!rootPosition) {
    return { total: 0, byLevel: {}, activeTotal: 0 }
  }

  // Busca TODAS as MatrixPosition desta matriz de uma vez (evita N+1 queries)
  const allPositions = await prisma.matrixPosition.findMany({
    where: { matrixType },
    select: {
      id: true,
      parentId: true,
      userId: true,
      level: true,
      position: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  }).catch(() => [])

  // Busca os status de ativo de todos os usuários em uma query só
  const userIds = allPositions.map(p => p.userId)
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, isActive: true } }).catch(() => [])
    : []
  const userActiveMap = new Map(users.map(u => [u.id, u.isActive]))

  // Constrói mapa parent→children a partir de MatrixPosition (respeita spillover)
  const childrenMap: Record<string, typeof allPositions> = {}
  for (const pos of allPositions) {
    if (pos.parentId) {
      if (!childrenMap[pos.parentId]) childrenMap[pos.parentId] = []
      childrenMap[pos.parentId].push(pos)
    }
  }

  // BFS pela árvore de MatrixPosition
  const byLevel: Record<number, number> = {}
  let total = 0
  let activeTotal = 0
  let currentLevel: string[] = [rootPosition.id]

  for (let level = 1; level <= maxDepth; level++) {
    if (currentLevel.length === 0) break
    const nextLevel: string[] = []
    let levelActive = 0

    for (const parentId of currentLevel) {
      const kids = childrenMap[parentId]
      if (kids) {
        for (const k of kids) {
          nextLevel.push(k.id)
          total++
          const isActive = userActiveMap.get(k.userId) ?? false
          if (isActive) levelActive++
        }
      }
    }

    if (nextLevel.length === 0) break
    byLevel[level] = nextLevel.length
    activeTotal += levelActive
    currentLevel = nextLevel
  }

  return { total, byLevel, activeTotal }
}
