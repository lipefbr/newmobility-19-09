import { db, prisma } from '@/lib/db'
import { verifyPassword, success, error, sanitizeUser } from '@/lib/api-utils'

// Default points configuration — kept in sync with /api/points/config.
// We read the live values from SystemConfig at runtime so admin edits
// propagate; the constants here are only a fallback.
const DEFAULT_DAILY_LOGIN_POINTS = 1
const POINTS_KEY_PREFIX = 'points_'

/**
 * Resolve the current "dailyLoginPoints" config value from SystemConfig,
 * falling back to DEFAULT_DAILY_LOGIN_POINTS on any error.
 *
 * Stored under the key `points_dailyLoginPoints` by the admin
 * points-config route. We deliberately keep this read small so the login
 * route stays fast (one indexed lookup).
 */
async function getDailyLoginPoints(): Promise<number> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { key: `${POINTS_KEY_PREFIX}dailyLoginPoints` },
    })
    if (!row) return DEFAULT_DAILY_LOGIN_POINTS
    const parsed = parseFloat(row.value)
    return isNaN(parsed) ? DEFAULT_DAILY_LOGIN_POINTS : Math.max(0, Math.round(parsed))
  } catch {
    return DEFAULT_DAILY_LOGIN_POINTS
  }
}

/**
 * Credit the daily-login points for the user.
 *
 * Idempotent: uses GamificationStreak.lastLoginDate to detect "already
 * credited today" (same calendar day, in the user's local timezone
 * interpretation by the server). On the first login of a new day:
 *   - increments streak.currentStreak (resets to 1 if the streak broke),
 *   - adds `points` to User.personalPoints so it shows in the leaderboard,
 *   - adds `points` to GamificationStreak.totalPoints (legacy counter),
 *   - writes a PointTransaction row for the audit trail,
 *   - updates lastLoginDate.
 *
 * Wrapped in try/catch so a failure here never blocks the login itself —
 * the worst case is the user doesn't get points for that day, but they
 * can still access their account.
 */
async function creditDailyLoginPoints(userId: string): Promise<number> {
  const points = await getDailyLoginPoints()
  if (points <= 0) return 0

  try {
    // Get or create the user's streak row.
    let streak = await prisma.gamificationStreak.findUnique({ where: { userId } })
    if (!streak) {
      streak = await prisma.gamificationStreak.create({
        data: {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          lastLoginDate: null,
          totalPoints: 0,
        },
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastLogin = streak.lastLoginDate ? new Date(streak.lastLoginDate) : null
    if (lastLogin) lastLogin.setHours(0, 0, 0, 0)

    // Same calendar day → already credited. Bail out.
    if (lastLogin && lastLogin.getTime() === today.getTime()) {
      return 0
    }

    // Compute new streak: +1 if yesterday, otherwise reset to 1.
    const diffDays = lastLogin
      ? Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity
    const newStreak = diffDays === 1 ? streak.currentStreak + 1 : 1
    const newLongest = Math.max(newStreak, streak.longestStreak)

    // Credit points + update streak atomically.
    const [updatedUser, ,] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { personalPoints: { increment: points } },
        select: { personalPoints: true },
      }),
      prisma.gamificationStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastLoginDate: new Date(),
          totalPoints: { increment: points },
        },
      }),
      prisma.pointTransaction.create({
        data: {
          userId,
          amount: points,
          type: 'daily_login',
          description: `Login diário (streak ${newStreak} dia${newStreak === 1 ? '' : 's'})`,
        },
      }),
    ])

    return updatedUser.personalPoints
  } catch (err) {
    console.error('creditDailyLoginPoints failed:', err)
    return 0
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return error('Email and password are required')
    }

    const user = await db.findOne('User', '"email" = $1', [email])
    if (!user) {
      return error('Invalid credentials', 401)
    }

    if (!verifyPassword(password, user.password)) {
      return error('Invalid credentials', 401)
    }

    // Credit daily-login points BEFORE serialising the user so the
    // returned `personalPoints` reflects the new total — the client
    // store hydrates from this response and the leaderboard reads the
    // same field, so the points the user just earned show up
    // immediately on next page load.
    await creditDailyLoginPoints(user.id)

    // Re-fetch the user so `sanitizeUser` returns the up-to-date
    // personalPoints (the creditDailyLoginPoints transaction incremented
    // it on the DB side; the in-memory `user` object is now stale).
    const refreshedUser = await db.findOne('User', '"id" = $1', [user.id])
    const finalUser = refreshedUser || user

    const safeUser = sanitizeUser(finalUser)

    return success({
      user: safeUser,
      balances: {
        withdrawal: finalUser.balanceWithdrawal,
        mobility: finalUser.balanceMobility,
        shopping: finalUser.balanceShopping,
        food: finalUser.balanceFood,
        pharmacy: finalUser.balancePharmacy,
        gratification: finalUser.balanceGratification,
        free: finalUser.balanceFree || 0,
        pending: finalUser.balancePending || 0,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return error('Internal server error', 500)
  }
}
