import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'admin') return null
  return user
}

// PUT /api/discount-club/[id]  — admin only
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, name, logoUrl, category, discountText, cashbackPercent, description, websiteUrl, phone, isFeatured, isActive, sortOrder } = body
    if (!(await requireAdmin(userId))) return error('Unauthorized', 403)

    const existing = await prisma.discountClubPartner.findUnique({ where: { id } })
    if (!existing) return error('Partner not found', 404)

    const updated = await prisma.discountClubPartner.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        logoUrl: logoUrl !== undefined ? (logoUrl?.trim() || null) : undefined,
        category: category !== undefined ? String(category).trim() : undefined,
        discountText: discountText !== undefined ? (discountText?.trim() || null) : undefined,
        cashbackPercent: cashbackPercent !== undefined ? Math.max(0, Math.min(100, Number(cashbackPercent) || 0)) : undefined,
        description: description !== undefined ? (description?.trim() || null) : undefined,
        websiteUrl: websiteUrl !== undefined ? (websiteUrl?.trim() || null) : undefined,
        phone: phone !== undefined ? (phone?.trim() || null) : undefined,
        isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      },
    })
    return success(updated)
  } catch (err) {
    console.error('Update discount club partner error:', err)
    return error('Failed to update partner', 500)
  }
}

// DELETE /api/discount-club/[id]  — admin only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!(await requireAdmin(userId))) return error('Unauthorized', 403)

    const existing = await prisma.discountClubPartner.findUnique({ where: { id } })
    if (!existing) return error('Partner not found', 404)

    await prisma.discountClubPartner.delete({ where: { id } })
    return success({ id, deleted: true })
  } catch (err) {
    console.error('Delete discount club partner error:', err)
    return error('Failed to delete partner', 500)
  }
}
