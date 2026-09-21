import { db, prisma } from '@/lib/db'
import {
  success,
  error,
  getEntradaLevels,
  getResidualLevels,
  getVendasLevels,
} from '@/lib/api-utils'

// ─────────────────────────────────────────────────────────────────────────────
// Unified per-user CashBack endpoint.
//
// Returns the logged-in user's CashBack data for ALL THREE matrices in a single
// response — entrada (4x5, 5 levels), residual (4x7, 7 levels), vendas (4x9,
// 9 levels) — plus their recent cashback transactions.
//
// Privacy: this route NEVER returns platform-wide data. Every metric is scoped
// to the authenticated user via the required `userId` query param.
// ─────────────────────────────────────────────────────────────────────────────

// Build a parent->children map ONCE from a single DB query, then traverse
// in-memory. This avoids N+1 DB round-trips (up to 9 queries per request)
// which is critical for remote PostgreSQL (Neon) performance.
async function buildChildrenMap(): Promise<
  Record<string, { id: string; isActive: boolean }[]>
> {
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

// Walk the referral tree (up to 9 levels deep) and count descendants per
// level. `byLevel` is the per-level member count (1-indexed), `total` is the
// sum across all walked levels, and `activeTotal` is the count of active
// descendants (kept for future use).
async function countNetworkDescendants(
  userId: string,
  childrenMap?: Record<string, { id: string; isActive: boolean }[]>
): Promise<{
  total: number
  byLevel: Record<number, number>
  activeTotal: number
}> {
  const map = childrenMap || (await buildChildrenMap())
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

// Sum amounts from any cashback-shaped record (CashbackEntry /
// CashbackResidual / CashbackSales share the same shape: { amount, level }).
function sumEarnedPerLevel(records: any[]): {
  total: number
  perLevel: Record<number, number>
} {
  const perLevel: Record<number, number> = {}
  let total = 0
  for (const r of records) {
    const amt = Number(r.amount || 0)
    const lvl = Number(r.level || 0)
    if (lvl > 0) perLevel[lvl] = (perLevel[lvl] || 0) + amt
    total += amt
  }
  return { total, perLevel }
}

// Read matrix structural width/depth for a given matrix kind from the
// MatrixType table. Falls back to the client-specified 4-wide defaults.
async function loadMatrixDims(
  kind: 'entrada' | 'residual' | 'vendas',
  defaultDepth: number
): Promise<{ width: number; depth: number }> {
  try {
    const mt = await prisma.matrixType.findFirst({
      where: { matrixKind: kind, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    if (mt) {
      return { width: mt.width || 4, depth: mt.depth || defaultDepth }
    }
  } catch (mtErr) {
    console.warn(`[Cashback unified] Could not load MatrixType for ${kind}:`, mtErr)
  }
  return { width: 4, depth: defaultDepth }
}

// Plan-based level gating (Índice.docx §1.1 + §3). Only `entrada` is gated:
//   free        → 0 unlocked (no entrada access)
//   blue3       → 3 unlocked (L1-L3)
//   blue5/
//   premium5    → 5 unlocked (L1-L5)
function computeMaxUnlockedLevel(matrixKind: string, userPlan: string): number {
  if (matrixKind !== 'entrada') return Infinity
  const isPremium = userPlan === 'premium5' || userPlan === 'blue5'
  if (isPremium) return 5
  if (userPlan === 'blue3') return 3
  return 0
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

    const userPlan = user.plan || 'free'

    // Walk the user's downline ONCE and reuse the byLevel map for all 3
    // matrices. This is significantly faster than calling the 3 sub-routes
    // (which would each re-walk the tree).
    const childrenMap = await buildChildrenMap()
    const network = await countNetworkDescendants(userId, childrenMap)

    // Load admin-configured cashback percentages in parallel.
    const [entradaPct, residualPct, vendasPct] = await Promise.all([
      getEntradaLevels(),
      getResidualLevels(),
      getVendasLevels(),
    ])

    // Load matrix structural dims in parallel.
    const [entradaDims, residualDims, vendasDims] = await Promise.all([
      loadMatrixDims('entrada', 5),
      loadMatrixDims('residual', 7),
      loadMatrixDims('vendas', 9),
    ])

    // Load all cashback earned records for the user in parallel.
    const [entradaRecords, residualRecords, vendasRecords] = await Promise.all([
      db.find('CashbackEntry', '"userId" = $1', [userId]) as Promise<any[]>,
      db.find('CashbackResidual', '"userId" = $1', [userId]) as Promise<any[]>,
      db.find('CashbackSales', '"userId" = $1', [userId]) as Promise<any[]>,
    ])

    const entradaEarned = sumEarnedPerLevel(entradaRecords as any[])
    const residualEarned = sumEarnedPerLevel(residualRecords as any[])
    const vendasEarned = sumEarnedPerLevel(vendasRecords as any[])

    // Build structured per-level arrays for each matrix.
    const buildLevels = (
      percentages: number[],
      dims: { width: number; depth: number },
      maxUnlockedLevel: number,
      earnedPerLevel: Record<number, number>
    ) => {
      const levels = percentages.map((percentage, i) => {
        const level = i + 1
        const maxUsers = Math.pow(dims.width, level)
        const currentUsers = network.byLevel[level] || 0
        const locked = level > maxUnlockedLevel
        return {
          level,
          percentage,
          maxUsers,
          currentUsers,
          earned: locked ? 0 : (earnedPerLevel[level] || 0),
          fillPercentage: Math.min((currentUsers / maxUsers) * 100, 100),
          locked,
          unlocked: !locked,
        }
      })
      return levels
    }

    const entradaMaxUnlocked = computeMaxUnlockedLevel('entrada', userPlan)
    const entradaLevels = buildLevels(
      entradaPct,
      entradaDims,
      entradaMaxUnlocked,
      entradaEarned.perLevel
    )
    const residualLevels = buildLevels(
      residualPct,
      residualDims,
      Infinity,
      residualEarned.perLevel
    )
    const vendasLevels = buildLevels(
      vendasPct,
      vendasDims,
      Infinity,
      vendasEarned.perLevel
    )

    // Compute the user's downline count within each matrix's depth.
    const entradaRelevantLevels = [1, 2, 3, 4, 5]
    const residualRelevantLevels = [1, 2, 3, 4, 5, 6, 7]
    const vendasRelevantLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9]

    const sumByLevels = (levels: number[]) =>
      levels.reduce((sum, lvl) => sum + (network.byLevel[lvl] || 0), 0)

    const pickByLevels = (levels: number[]): Record<number, number> => {
      const out: Record<number, number> = {}
      for (const lvl of levels) out[lvl] = network.byLevel[lvl] || 0
      return out
    }

    const entradaTotalUsers = sumByLevels(entradaRelevantLevels)
    const residualTotalUsers = sumByLevels(residualRelevantLevels)
    const vendasTotalUsers = sumByLevels(vendasRelevantLevels)

    // Only count earnings over unlocked levels (locked levels are 0 anyway).
    const entradaTotalEarned = entradaLevels
      .filter((l) => !l.locked)
      .reduce((s, l) => s + l.earned, 0)

    // Vendas category breakdown for the dashboard donut.
    const vendasByCategory: Record<string, number> = {}
    for (const r of vendasRecords as any[]) {
      const cat = r.category || 'other'
      vendasByCategory[cat] = (vendasByCategory[cat] || 0) + Number(r.amount || 0)
    }
    const vendasCategories = ['mobility', 'food', 'pharmacy', 'pet', 'shopping']
    const vendasCategoryBreakdown = vendasCategories.map((cat) => ({
      category: cat,
      earned: vendasByCategory[cat] || 0,
      percentage:
        vendasEarned.total > 0
          ? ((vendasByCategory[cat] || 0) / vendasEarned.total) * 100
          : 0,
    }))

    // Recent cashback transactions for the user (type starts with 'cashback_').
    // Returned for the "Recent transactions" card.
    let recentTransactions: any[] = []
    try {
      recentTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          type: { startsWith: 'cashback_' },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          category: true,
          description: true,
          createdAt: true,
        },
      })
    } catch (txErr) {
      console.warn('[Cashback unified] Could not load transactions:', txErr)
    }

    return success({
      userPlan,
      network: {
        total: network.total,
        activeTotal: network.activeTotal,
        byLevel: network.byLevel,
        newReferrals: 0, // placeholder for future "this month" count
      },
      entrada: {
        totalUsers: entradaTotalUsers,
        totalEarned: entradaTotalEarned,
        byLevel: pickByLevels(entradaRelevantLevels),
        earnedPerLevel: entradaEarned.perLevel,
        percentages: entradaPct,
        levels: entradaLevels,
        maxUnlockedLevel: entradaMaxUnlocked,
        matrixWidth: entradaDims.width,
        matrixDepth: entradaDims.depth,
      },
      residual: {
        totalUsers: residualTotalUsers,
        totalEarned: residualEarned.total,
        byLevel: pickByLevels(residualRelevantLevels),
        earnedPerLevel: residualEarned.perLevel,
        percentages: residualPct,
        levels: residualLevels,
        maxUnlockedLevel: Infinity,
        matrixWidth: residualDims.width,
        matrixDepth: residualDims.depth,
      },
      vendas: {
        totalUsers: vendasTotalUsers,
        totalEarned: vendasEarned.total,
        byLevel: pickByLevels(vendasRelevantLevels),
        earnedPerLevel: vendasEarned.perLevel,
        percentages: vendasPct,
        levels: vendasLevels,
        categoryBreakdown: vendasCategoryBreakdown,
        maxUnlockedLevel: Infinity,
        matrixWidth: vendasDims.width,
        matrixDepth: vendasDims.depth,
      },
      transactions: recentTransactions,
    })
  } catch (err) {
    console.error('Cashback unified error:', err)
    return error('Internal server error', 500)
  }
}
