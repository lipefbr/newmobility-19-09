import { NextRequest } from 'next/server'
import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * POST /api/challenges/[id]/progress
 *
 * Updates (or creates) the current user's UserChallenge row for the given
 * Challenge. Body: { currentValue: number }.
 *
 * If currentValue >= challenge.targetValue, marks the UserChallenge as
 * completed=true, completedAt=now. The completedAt timestamp is reused as
 * the "claimed" timestamp by the /claim endpoint (we don't claim here —
 * the user must explicitly claim).
 *
 * Returns the updated UserChallenge plus a fresh progress percentage.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req)
    if (!session) return error('Unauthorized', 401)

    const { id } = await ctx.params
    if (!id) return error('id is required', 400)

    const challenge = (await db.findOne('Challenge', '"id" = $1', [
      id,
    ])) as {
      id: string
      targetValue: number
      isActive: boolean
    } | null
    if (!challenge) return error('Challenge not found', 404)
    if (!challenge.isActive) return error('Challenge is not active', 400)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return error('Invalid body', 400)

    const { currentValue } = body as { currentValue?: unknown }
    const cv = Number(currentValue)
    if (!Number.isFinite(cv) || cv < 0)
      return error('currentValue must be a non-negative number', 400)

    const value = Math.floor(cv)
    const completed = value >= challenge.targetValue

    // The UserChallenge model doesn't have a @@unique([userId, challengeId])
    // constraint, so we can't use prisma's upsert with a compound key. Look
    // up the existing row manually and create/update it accordingly.
    //
    // NOTE: we deliberately do NOT set completedAt here — per the task spec,
    // `completedAt` is reused as the *claimed-at* timestamp by the /claim
    // endpoint. The `completed` boolean alone marks the UserChallenge as
    // eligible for claiming.
    const existing = await prisma.userChallenge.findFirst({
      where: { userId: session.userId, challengeId: id },
    })

    let uc
    if (existing) {
      uc = await prisma.userChallenge.update({
        where: { id: existing.id },
        data: {
          currentValue: value,
          completed,
          // Don't overwrite completedAt — it's the claim marker.
        },
      })
    } else {
      uc = await prisma.userChallenge.create({
        data: {
          userId: session.userId,
          challengeId: id,
          currentValue: value,
          completed,
          completedAt: null,
        },
      })
    }

    const progress =
      challenge.targetValue > 0
        ? Math.min((value / challenge.targetValue) * 100, 100)
        : 0

    return success({
      userChallenge: uc,
      currentValue: value,
      completed,
      progress,
    })
  } catch (err) {
    console.error('[POST /api/challenges/[id]/progress] error:', err)
    return error('Failed to update progress', 500)
  }
}
