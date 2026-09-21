import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * PUT /api/admin/matrix-positions/[id]
 *
 * Updates an existing MatrixPosition's level / position / status.
 * `status` is a friendly alias for the underlying `isFilled` boolean:
 *   - 'filled'   → isFilled = true  (position holds a real user)
 *   - 'reserved' → isFilled = false (position reserved but not yet filled)
 *
 * Body:
 *   { userId, level?, position?, status? }
 *
 * Writes an AuditLog row capturing the previous and new values so financial
 * impacts can be reconstructed later.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, level, position, status } = body

    if (!userId) return error('userId is required', 400)
    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.matrixPosition.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    if (!existing) return error('Matrix position not found', 404)

    const data: { level?: number; position?: number; isFilled?: boolean } = {}

    if (level !== undefined) {
      const lvl = Number(level)
      if (!Number.isInteger(lvl) || lvl < 0) return error('level must be a non-negative integer', 400)
      data.level = lvl
    }

    if (position !== undefined) {
      const pos = Number(position)
      if (!Number.isInteger(pos) || pos < 0) return error('position must be a non-negative integer', 400)
      data.position = pos
    }

    if (status !== undefined) {
      if (status === 'filled') data.isFilled = true
      else if (status === 'reserved') data.isFilled = false
      else return error("status must be 'filled' or 'reserved'", 400)
    }

    if (Object.keys(data).length === 0) {
      return error('Nothing to update — provide level, position, or status', 400)
    }

    const updated = await prisma.matrixPosition.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    // Audit log — swallow errors so the user-facing response is never broken
    // by an audit-log write failure. Mirrors the matrix-config precedent
    // (prisma.auditLog.create with userId/action/entityType/entityId/details).
    try {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'matrix_position.update',
          entityType: 'MatrixPosition',
          entityId: id,
          details: JSON.stringify({
            matrixType: existing.matrixType,
            user: existing.user
              ? { id: existing.user.id, name: existing.user.name, email: existing.user.email }
              : null,
            before: {
              level: existing.level,
              position: existing.position,
              isFilled: existing.isFilled,
            },
            after: {
              level: updated.level,
              position: updated.position,
              isFilled: updated.isFilled,
            },
          }),
        },
      })
    } catch (auditErr) {
      console.error('Failed to write matrix_position.update audit log:', auditErr)
    }

    return success({
      id: updated.id,
      userId: updated.userId,
      userName: updated.user?.name || null,
      userEmail: updated.user?.email || null,
      matrixType: updated.matrixType,
      level: updated.level,
      position: updated.position,
      isFilled: updated.isFilled,
      status: updated.isFilled ? 'filled' : 'reserved',
      createdAt: updated.createdAt,
    })
  } catch (err) {
    console.error('Update matrix position error:', err)
    return error('Failed to update matrix position', 500)
  }
}

/**
 * DELETE /api/admin/matrix-positions/[id]?userId=...
 *
 * Removes a MatrixPosition record. Confirms the owning user still exists
 * (defensive — should never be null in practice, but the spec asks for the
 * check). Writes an AuditLog row capturing the deleted row's snapshot so
 * the deletion can be reconstructed / reversed later.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.matrixPosition.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    if (!existing) return error('Matrix position not found', 404)

    // Spec: confirmation that the user exists. We log the resolution so a
    // missing user (shouldn't happen in practice) is visible in the audit.
    const userExists = !!existing.user

    const snapshot = {
      id: existing.id,
      userId: existing.userId,
      matrixType: existing.matrixType,
      level: existing.level,
      position: existing.position,
      isFilled: existing.isFilled,
      parentId: existing.parentId,
      createdAt: existing.createdAt,
      user: existing.user
        ? { id: existing.user.id, name: existing.user.name, email: existing.user.email }
        : null,
      userExists,
    }

    await prisma.matrixPosition.delete({ where: { id } })

    try {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'matrix_position.delete',
          entityType: 'MatrixPosition',
          entityId: id,
          details: JSON.stringify(snapshot),
        },
      })
    } catch (auditErr) {
      console.error('Failed to write matrix_position.delete audit log:', auditErr)
    }

    return success({ deleted: true, userExists })
  } catch (err) {
    console.error('Delete matrix position error:', err)
    return error('Failed to delete matrix position', 500)
  }
}
