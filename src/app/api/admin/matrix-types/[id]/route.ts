import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'admin') return null
  return user
}

/**
 * GET /api/admin/matrix-types/[id]?userId=...
 *
 * Returns a single MatrixType with its MatrixLevelEarning children.
 *
 * NOTE (TASK MATRIX-EDITOR): The relation field on MatrixType is named
 * `MatrixLevelEarning` (capital M) per prisma/schema.prisma — the previous
 * version of this file used the lowercase `levels` alias which does NOT
 * exist on this model and would throw "Unknown argument `levels`" at
 * runtime. The alias has been fixed below.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!(await requireAdmin(userId))) return error('Unauthorized', 403)

    const mt = await prisma.matrixType.findUnique({
      where: { id },
      include: { MatrixLevelEarning: { orderBy: { level: 'asc' } } },
    })
    if (!mt) return error('Matrix type not found', 404)
    return success(mt)
  } catch (err) {
    console.error('Get matrix type error:', err)
    return error('Failed to fetch matrix type', 500)
  }
}

/**
 * PUT /api/admin/matrix-types/[id]
 *
 * Body:
 *   { userId, name?, width?, depth?, description?, color?, isActive?,
 *     levels?: [{ level, percentage, fixedBonusCents? }] }
 *
 * When `levels` is provided, the full set of MatrixLevelEarning rows for this
 * type is REPLACED (deleteMany + recreate). This is the same semantics as
 * before, but now using the correct `MatrixLevelEarning` relation name.
 *
 * Writes an AuditLog row capturing the previous and new state of the type +
 * its levels (financial impact — affects cashback calculation).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, name, width, depth, description, color, isActive, levels } = body
    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    const existing = await prisma.matrixType.findUnique({
      where: { id },
      include: { MatrixLevelEarning: { orderBy: { level: 'asc' } } },
    })
    if (!existing) return error('Matrix type not found', 404)

    const data: Record<string, unknown> = {}
    if (typeof name === 'string' && name.trim()) data.name = name.trim()
    if (width !== undefined) {
      const w = Number(width)
      if (w < 1 || w > 20) return error('width must be between 1 and 20', 400)
      data.width = w
    }
    if (depth !== undefined) {
      const d = Number(depth)
      if (d < 1 || d > 20) return error('depth must be between 1 and 20', 400)
      data.depth = d
    }
    if (description !== undefined) data.description = description || null
    if (color !== undefined) data.color = color || null
    if (typeof isActive === 'boolean') data.isActive = isActive

    // Replace levels if provided — uses the correct `MatrixLevelEarning`
    // relation alias (NOT `levels` — the schema names the relation field
    // `MatrixLevelEarning`).
    let validatedLevels: { level: number; percentage: number; fixedBonusCents: number }[] = []
    if (Array.isArray(levels)) {
      const d = Number(depth) || existing.depth
      validatedLevels = levels
        .filter((l: any) => Number.isInteger(Number(l.level)) && Number(l.level) >= 1 && Number(l.level) <= d)
        .map((l: any) => ({
          level: Number(l.level),
          percentage: Math.max(0, Math.min(100, Number(l.percentage) || 0)),
          fixedBonusCents: Math.max(0, Math.floor(Number(l.fixedBonusCents) || 0)),
        }))

      await prisma.matrixLevelEarning.deleteMany({ where: { matrixTypeId: id } })
      if (validatedLevels.length) {
        // Tarefa (22/09): MatrixLevelEarning.id não tem @default(cuid()),
        // então precisamos gerar ids manualmente.
        data.MatrixLevelEarning = {
          create: validatedLevels.map((l, i) => ({
            id: `${id}_lvl_${l.level}_${Date.now()}_${i}`,
            level: l.level,
            percentage: l.percentage,
            fixedBonusCents: l.fixedBonusCents,
            updatedAt: new Date(),
          })),
        }
      }
    }

    const updated = await prisma.matrixType.update({
      where: { id },
      data,
      include: { MatrixLevelEarning: { orderBy: { level: 'asc' } } },
    })

    // Audit log — financial impact, capture before/after.
    try {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'matrix_type.update',
          entityType: 'MatrixType',
          entityId: id,
          details: JSON.stringify({
            code: existing.code,
            name: existing.name,
            matrixKind: existing.matrixKind,
            before: {
              name: existing.name,
              width: existing.width,
              depth: existing.depth,
              isActive: existing.isActive,
              description: existing.description,
              color: existing.color,
              levels: existing.MatrixLevelEarning.map((le) => ({
                level: le.level,
                percentage: le.percentage,
                fixedBonusCents: le.fixedBonusCents,
              })),
            },
            after: {
              name: updated.name,
              width: updated.width,
              depth: updated.depth,
              isActive: updated.isActive,
              description: updated.description,
              color: updated.color,
              levels: updated.MatrixLevelEarning.map((le) => ({
                level: le.level,
                percentage: le.percentage,
                fixedBonusCents: le.fixedBonusCents,
              })),
            },
            levelsReplaced: Array.isArray(levels),
          }),
        },
      })
    } catch (auditErr) {
      console.error('Failed to write matrix_type.update audit log:', auditErr)
    }

    // Mirror the GET list response shape so the client can replace the row
    // in-place without reshaping.
    return success({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      matrixKind: updated.matrixKind,
      width: updated.width,
      depth: updated.depth,
      description: updated.description,
      color: updated.color,
      isActive: updated.isActive,
      levelEarnings: updated.MatrixLevelEarning.map((le) => ({
        id: le.id,
        level: le.level,
        percentage: le.percentage,
        fixedBonusCents: le.fixedBonusCents,
      })),
    })
  } catch (err) {
    console.error('Update matrix type error:', err)
    return error('Failed to update matrix type', 500)
  }
}

/**
 * DELETE /api/admin/matrix-types/[id]?userId=...
 *
 * Refuses to delete if any Plan references this matrix type (FK constraint
 * guard). Writes an AuditLog row snapshotting the deleted type + levels.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    const existing = await prisma.matrixType.findUnique({
      where: { id },
      include: { MatrixLevelEarning: { orderBy: { level: 'asc' } } },
    })
    if (!existing) return error('Matrix type not found', 404)

    // Check no plans reference this matrix type before deleting
    const referencing = await prisma.plan.count({
      where: {
        OR: [{ matrixEntradaId: id }, { matrixResidualId: id }, { matrixVendasId: id }],
      },
    })
    if (referencing > 0) {
      return error('Cannot delete: this matrix type is referenced by one or more plans. Remove the reference first.', 409)
    }

    const snapshot = {
      id: existing.id,
      code: existing.code,
      name: existing.name,
      matrixKind: existing.matrixKind,
      width: existing.width,
      depth: existing.depth,
      isActive: existing.isActive,
      levels: existing.MatrixLevelEarning.map((le) => ({
        level: le.level,
        percentage: le.percentage,
        fixedBonusCents: le.fixedBonusCents,
      })),
    }

    await prisma.matrixType.delete({ where: { id } })

    try {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'matrix_type.delete',
          entityType: 'MatrixType',
          entityId: id,
          details: JSON.stringify(snapshot),
        },
      })
    } catch (auditErr) {
      console.error('Failed to write matrix_type.delete audit log:', auditErr)
    }

    return success({ deleted: true })
  } catch (err) {
    console.error('Delete matrix type error:', err)
    return error('Failed to delete matrix type', 500)
  }
}
