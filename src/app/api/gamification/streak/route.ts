import { NextRequest } from 'next/server'
import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    // Get or create streak
    let streak = await db.findOne('GamificationStreak', '"userId" = $1', [userId]) as any

    if (!streak) {
      streak = await db.insert('GamificationStreak', {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastLoginDate: new Date(),
        totalPoints: 10,
      })
    }

    // Check if streak should be updated
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastLogin = streak.lastLoginDate ? new Date(streak.lastLoginDate) : null
    if (lastLogin) {
      lastLogin.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        // Consecutive day - increment streak
        const newStreak = streak.currentStreak + 1
        streak = await db.update(
          'GamificationStreak',
          '"userId" = $1',
          {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, streak.longestStreak),
            lastLoginDate: new Date(),
            totalPoints: streak.totalPoints + (newStreak >= 7 ? 20 : 10),
          },
          [userId]
        )
      } else if (diffDays > 1) {
        // Streak broken - reset
        streak = await db.update(
          'GamificationStreak',
          '"userId" = $1',
          {
            currentStreak: 1,
            lastLoginDate: new Date(),
            totalPoints: streak.totalPoints + 5,
          },
          [userId]
        )
      }
    }

    // Streak rewards — read from the admin-managed StreakReward table so
    // admin edits propagate here. The shape the UI expects:
    //   { days, points, amount, rewardType, claimed }
    // - `rewardType`: 'points' | 'cashback'
    // - `amount`: the raw rewardAmount integer. For 'points' it is the number
    //   of career points to credit. For 'cashback' it is the value in cents
    //   to credit to balanceWithdrawal.
    // - `points` is kept as an alias of `amount` for backwards compatibility
    //   with older UI builds that read `reward.points` directly.
    const currentStreakValue = (streak as any).currentStreak
    const rewardRows = await prisma.streakReward.findMany({
      where: { isActive: true },
      orderBy: [{ streakDays: 'asc' }],
    })
    const streakRewards = rewardRows.map((r) => {
      const rewardType: 'points' | 'cashback' =
        r.rewardType === 'cashback' ? 'cashback' : 'points'
      return {
        days: r.streakDays,
        points: r.rewardAmount,
        amount: r.rewardAmount,
        description: r.description,
        rewardType,
        claimed: currentStreakValue >= r.streakDays,
      }
    })

    return success({
      currentStreak: currentStreakValue,
      longestStreak: (streak as any).longestStreak,
      totalPoints: (streak as any).totalPoints,
      lastLoginDate: (streak as any).lastLoginDate,
      streakRewards,
    })
  } catch (err) {
    return error('Failed to fetch streak', 500)
  }
}
