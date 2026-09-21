import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'admin') return null
  return user
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, name, category, brand, city, state, address, phone, discountText, cashbackPercent, isActive, sortOrder } = body
    if (!(await requireAdmin(userId))) return error('Unauthorized', 403)

    const existing = await prisma.accreditedNetworkItem.findUnique({ where: { id } })
    if (!existing) return error('Item not found', 404)

    const updated = await prisma.accreditedNetworkItem.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        category: category !== undefined ? String(category).trim() : undefined,
        brand: brand !== undefined ? (brand?.trim() || null) : undefined,
        city: city !== undefined ? String(city).trim() : undefined,
        state: state !== undefined ? String(state).trim().toUpperCase() : undefined,
        address: address !== undefined ? (address?.trim() || null) : undefined,
        phone: phone !== undefined ? (phone?.trim() || null) : undefined,
        discountText: discountText !== undefined ? (discountText?.trim() || null) : undefined,
        cashbackPercent: cashbackPercent !== undefined ? Math.max(0, Math.min(100, Number(cashbackPercent) || 0)) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      },
    })
    return success(updated)
  } catch (err) {
    console.error('Update accredited item error:', err)
    return error('Failed to update item', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!(await requireAdmin(userId))) return error('Unauthorized', 403)

    const existing = await prisma.accreditedNetworkItem.findUnique({ where: { id } })
    if (!existing) return error('Item not found', 404)

    await prisma.accreditedNetworkItem.delete({ where: { id } })
    return success({ id, deleted: true })
  } catch (err) {
    console.error('Delete accredited item error:', err)
    return error('Failed to delete item', 500)
  }
}
