import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * GET /api/challenges
 *
 * Returns the list of challenges visible to the current user.
 *
 * Query params:
 *   - userId        (always required for auth resolution)
 *   - all=true      (admin only — returns ALL challenges including inactive ones,
 *                    without per-user progress)
 *
 * For regular users:
 *   - Only active challenges (isActive=true) are returned.
 *   - If the user has a UserChallenge row for a challenge, the row's
 *     currentValue/completed/completedAt are merged into the response so the
 *     UI can render progress bars and a "Resgatar" button.
 *
 * For admins with ?all=true:
 *   - Every challenge (active or not) is returned without per-user progress.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return error('Unauthorized', 401)

    const all = req.nextUrl.searchParams.get('all') === 'true'
    const isAdminAll = all && session.role === 'admin'

    const challenges = (await db.find(
      'Challenge',
      isAdminAll ? '' : '"isActive" = true',
      [],
      'ORDER BY "createdAt" DESC'
    )) as Array<{
      id: string
      title: string
      description: string
      type: string
      targetValue: number
      rewardPoints: number
      isActive: boolean
      startDate: Date | null
      endDate: Date | null
      createdAt: Date
      updatedAt: Date
    }>

    if (isAdminAll) {
      // Admin overview — no per-user progress required.
      return success({ challenges })
    }

    // Regular user — merge their progress.
    const userChallenges = (await db.find(
      'UserChallenge',
      '"userId" = $1',
      [session.userId]
    )) as Array<{
      id: string
      challengeId: string
      currentValue: number
      completed: boolean
      completedAt: Date | null
    }>

    const ucMap = new Map(userChallenges.map((uc) => [uc.challengeId, uc]))

    const merged = challenges.map((c) => {
      const uc = ucMap.get(c.id)
      const current = uc?.currentValue || 0
      const progress =
        c.targetValue > 0 ? Math.min((current / c.targetValue) * 100, 100) : 0
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        targetValue: c.targetValue,
        rewardPoints: c.rewardPoints,
        isActive: c.isActive,
        startDate: c.startDate,
        endDate: c.endDate,
        createdAt: c.createdAt,
        currentValue: current,
        completed: uc?.completed || false,
        claimed: uc?.completedAt != null, // completedAt is reused as the claimed-at timestamp
        userChallengeId: uc?.id || null,
        progress,
      }
    })

    return success({ challenges: merged })
  } catch (err) {
    console.error('[GET /api/challenges] error:', err)
    return error('Failed to fetch challenges', 500)
  }
}

/**
 * POST /api/challenges
 *
 * Admin only. Creates a new challenge.
 *
 * Body:
 *   - title         string   required
 *   - description   string   required
 *   - type          'weekly' | 'monthly' | 'one_time'   required
 *   - targetValue   number   required (>=0)
 *   - rewardPoints  number   required (>=0)
 *   - startDate?    ISO date string
 *   - endDate?      ISO date string
 *   - isActive?     boolean (default true)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return error('Unauthorized', 401)
    if (session.role !== 'admin') return error('Forbidden', 403)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return error('Invalid body', 400)

    const {
      title,
      description,
      type,
      targetValue,
      rewardPoints,
      startDate,
      endDate,
      isActive,
    } = body as {
      title?: unknown
      description?: unknown
      type?: unknown
      targetValue?: unknown
      rewardPoints?: unknown
      startDate?: unknown
      endDate?: unknown
      isActive?: unknown
    }

    if (typeof title !== 'string' || !title.trim())
      return error('title is required', 400)
    if (typeof description !== 'string' || !description.trim())
      return error('description is required', 400)
    if (!['weekly', 'monthly', 'one_time'].includes(String(type)))
      return error("type must be 'weekly', 'monthly' or 'one_time'", 400)
    const tv = Number(targetValue)
    if (!Number.isFinite(tv) || tv < 0)
      return error('targetValue must be a non-negative number', 400)
    const rp = Number(rewardPoints)
    if (!Number.isFinite(rp) || rp < 0)
      return error('rewardPoints must be a non-negative number', 400)

    const created = await db.insert('Challenge', {
      title: title.trim(),
      description: description.trim(),
      type: String(type),
      targetValue: Math.floor(tv),
      rewardPoints: Math.floor(rp),
      isActive: isActive !== false,
      startDate: startDate ? new Date(String(startDate)) : null,
      endDate: endDate ? new Date(String(endDate)) : null,
    })

    return success({ challenge: created }, 201)
  } catch (err) {
    console.error('[POST /api/challenges] error:', err)
    return error('Failed to create challenge', 500)
  }
}
