import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/driver-categories/[id]
// ----------------------------------------------------------------------------
// PUT  → atualiza uma categoria de motorista
// DELETE → remove uma categoria (bloqueia se houver motoristas vinculados)
// ============================================================================

async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, userType: true },
  })
  if (!admin || (admin.role !== 'admin' && admin.userType !== 'admin')) {
    return null
  }
  return admin
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, ...updateFields } = body

    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    const existing = await prisma.driverCategory.findUnique({ where: { id } })
    if (!existing) return error('Categoria não encontrada', 404)

    const data: Record<string, unknown> = {}
    if (updateFields.name !== undefined) data.name = updateFields.name
    if (updateFields.description !== undefined) data.description = updateFields.description || null
    if (updateFields.sortOrder !== undefined) data.sortOrder = Number(updateFields.sortOrder) || 0
    if (updateFields.monthlyTripsTarget !== undefined) data.monthlyTripsTarget = Number(updateFields.monthlyTripsTarget) || 0
    if (updateFields.bonusCents !== undefined) data.bonusCents = Number(updateFields.bonusCents) || 0
    if (updateFields.maxCancellationPerMonth !== undefined) data.maxCancellationPerMonth = Number(updateFields.maxCancellationPerMonth) || 0
    if (updateFields.color !== undefined) data.color = updateFields.color || null
    if (updateFields.icon !== undefined) data.icon = updateFields.icon || null
    if (updateFields.isActive !== undefined) data.isActive = Boolean(updateFields.isActive)

    if (Object.keys(data).length === 0) return error('Nenhum campo para atualizar', 400)

    const updated = await prisma.driverCategory.update({ where: { id }, data })
    return success(updated)
  } catch (err) {
    console.error('Admin driver-categories PUT error:', err)
    return error('Failed to update driver category', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')

    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    const existing = await prisma.driverCategory.findUnique({ where: { id } })
    if (!existing) return error('Categoria não encontrada', 404)

    // Bloqueia exclusão se houver motoristas vinculados
    const userCount = await prisma.user.count({ where: { driverCategoryId: id } })
    if (userCount > 0) {
      return error(
        `Não é possível excluir: ${userCount} motorista(s) vinculado(s) a esta categoria. Reatribua-os antes.`,
        400,
      )
    }

    await prisma.driverCategory.delete({ where: { id } })
    return success({ deleted: true })
  } catch (err) {
    console.error('Admin driver-categories DELETE error:', err)
    return error('Failed to delete driver category', 500)
  }
}
