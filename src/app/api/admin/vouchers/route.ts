import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const VALID_TYPES = ['mobility', 'food', 'pharmacy', 'shopping', 'gratification', 'withdrawal', 'cashback']

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const block = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `VOUCHER-${block(4)}-${block(4)}`
}

// Derive a status string from voucher fields
function deriveStatus(v: {
  isUsed: boolean
  expiresAt: Date | null
  now?: Date
}): string {
  const now = v.now ?? new Date()
  if (v.isUsed) return 'redeemed'
  if (v.expiresAt && v.expiresAt.getTime() < now.getTime()) return 'expired'
  return 'active'
}

// GET /api/admin/vouchers - list all vouchers with user info
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const status = req.nextUrl.searchParams.get('status') || 'all'
    const type = req.nextUrl.searchParams.get('type') || 'all'
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (type !== 'all') where.type = type

    let vouchers: any[] = []
    try {
      vouchers = await prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      })
    } catch (e) {
      console.error('Admin vouchers findMany error:', e)
    }

    const now = new Date()
    let formatted = vouchers.map((v: any) => ({
      id: v.id,
      userId: v.userId,
      userName: v.user?.name || '—',
      userEmail: v.user?.email || '',
      code: v.code,
      type: v.type,
      amount: v.amount,
      status: deriveStatus({ isUsed: v.isUsed, expiresAt: v.expiresAt, now }),
      isUsed: v.isUsed,
      usedAt: v.usedAt,
      expiresAt: v.expiresAt,
      createdAt: v.createdAt,
    }))

    if (status !== 'all') {
      formatted = formatted.filter((v) => v.status === status)
    }

    let total = 0
    try {
      total = await prisma.voucher.count({ where })
    } catch (e) {
      console.error('Admin vouchers count error:', e)
    }

    return success({
      vouchers: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('Admin vouchers GET error:', err)
    return error('Failed to fetch vouchers', 500)
  }
}

// POST /api/admin/vouchers - create a voucher
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, targetUserId, code, type, amount, description, expiresAt } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!type || !VALID_TYPES.includes(type)) {
      return error(`type must be one of: ${VALID_TYPES.join(', ')}`, 400)
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return error('amount must be a positive number (in cents)', 400)
    }

    let ownerUserId: string
    if (targetUserId) {
      const target = await prisma.user.findUnique({ where: { id: targetUserId } })
      if (!target) return error('Target user not found', 404)
      ownerUserId = targetUserId
    } else {
      // Generic voucher — assign to admin so FK is satisfied.
      ownerUserId = userId
    }

    let finalCode = (code || '').trim().toUpperCase()
    if (!finalCode) {
      finalCode = generateVoucherCode()
      let tries = 0
      while (tries < 5) {
        const existing = await prisma.voucher.findUnique({ where: { code: finalCode } })
        if (!existing) break
        finalCode = generateVoucherCode()
        tries++
      }
    } else {
      const existing = await prisma.voucher.findUnique({ where: { code: finalCode } })
      if (existing) return error('Voucher code already exists', 400)
    }

    const created = await prisma.voucher.create({
      data: {
        userId: ownerUserId,
        code: finalCode,
        type,
        amount,
        isUsed: false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return success(
      {
        id: created.id,
        userId: created.userId,
        userName: created.user?.name || '—',
        userEmail: created.user?.email || '',
        code: created.code,
        type: created.type,
        amount: created.amount,
        status: 'active',
        description: description || null,
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
      },
      201
    )
  } catch (err) {
    console.error('Admin vouchers POST error:', err)
    return error('Failed to create voucher', 500)
  }
}
