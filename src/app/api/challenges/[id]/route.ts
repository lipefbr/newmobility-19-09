import { NextRequest } from 'next/server'
import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * PUT /api/challenges/[id]
 *
 * Admin only. Updates a challenge. Accepts any subset of:
 *   title, description, type, targetValue, rewardPoints,
 *   startDate, endDate, isActive
 *
 * startDate/endDate accept ISO strings, null, or empty string (→ null).
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req)
    if (!session) return error('Unauthorized', 401)
    if (session.role !== 'admin') return error('Forbidden', 403)

    const { id } = await ctx.params
    if (!id) return error('id is required', 400)

    const existing = await db.findOne('Challenge', '"id" = $1', [id])
    if (!existing) return error('Challenge not found', 404)

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
    } = body as Record<string, unknown>

    const patch: Record<string, unknown> = {}

    if (typeof title === 'string' && title.trim()) patch.title = title.trim()
    if (typeof description === 'string' && description.trim())
      patch.description = description.trim()
    if (typeof type === 'string') {
      if (!['weekly', 'monthly', 'one_time'].includes(type))
        return error("type must be 'weekly', 'monthly' or 'one_time'", 400)
      patch.type = type
    }
    if (targetValue !== undefined) {
      const tv = Number(targetValue)
      if (!Number.isFinite(tv) || tv < 0)
        return error('targetValue must be a non-negative number', 400)
      patch.targetValue = Math.floor(tv)
    }
    if (rewardPoints !== undefined) {
      const rp = Number(rewardPoints)
      if (!Number.isFinite(rp) || rp < 0)
        return error('rewardPoints must be a non-negative number', 400)
      patch.rewardPoints = Math.floor(rp)
    }
    if (startDate !== undefined) {
      patch.startDate =
        typeof startDate === 'string' && startDate.trim()
          ? new Date(startDate)
          : null
    }
    if (endDate !== undefined) {
      patch.endDate =
        typeof endDate === 'string' && endDate.trim()
          ? new Date(endDate)
          : null
    }
    if (isActive !== undefined) {
      patch.isActive = isActive === true
    }

    if (Object.keys(patch).length === 0)
      return error('No fields to update', 400)

    const updated = await db.update('Challenge', '"id" = $1', patch, [id])
    return success({ challenge: updated })
  } catch (err) {
    console.error('[PUT /api/challenges/[id]] error:', err)
    return error('Failed to update challenge', 500)
  }
}

/**
 * DELETE /api/challenges/[id]
 *
 * Admin only. Deletes a challenge (and cascades to its UserChallenge rows via
 * the onDelete relation — Prisma's default for UserChallenge.challenge is
 * restrict, but we manually delete the UserChallenge rows first to be safe).
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req)
    if (!session) return error('Unauthorized', 401)
    if (session.role !== 'admin') return error('Forbidden', 403)

    const { id } = await ctx.params
    if (!id) return error('id is required', 400)

    const existing = await db.findOne('Challenge', '"id" = $1', [id])
    if (!existing) return error('Challenge not found', 404)

    // First delete any UserChallenge rows referencing this challenge so the
    // DELETE doesn't fail on FK restrict (Prisma default for the
    // UserChallenge.challenge relation). The db.deleteFrom switch doesn't
    // cover UserChallenge, so use prisma directly.
    await prisma.userChallenge.deleteMany({ where: { challengeId: id } })

    await db.deleteFrom('Challenge', '"id" = $1', [id])
    return success({ deleted: true })
  } catch (err) {
    console.error('[DELETE /api/challenges/[id]] error:', err)
    return error('Failed to delete challenge', 500)
  }
}
