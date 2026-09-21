import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/user-types/[id]
// ----------------------------------------------------------------------------
// GET    → fetch a single user type by id
// PUT    → update a user type (admin only)
// DELETE → delete a user type (admin only). Refuses if any User has this
//          type as their qualification (to avoid orphaning users).
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

    const type = await prisma.userType.findUnique({ where: { id } })
    if (!type) return error('Tipo não encontrado', 404)
    return success(type)
  } catch (err) {
    console.error('Admin user-types GET [id] error:', err)
    return error('Failed to fetch user type', 500)
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

    const existing = await prisma.userType.findUnique({ where: { id } })
    if (!existing) return error('Tipo não encontrado', 404)

    // If code is changing, make sure it doesn't collide with another type.
    if (updates.code && updates.code !== existing.code) {
      const collision = await prisma.userType.findUnique({ where: { code: updates.code } })
      if (collision) return error('Já existe um tipo com este código', 400)
    }

    // Validate mobilePermissions if provided
    if (updates.mobilePermissions !== undefined) {
      try {
        JSON.parse(updates.mobilePermissions)
      } catch {
        return error('mobilePermissions deve ser um JSON array válido', 400)
      }
    }

    const updated = await prisma.userType.update({
      where: { id },
      data: {
        ...(updates.code !== undefined ? { code: updates.code } : {}),
        ...(updates.label !== undefined ? { label: updates.label } : {}),
        ...(updates.description !== undefined ? { description: updates.description || null } : {}),
        ...(updates.isActive !== undefined ? { isActive: Boolean(updates.isActive) } : {}),
        ...(updates.sortOrder !== undefined ? { sortOrder: Number(updates.sortOrder) || 99 } : {}),
        ...(updates.defaultEntradaLevel !== undefined ? { defaultEntradaLevel: Number(updates.defaultEntradaLevel) || 0 } : {}),
        ...(updates.defaultResidualLevel !== undefined ? { defaultResidualLevel: Number(updates.defaultResidualLevel) || 0 } : {}),
        ...(updates.defaultVendasLevel !== undefined ? { defaultVendasLevel: Number(updates.defaultVendasLevel) || 0 } : {}),
        ...(updates.showDriverGoals !== undefined ? { showDriverGoals: Boolean(updates.showDriverGoals) } : {}),
        ...(updates.mobilePermissions !== undefined ? { mobilePermissions: updates.mobilePermissions } : {}),
        ...(updates.color !== undefined ? { color: updates.color || null } : {}),
        ...(updates.icon !== undefined ? { icon: updates.icon || null } : {}),
      },
    })

    return success(updated)
  } catch (err) {
    console.error('Admin user-types PUT error:', err)
    return error('Failed to update user type', 500)
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

    const existing = await prisma.userType.findUnique({ where: { id } })
    if (!existing) return error('Tipo não encontrado', 404)

    // Refuse to delete if any user still has this code as their qualification.
    const usersWithThisType = await prisma.user.count({
      where: { qualification: existing.code },
    })
    if (usersWithThisType > 0) {
      return error(
        `Não é possível excluir: ${usersWithThisType} usuário(s) ainda usam este tipo. Reatribua-os antes de excluir.`,
        400,
      )
    }

    await prisma.userType.delete({ where: { id } })
    return success({ ok: true, id })
  } catch (err) {
    console.error('Admin user-types DELETE error:', err)
    return error('Failed to delete user type', 500)
  }
}
