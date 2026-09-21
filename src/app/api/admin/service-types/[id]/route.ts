import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/service-types/[id]
// ----------------------------------------------------------------------------
// GET    → fetch a single service type by id
// PUT    → update a service type (admin only). Accepts name, icon, isActive,
//          sortOrder. Renaming is allowed but the new name must not collide
//          with another existing type.
// DELETE → delete a service type (admin only). Refuses if any Service row
//          still references the type's name as its `category` — admin should
//          re-categorize those services first.
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    const type = await prisma.serviceType.findUnique({ where: { id } })
    if (!type) return error('Tipo não encontrado', 404)
    return success(type)
  } catch (err) {
    console.error('Admin service-types GET [id] error:', err)
    return error('Failed to fetch service type', 500)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, ...updates } = body

    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    const existing = await prisma.serviceType.findUnique({ where: { id } })
    if (!existing) return error('Tipo não encontrado', 404)

    // If name is changing, make sure it doesn't collide.
    if (updates.name !== undefined) {
      const trimmed = String(updates.name).trim()
      if (!trimmed) return error('name não pode ser vazio', 400)
      if (trimmed !== existing.name) {
        const collision = await prisma.serviceType.findUnique({ where: { name: trimmed } })
        if (collision) return error('Já existe um tipo com este nome', 400)
      }
      updates.name = trimmed
    }

    const updated = await prisma.serviceType.update({
      where: { id },
      data: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.icon !== undefined ? { icon: updates.icon || null } : {}),
        ...(updates.isActive !== undefined ? { isActive: Boolean(updates.isActive) } : {}),
        ...(updates.sortOrder !== undefined ? { sortOrder: Number(updates.sortOrder) || 99 } : {}),
      },
    })

    return success(updated)
  } catch (err) {
    console.error('Admin service-types PUT error:', err)
    return error('Failed to update service type', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    const existing = await prisma.serviceType.findUnique({ where: { id } })
    if (!existing) return error('Tipo não encontrado', 404)

    // Refuse to delete if any Service still uses this category name.
    const servicesWithThisType = await prisma.service.count({
      where: { category: existing.name },
    })
    if (servicesWithThisType > 0) {
      return error(
        `Não é possível excluir: ${servicesWithThisType} serviço(s) ainda usam este tipo. Reatribua-os antes de excluir.`,
        400,
      )
    }

    await prisma.serviceType.delete({ where: { id } })
    return success({ ok: true, id })
  } catch (err) {
    console.error('Admin service-types DELETE error:', err)
    return error('Failed to delete service type', 500)
  }
}
