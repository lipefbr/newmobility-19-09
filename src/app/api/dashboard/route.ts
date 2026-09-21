import { db, prisma } from '@/lib/db'
import { success, error, formatTimeSince } from '@/lib/api-utils'
import { countMatrixDescendants } from '@/lib/matrix-placement'

// Build a parent->children map ONCE from a single DB query, then traverse
// in-memory. This avoids N+1 DB round-trips (up to 9 queries per request)
// which is critical for remote PostgreSQL (Neon) performance.
// Each child entry also carries its `plan` and `createdAt` so we can compute
// per-user downline distribution by plan + per-day weekly referrals without
// a second DB query.
async function buildChildrenMap(): Promise<Record<string, { id: string; isActive: boolean; plan: string; createdAt: Date }[]>> {
  const allUsers = await prisma.user.findMany({
    select: { id: true, referredById: true, isActive: true, plan: true, createdAt: true },
  })
  const map: Record<string, { id: string; isActive: boolean; plan: string; createdAt: Date }[]> = {}
  for (const u of allUsers) {
    if (u.referredById) {
      if (!map[u.referredById]) map[u.referredById] = []
      map[u.referredById].push({
        id: u.id,
        isActive: u.isActive,
        plan: u.plan || 'free',
        createdAt: u.createdAt,
      })
    }
  }
  return map
}

// Walk the referral tree (BFS, up to 9 levels) collecting every descendant
// user with their plan and createdAt. Used to compute:
//  - the per-user "Distribuição da Minha Rede" pie chart (descendants grouped by plan)
//  - the per-user "Indicações da Semana" / "Resumo Semanal" widgets (descendants
//    created in the last 7 days / this week)
async function collectDescendants(
  userId: string,
  childrenMap?: Record<string, { id: string; isActive: boolean; plan: string; createdAt: Date }[]>,
): Promise<{ id: string; plan: string; createdAt: Date }[]> {
  const map = childrenMap || await buildChildrenMap()
  const descendants: { id: string; plan: string; createdAt: Date }[] = []
  const seen = new Set<string>([userId])
  let currentLevel: string[] = [userId]
  for (let level = 1; level <= 9; level++) {
    if (currentLevel.length === 0) break
    const nextLevel: string[] = []
    for (const parentId of currentLevel) {
      const kids = map[parentId]
      if (!kids) continue
      for (const k of kids) {
        if (seen.has(k.id)) continue // guard against cycles
        seen.add(k.id)
        descendants.push({ id: k.id, plan: k.plan, createdAt: k.createdAt })
        nextLevel.push(k.id)
      }
    }
    currentLevel = nextLevel
  }
  return descendants
}

// Count all descendants in the referral tree (recursive, up to 9 levels deep).
// Returns the total number of descendants, a per-level breakdown, and the
// count of descendants that are currently active.
async function countNetworkDescendants(
  userId: string,
  childrenMap?: Record<string, { id: string; isActive: boolean; plan?: string; createdAt?: Date }[]>
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

    // Time since registration
    const timeSinceRegistration = formatTimeSince(new Date(user.createdAt))

    // Direct referral count
    const directReferralCount = await db.count('User', '"referredById" = $1', [userId])

    // Direct referrals (used for active-direct and new-this-month counts)
    const directReferrals = await db.find('User', '"referredById" = $1', [userId]) as any[]
    const activeDirect = directReferrals.filter((r) => r.isActive === true).length

    // New referrals created in the current calendar month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const newReferrals = directReferrals.filter(
      (r) => new Date(r.createdAt) >= startOfMonth
    ).length

    // Tarefa (19/09): contar descendentes pela árvore da MATRIZ (MatrixPosition),
    // NÃO pela árvore de patrocínio (User.referredById). Cada matriz tem sua
    // própria árvore com spillover (cap 4 por posição), então precisamos de 3
    // contagens separadas (entrada, residual, vendas).
    const entradaNetwork = await countMatrixDescendants(userId, 'entrada', 5)
    const residualNetwork = await countMatrixDescendants(userId, 'residual', 7)
    const vendasNetwork = await countMatrixDescendants(userId, 'vendas', 9)

    // Para distribuição por plano e activity, ainda usamos a árvore de patrocínio
    // (porque "quem eu trouxe" é diferente de "posição na matriz").
    const childrenMap = await buildChildrenMap()
    const descendants = await collectDescendants(userId, childrenMap)

    // Per-user "Distribuição da Minha Rede" — descendants grouped by plan.
    // Replaces the old platform-wide userDistribution (which leaked every
    // user on the platform into the chart).
    const usersByPlan: Record<string, number> = {}
    for (const d of descendants) {
      const plan = d.plan || 'free'
      usersByPlan[plan] = (usersByPlan[plan] || 0) + 1
    }

    // Per-user weekly referrals — count of descendants created this week
    // (week starts on Monday per pt-BR convention) and a per-day breakdown
    // for the "Indicações da Semana" / "Resumo Semanal" widgets.
    const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const startOfWeek = (() => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      const jsDay = d.getDay() // 0=Sun..6=Sat
      // Shift so Monday is the first day of the week
      const diff = (jsDay + 6) % 7
      d.setDate(d.getDate() - diff)
      return d
    })()

    const weeklyReferralCount = descendants.filter(
      (d) => new Date(d.createdAt) >= startOfWeek,
    ).length

    // Build per-day breakdown for the last 7 days, oldest first, labelled by
    // the Portuguese weekday abbreviation (Seg/Ter/Qua/Qui/Sex/Sáb/Dom).
    const weeklyReferralsByDay: { day: string; value: number; percentage: number }[] = []
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    let maxDayCount = 0
    const rawCounts: { day: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayMidnight)
      dayStart.setDate(dayStart.getDate() - i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const count = descendants.filter((d) => {
        const c = new Date(d.createdAt)
        return c >= dayStart && c < dayEnd
      }).length
      rawCounts.push({ day: weekDayLabels[dayStart.getDay()], value: count })
      if (count > maxDayCount) maxDayCount = count
    }
    for (const rc of rawCounts) {
      weeklyReferralsByDay.push({
        day: rc.day,
        value: rc.value,
        percentage: maxDayCount > 0 ? Math.round((rc.value / maxDayCount) * 100) : 0,
      })
    }

    const entradaLevels = [1, 2, 3, 4, 5]
    const residualLevels = [1, 2, 3, 4, 5, 6, 7]
    const vendasLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9]

    // Tarefa (19/09): cada matriz tem sua própria contagem (respeita spillover)
    const sumByLevels = (levels: number[], byLevel: Record<number, number>) =>
      levels.reduce((sum, lvl) => sum + (byLevel[lvl] || 0), 0)
    const pickByLevels = (levels: number[], byLevel: Record<number, number>): Record<number, number> => {
      const out: Record<number, number> = {}
      for (const lvl of levels) out[lvl] = byLevel[lvl] || 0
      return out
    }

    const totalEntradaUsers = sumByLevels(entradaLevels, entradaNetwork.byLevel)
    const totalResidualUsers = sumByLevels(residualLevels, residualNetwork.byLevel)
    const totalVendasUsers = sumByLevels(vendasLevels, vendasNetwork.byLevel)
    const entradaUsersByLevel = pickByLevels(entradaLevels, entradaNetwork.byLevel)
    const residualUsersByLevel = pickByLevels(residualLevels, residualNetwork.byLevel)
    const vendasUsersByLevel = pickByLevels(vendasLevels, vendasNetwork.byLevel)

    // Cashback earned (kept for internal use / backwards compatibility)
    const entradaRecords = await db.find('CashbackEntry', '"userId" = $1', [userId])
    const totalEntradaEarned = entradaRecords.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    const residualRecords = await db.find('CashbackResidual', '"userId" = $1', [userId])
    const totalResidualEarned = residualRecords.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    const vendasRecords = await db.find('CashbackSales', '"userId" = $1', [userId])
    const totalVendasEarned = vendasRecords.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    // Recent transactions — strictly per-user (filtered by userId).
    const recentTransactions = await db.find(
      'Transaction',
      '"userId" = $1',
      [userId],
      'ORDER BY "createdAt" DESC LIMIT 10'
    )

    // Career info — read from the admin-managed CareerPlan table so admin
    // edits propagate to the dashboard too. Mirrors the logic in
    // /api/career/route.ts.
    const careerPoints = Number(user.careerPoints || 0)
    const careerPlans = await prisma.careerPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    let currentCareerPlan: typeof careerPlans[number] | null = null
    for (const p of careerPlans) {
      if (careerPoints >= p.minPoints) currentCareerPlan = p
    }
    const hasAchievedAnyCareer = currentCareerPlan !== null
    const nextCareerPlan = hasAchievedAnyCareer
      ? (careerPlans.find((p) => careerPoints < p.minPoints) || null)
      : (careerPlans[0] || null)
    const careerProgress = nextCareerPlan
      ? Math.min(((careerPoints / nextCareerPlan.minPoints) * 100), 100)
      : 100

    // Revenue by category for chart — strictly per-user (only the logged-in
    // user's approved transactions are summed).
    const approvedTransactions = await db.find(
      'Transaction',
      '"userId" = $1 AND "status" = $2',
      [userId, 'approved']
    )
    const revenueByCategory: Record<string, number> = {}
    for (const t of approvedTransactions) {
      const cat = (t as any).category || (t as any).type || 'other'
      revenueByCategory[cat] = (revenueByCategory[cat] || 0) + Number((t as any).amount || 0)
    }

    // ----- Per-user comparison stats (this month vs last month) -----
    // Drives the 4 indicator cards at the top of the dashboard:
    //   • Ganhos CashBack   — count of cashback-type transactions
    //   • Novas Indicações  — direct referrals created this month vs last
    //   • Pontos Ganhos     — career/points transactions this month vs last
    //   • Saques            — withdrawal transactions this month vs last
    // All counts are strictly scoped to the logged-in user. NO global data.
    const allUserTransactions = await db.find(
      'Transaction',
      '"userId" = $1',
      [userId],
    )

    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = startOfThisMonth // exclusive upper bound

    const inRange = (dateVal: any, start: Date, end: Date) => {
      if (!dateVal) return false
      const d = new Date(dateVal)
      return d >= start && d < end
    }

    const isCashbackTx = (t: any) => {
      const type = t?.type || ''
      const category = t?.category || ''
      return (
        type === 'cashback' ||
        type === 'cashback_entry' ||
        type === 'cashback_residual' ||
        type === 'cashback_sales' ||
        category === 'cashback' ||
        category === 'cashback_residual' ||
        category === 'cashback_sales'
      )
    }
    const isWithdrawalTx = (t: any) => {
      const type = t?.type || ''
      const category = t?.category || ''
      return (
        type === 'withdrawal' ||
        type === 'withdrawal_fee' ||
        category === 'withdrawal' ||
        category === 'withdrawal_fee'
      )
    }
    const isPointsTx = (t: any) => {
      const type = t?.type || ''
      return type === 'career' || type === 'points'
    }

    const cashbackThisMonth = allUserTransactions.filter((t: any) => isCashbackTx(t) && inRange(t.createdAt, startOfThisMonth, now)).length
    const cashbackLastMonth = allUserTransactions.filter((t: any) => isCashbackTx(t) && inRange(t.createdAt, startOfLastMonth, endOfLastMonth)).length

    const withdrawalsThisMonth = allUserTransactions.filter((t: any) => isWithdrawalTx(t) && inRange(t.createdAt, startOfThisMonth, now)).length
    const withdrawalsLastMonth = allUserTransactions.filter((t: any) => isWithdrawalTx(t) && inRange(t.createdAt, startOfLastMonth, endOfLastMonth)).length

    const pointsThisMonth = allUserTransactions.filter((t: any) => isPointsTx(t) && inRange(t.createdAt, startOfThisMonth, now)).length
    const pointsLastMonth = allUserTransactions.filter((t: any) => isPointsTx(t) && inRange(t.createdAt, startOfLastMonth, endOfLastMonth)).length

    // Direct referrals created this month vs last month
    const referralsThisMonth = directReferrals.filter((r) => inRange(r.createdAt, startOfThisMonth, now)).length
    const referralsLastMonth = directReferrals.filter((r) => inRange(r.createdAt, startOfLastMonth, endOfLastMonth)).length

    const comparisonStats = {
      cashbackEarnings: { current: cashbackThisMonth, previous: cashbackLastMonth },
      newReferrals: { current: referralsThisMonth, previous: referralsLastMonth },
      pointsEarned: { current: pointsThisMonth, previous: pointsLastMonth },
      withdrawals: { current: withdrawalsThisMonth, previous: withdrawalsLastMonth },
    }

    // Recent activity — light mapping of recentTransactions to a stable shape
    // the ActivityFeed component consumes. Numbers stay in cents; the UI
    // decides whether to render them as currency or as point counts.
    const recentActivity = (recentTransactions as any[]).map((tx) => ({
      id: tx.id,
      type: tx.type,
      category: tx.category,
      description: tx.description || tx.type || 'Atividade',
      detail: tx.description || undefined,
      amount: Number(tx.amount || 0),
      status: tx.status,
      time: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
    }))

    return success({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        referralCode: user.referralCode,
        language: user.language,
        isActive: user.isActive,
        profileImage: user.profileImage,
        isDriver: user.isDriver,
        stars: user.stars,
        timeSinceRegistration,
      },
      directReferralCount,
      cashbackEntrada: {
        totalUsers: totalEntradaUsers,
        totalEarned: totalEntradaEarned,
        byLevel: entradaUsersByLevel,
      },
      cashbackResidual: {
        totalUsers: totalResidualUsers,
        totalEarned: totalResidualEarned,
        byLevel: residualUsersByLevel,
      },
      cashbackVendas: {
        totalUsers: totalVendasUsers,
        totalEarned: totalVendasEarned,
        byLevel: vendasUsersByLevel,
      },
      network: {
        totalSize: entradaNetwork.total + residualNetwork.total + vendasNetwork.total,
        activeMembers: activeDirect,
        newReferrals,
      },
      balances: {
        withdrawal: user.balanceWithdrawal || 0,
        mobility: user.balanceMobility || 0,
        shopping: user.balanceShopping || 0,
        food: user.balanceFood || 0,
        pharmacy: user.balancePharmacy || 0,
        gratification: user.balanceGratification || 0,
        paymentInvoice: user.balancePaymentInvoice || 0,
      },
      recentTransactions,
      recentActivity,
      weeklyReferralCount,
      weeklyReferralsByDay,
      career: {
        currentRank: currentCareerPlan?.name ?? 'Associado',
        stars: currentCareerPlan?.sortOrder ?? 0,
        points: careerPoints,
        nextRank: nextCareerPlan
          ? { name: nextCareerPlan.name, pointsNeeded: Math.max(nextCareerPlan.minPoints - careerPoints, 0) }
          : null,
        progress: careerProgress,
      },
      // Per-user: descendants of the logged-in user grouped by plan
      // (Gratuito / Blue 3 / Blue 5 Premium). No longer platform-wide.
      userDistribution: usersByPlan,
      revenueByCategory,
      // Per-user this-month vs last-month counts for the 4 indicator cards
      // at the top of the dashboard. NO global data — every count is scoped
      // to the logged-in user's own transactions + direct referrals.
      comparisonStats,
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return error('Internal server error', 500)
  }
}
