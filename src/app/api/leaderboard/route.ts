import { NextRequest } from 'next/server'
import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const type = url.searchParams.get('type') || 'earnings' // earnings, referrals, points
    const period = url.searchParams.get('period') || 'monthly' // monthly, quarterly, yearly

    if (!userId) {
      return error('userId é obrigatório')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('Usuário não encontrado', 404)
    }

    // Get all active users with referral count
    // Include GamificationStreak so the leaderboard's "points" ranking
    // reflects BOTH the User.personalPoints (credited by the login route
    // via creditDailyLoginPoints) AND the legacy streak.totalPoints that
    // the /api/gamification/streak route still maintains. This keeps
    // users who had streak points before the login-route fix visible in
    // the points leaderboard.
    const allUsersRaw = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        plan: true,
        profileImage: true,
        balanceWithdrawal: true,
        careerPoints: true,
        personalPoints: true,
        _count: { select: { referrals: true } },
        gamificationStreak: { select: { totalPoints: true } },
      },
      take: 500,
    })

    const allUsers = allUsersRaw.map(u => ({
      ...u,
      directReferrals: u._count.referrals,
      // Total points = career + personal + streak. The streak addition
      // is a backwards-compat bridge for users whose daily-login points
      // were credited to GamificationStreak.totalPoints before the
      // login route started also writing to User.personalPoints.
      totalPoints: u.careerPoints + u.personalPoints + (u.gamificationStreak?.totalPoints || 0),
    }))

    // Compute date range for period filtering (kept for future use; ranking
    // currently uses lifetime referral / career-point totals for privacy).
    const now = new Date()
    let periodStart: Date
    switch (period) {
      case 'quarterly':
        periodStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case 'yearly':
        periodStart = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        break
      default: // monthly
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    }
    void periodStart

    // Build ranking based on type.
    // Privacy: the "earnings" tab no longer exposes R$ values across users —
    // it ranks members by their direct referral count ("indicações") instead.
    let rankedUsers: { id: string; name: string; plan: string; profileImage: string | null; value: number; valueDisplay: string }[]

    switch (type) {
      case 'referrals':
        rankedUsers = allUsers.map(u => ({
          id: u.id,
          name: u.name,
          plan: u.plan,
          profileImage: u.profileImage,
          value: u.directReferrals,
          valueDisplay: `${u.directReferrals} indicações`,
        })).sort((a, b) => b.value - a.value)
        break

      case 'points':
        rankedUsers = allUsers.map(u => ({
          id: u.id,
          name: u.name,
          plan: u.plan,
          profileImage: u.profileImage,
          value: u.totalPoints,
          valueDisplay: `${u.totalPoints} pts`,
        })).sort((a, b) => b.value - a.value)
        break

      default: // earnings → ranked by direct referral count (privacy-safe)
        rankedUsers = allUsers.map(u => ({
          id: u.id,
          name: u.name,
          plan: u.plan,
          profileImage: u.profileImage,
          value: u.directReferrals,
          valueDisplay: `${u.directReferrals} indicações`,
        })).sort((a, b) => b.value - a.value)
    }

    // Add rank positions
    const ranked = rankedUsers.map((u, i) => ({ ...u, rank: i + 1 }))

    // Get top 10
    const top10 = ranked.slice(0, 10)

    // Find current user's rank
    const userRank = ranked.find(u => u.id === userId)
    const userPosition = userRank ? userRank.rank : ranked.length + 1

    // User rank summary for all categories.
    // Privacy: no monetary values exposed — "earnings" rank uses referral count.
    // "points" rank uses career + personal + streak total so daily-login
    // points actually move the user up the leaderboard.
    const userRefData = allUsers.find(u => u.id === userId)
    const userReferrals = userRefData?.directReferrals || 0
    const userPoints = userRefData?.totalPoints || 0

    return success({
      type,
      period,
      top10,
      userRank: {
        position: userPosition,
        earnings: {
          position: allUsers.map(u => ({ id: u.id, count: u.directReferrals })).sort((a, b) => b.count - a.count).findIndex(u => u.id === userId) + 1,
          value: `${userReferrals} indicações`,
        },
        referrals: {
          position: allUsers.map(u => ({ id: u.id, count: u.directReferrals })).sort((a, b) => b.count - a.count).findIndex(u => u.id === userId) + 1,
          value: `${userReferrals} indicações`,
        },
        points: {
          position: allUsers.map(u => ({ id: u.id, pts: u.totalPoints })).sort((a, b) => b.pts - a.pts).findIndex(u => u.id === userId) + 1,
          value: `${userPoints} pts`,
        },
      },
      totalUsers: allUsers.length,
    })
  } catch (err: any) {
    return error(err.message || 'Erro ao buscar ranking', 500)
  }
}
