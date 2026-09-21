import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const VALID_STATUSES = ['active', 'redeemed', 'expired', 'disabled']

// DELETE /api/admin/vouchers/[id]?userId=X
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminId = req.nextUrl.searchParams.get('userId')
    if (!adminId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const voucher = await prisma.voucher.findUnique({ where: { id } })
    if (!voucher) return error('Voucher not found', 404)

    await prisma.voucher.delete({ where: { id } })

    return success({ message: 'Voucher deleted successfully', id })
  } catch (err) {
    console.error('Admin voucher DELETE error:', err)
    return error('Failed to delete voucher', 500)
  }
}

// PUT /api/admin/vouchers/[id] body { userId, status }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, status } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!status || !VALID_STATUSES.includes(status)) {
      return error(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400)
    }

    const voucher = await prisma.voucher.findUnique({ where: { id } })
    if (!voucher) return error('Voucher not found', 404)

    // Map abstract status -> schema fields (isUsed + usedAt + expiresAt)
    let data: Record<string, unknown> = {}
    if (status === 'redeemed') {
      data = { isUsed: true, usedAt: new Date() }
    } else if (status === 'active') {
      // Reactivate: clear isUsed + ensure expiresAt is in the future (or null)
      data = { isUsed: false, usedAt: null }
    } else if (status === 'expired') {
      // Force expire: set expiresAt to now if not already past
      data = { expiresAt: new Date() }
    } else if (status === 'disabled') {
      // Disabled = force expire + mark used so it can't be re-validated
      data = { isUsed: true, usedAt: new Date(), expiresAt: new Date() }
    }

    const updated = await prisma.voucher.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return success({
      id: updated.id,
      userId: updated.userId,
      userName: updated.user?.name || '—',
      userEmail: updated.user?.email || '',
      code: updated.code,
      type: updated.type,
      amount: updated.amount,
      status,
      isUsed: updated.isUsed,
      usedAt: updated.usedAt,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
    })
  } catch (err) {
    console.error('Admin voucher PUT error:', err)
    return error('Failed to update voucher', 500)
  }
}
