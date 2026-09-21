import { NextRequest } from 'next/server'
import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * POST /api/challenges/[id]/claim
 *
 * Claims the reward for a completed challenge. Prereqs:
 *   - UserChallenge exists for (userId, challengeId)
 *   - UserChallenge.completed = true
 *   - UserChallenge.completedAt is null  (i.e. not yet claimed — we reuse
 *     completedAt as the claimed-at timestamp per the task spec)
 *
 * On claim:
 *   - Adds `rewardPoints` to the user's `personalPoints`.
 *   - Creates a PointTransaction of type='challenge_reward'.
 *   - Sets UserChallenge.completedAt = now (the "claimed" marker).
 *
 * Returns: { success: true, claimed: true, newPersonalPoints }
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
      title: string
      rewardPoints: number
      isActive: boolean
    } | null
    if (!challenge) return error('Challenge not found', 404)
    if (!challenge.isActive) return error('Challenge is not active', 400)

    const uc = await prisma.userChallenge.findFirst({
      where: { userId: session.userId, challengeId: id },
    })
    if (!uc) return error('Progress not started for this challenge', 404)
    if (!uc.completed) return error('Challenge not yet completed', 400)
    if (uc.completedAt != null)
      return error('Reward already claimed', 409)

    // Add rewardPoints to user.personalPoints and record a PointTransaction.
    // Use a transaction so the two writes stay consistent.
    const now = new Date()
    const [updatedUser, , updatedUc] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: { personalPoints: { increment: challenge.rewardPoints } },
        select: { personalPoints: true },
      }),
      prisma.pointTransaction.create({
        data: {
          userId: session.userId,
          amount: challenge.rewardPoints,
          type: 'challenge_reward',
          description: `Recompensa do desafio: ${challenge.title}`,
          referenceId: challenge.id,
        },
      }),
      prisma.userChallenge.update({
        where: { id: uc.id },
        data: { completedAt: now },
      }),
    ])

    return success({
      claimed: true,
      newPersonalPoints: updatedUser.personalPoints,
      userChallenge: updatedUc,
    })
  } catch (err) {
    console.error('[POST /api/challenges/[id]/claim] error:', err)
    return error('Failed to claim reward', 500)
  }
}
