import { db, prisma } from '@/lib/db'
import { success, error, getResidualLevels } from '@/lib/api-utils'
import { countMatrixDescendants } from '@/lib/matrix-placement'

// Count all descendants in the referral tree (recursive, up to 9 levels deep).
// Returns the total number of descendants, a per-level breakdown, and the
// count of descendants that are currently active. Mirrors the helper in
// /api/dashboard/route.ts so the cashback matrix counts reflect the REAL
// referral network (not the CashbackResidual transaction table, which stays
// empty until cashback is actually distributed).
// Build a parent->children map ONCE from a single DB query, then traverse
// in-memory. This avoids N+1 DB round-trips (up to 9 queries per request)
// which is critical for remote PostgreSQL (Neon) performance.
async function buildChildrenMap(): Promise<Record<string, { id: string; isActive: boolean }[]>> {
  const allUsers = await prisma.user.findMany({
    select: { id: true, referredById: true, isActive: true },
  })
  const map: Record<string, { id: string; isActive: boolean }[]> = {}
  for (const u of allUsers) {
    if (u.referredById) {
      if (!map[u.referredById]) map[u.referredById] = []
      map[u.referredById].push({ id: u.id, isActive: u.isActive })
    }
  }
  return map
}

async function countNetworkDescendants(
  userId: string,
  childrenMap?: Record<string, { id: string; isActive: boolean }[]>
): Promise<{
  total: number
  byLevel: Record<number, number>
  activeTotal: number
}> {
  const map = childrenMap || await buildChildrenMap()
  const byLevel: Record<number, number> = {}
  let total = 0
  let activeTotal = 0
  let currentLevel: string[] = [userId]

  for (let level = 1; level <= 9; level++) {
    if (currentLevel.length === 0) break
    const nextLevel: string[] = []
    let levelActive = 0
    for (const parentId of currentLevel) {
      const kids = map[parentId]
      if (kids) {
        for (const k of kids) {
          nextLevel.push(k.id)
          if (k.isActive) levelActive++
        }
      }
    }
    if (nextLevel.length === 0) break
    byLevel[level] = nextLevel.length
    total += nextLevel.length
    activeTotal += levelActive
    currentLevel = nextLevel
  }

  return { total, byLevel, activeTotal }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    // Get user's residual matrix position
    const matrixPosition = await db.findOne(
      'MatrixPosition',
      '"userId" = $1 AND "matrixType" = $2',
      [userId, 'residual']
    )

    // Walk the entire referral network (up to 9 levels deep) and count
    // descendants by level. This drives the per-level `currentUsers` and the
    // matrix `totalUsers` so the UI shows the REAL network size, not the
    // CashbackResidual transaction count (which is 0 until cashback is paid).
    // Tarefa (19/09): contar pela árvore da MATRIZ (respeita spillover cap 4).
    const network = await countMatrixDescendants(userId, 'residual', 7)

    // Get all residual entries (used ONLY for `earned` / `earnedPerLevel` —
    // i.e. actual cashback PAID to the user, which is correctly 0 when no
    // cashback has been distributed yet).
    const entries = await db.find('CashbackResidual', '"userId" = $1', [userId]) as any[]

    const earnedPerLevel: Record<number, number> = {}
    for (const e of entries) {
      earnedPerLevel[e.level] = (earnedPerLevel[e.level] || 0) + e.amount
    }

    const totalEarned = entries.reduce((sum, e) => sum + e.amount, 0)

    // Read live cashback percentages from SystemConfig (admin-configurable)
    const percentages = await getResidualLevels()

    // Read matrix structural width from the MatrixType table (admin-configurable).
    // Falls back to 4 (the client-specified 4-wide matrix) if the row is missing or the lookup fails.
    let matrixWidth = 4
    let matrixDepth = 7
    try {
      const mt = await prisma.matrixType.findFirst({
        where: { matrixKind: 'residual', isActive: true },
        orderBy: { createdAt: 'asc' },
      })
      if (mt) {
        matrixWidth = mt.width || 4
        matrixDepth = mt.depth || 7
      }
    } catch (mtErr) {
      console.warn('[Cashback residual] Could not load MatrixType, using defaults:', mtErr)
    }

    // Tarefa (22/09): ler quantos níveis de residual o plano do usuário libera
    const userPlan = user.plan || 'free'
    let maxUnlockedLevelResidual = 0
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: `plan.${userPlan}.cashback_levels_residual` },
      })
      maxUnlockedLevelResidual = config ? parseInt(config.value, 10) || 0 : (userPlan === 'blue5' ? 7 : 0)
    } catch {
      maxUnlockedLevelResidual = userPlan === 'blue5' ? 7 : 0
    }

    const levels = percentages.map((percentage, i) => {
      const level = i + 1
      const maxUsers = Math.pow(matrixWidth, level)
      const locked = level > maxUnlockedLevelResidual
      return {
        level,
        percentage,
        maxUsers,
        currentUsers: network.byLevel[level] || 0,
        earned: locked ? 0 : (earnedPerLevel[level] || 0),
        locked,
        unlocked: !locked,
      }
    })

    // Count the user's direct children inside the residual matrix tree.
    // Mirrors the entrada route's pattern: look up the user's residual
    // MatrixPosition, then count child positions under it.
    let directChildren = 0
    if (matrixPosition) {
      directChildren = await db.count(
        'MatrixPosition',
        '"parentId" = $1 AND "matrixType" = $2',
        [(matrixPosition as any).id, 'residual']
      )
    }

    // Max matrix size for an N-wide, D-deep matrix: (width^(D+1) - 1) / (width - 1)
    // For 4-wide, 7-deep: (4^8 - 1) / 3 = 21845
    const maxMatrixSize = matrixWidth > 1
      ? Math.floor((Math.pow(matrixWidth, matrixDepth + 1) - 1) / (matrixWidth - 1))
      : matrixDepth + 1

    // totalUsers = sum of network descendants across the residual-relevant
    // levels (1-7), matching the dashboard's `cashbackResidual.totalUsers`.
    const residualRelevantLevels = [1, 2, 3, 4, 5, 6, 7]
    const totalUsers = residualRelevantLevels.reduce(
      (sum, lvl) => sum + (network.byLevel[lvl] || 0),
      0
    )

    return success({
      matrixPosition: matrixPosition
        ? {
            id: (matrixPosition as any).id,
            level: (matrixPosition as any).level,
            position: (matrixPosition as any).position,
          }
        : null,
      userLevel: user.residualLevel,
      levels,
      totalEarned,
      totalUsers,
      directChildren,
      maxMatrixSize,
      matrixWidth,
      matrixDepth,
    })
  } catch (err) {
    console.error('Cashback residual error:', err)
    return error('Internal server error', 500)
  }
}
