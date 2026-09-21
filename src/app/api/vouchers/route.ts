import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { generateVoucherCode } from '@/lib/voucher'

/**
 * GET /api/vouchers?userId=...
 *
 * Returns the current user's vouchers, partitioned into active/used/expired
 * (based on isUsed + expiresAt). All amounts are integers (cents) and the
 * frontend renders them via `formatBRL()` — never send a pre-formatted
 * string, that breaks number math.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return error('User not found', 404)
    }

    const vouchers = await prisma.voucher.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const now = Date.now()
    const isExpired = (v: { isUsed: boolean; expiresAt: Date | null }) =>
      !v.isUsed && v.expiresAt ? v.expiresAt.getTime() < now : false

    const active = vouchers.filter((v) => !v.isUsed && !isExpired(v))
    const used = vouchers.filter((v) => v.isUsed)
    const expired = vouchers.filter((v) => !v.isUsed && isExpired(v))

    const safeAmount = (n: number | null | undefined): number =>
      typeof n === 'number' && !isNaN(n) && isFinite(n) ? n : 0

    const mapVoucher = (v: typeof vouchers[number]) => ({
      id: v.id,
      code: v.code,
      amount: safeAmount(v.amount),
      amountInCents: safeAmount(v.amount), // alias for backward-compat with admin-page.tsx
      type: v.type,
      isUsed: v.isUsed,
      usedAt: v.usedAt,
      expiresAt: v.expiresAt,
      createdAt: v.createdAt,
    })

    return success({
      active: active.map(mapVoucher),
      used: used.map(mapVoucher),
      expired: expired.map(mapVoucher),
      totalActive: active.reduce((sum, v) => sum + safeAmount(v.amount), 0),
      totalUsed: used.reduce((sum, v) => sum + safeAmount(v.amount), 0),
      totalExpired: expired.reduce((sum, v) => sum + safeAmount(v.amount), 0),
    })
  } catch (err) {
    console.error('Vouchers error:', err)
    return error('Internal server error', 500)
  }
}

/**
 * POST /api/vouchers — ADMIN ONLY
 *
 * Creates a voucher for a specific user. Used by the admin vouchers panel.
 *
 * Body: { userId, amount, type, expiresAt? }
 *   - userId: target user
 *   - amount: voucher amount in BRL cents (positive integer)
 *   - type: voucher type (mobility/food/pharmacy/shopping/gratification/
 *           paymentInvoice/signup_bonus/plan_bonus/...)
 *   - expiresAt?: optional ISO date — defaults to +90 days
 *
 * Auth is resolved via getSession (which reads userId from query/body) and
 * requires `role === 'admin'`. Writes an audit-log entry
 * (action: 'voucher_create').
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return error('Unauthorized', 401)
    }
    if (session.role !== 'admin') {
      return error('Forbidden — admin only', 403)
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return error('Invalid JSON body', 400)
    }
    const { userId, amount, type, expiresAt } = body as {
      userId?: string
      amount?: number
      type?: string
      expiresAt?: string
    }

    if (!userId || typeof userId !== 'string') {
      return error('userId is required', 400)
    }
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return error('amount must be a non-negative number (BRL cents)', 400)
    }
    if (!type || typeof type !== 'string') {
      return error('type is required', 400)
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
    if (!targetUser) {
      return error('Target user not found', 404)
    }

    // Resolve expiry — default +90 days, accept any parseable date.
    let expiryDate: Date
    if (expiresAt && typeof expiresAt === 'string') {
      const parsed = new Date(expiresAt)
      if (isNaN(parsed.getTime())) {
        return error('expiresAt must be a valid ISO date', 400)
      }
      expiryDate = parsed
    } else {
      expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    }

    // Generate a unique NM-XXXX-XXXX code (re-roll on collision, max 10 tries).
    let code = generateVoucherCode()
    for (let i = 0; i < 10; i++) {
      const existing = await prisma.voucher.findUnique({ where: { code } })
      if (!existing) break
      code = generateVoucherCode()
    }

    const created = await prisma.voucher.create({
      data: {
        userId,
        code,
        amount: Math.round(numericAmount),
        type,
        isUsed: false,
        expiresAt: expiryDate,
      },
    })

    await logAudit({
      adminId: session.userId,
      adminName: (session.user?.name as string | undefined) || null,
      action: 'voucher_create',
      targetUserId: userId,
      targetEmail: targetUser.email || null,
      details: `code=${code} amount=${created.amount} type=${type} expiresAt=${expiryDate.toISOString()}`,
      ipAddress: req.headers.get('x-forwarded-for') || null,
    })

    return success(
      {
        voucher: {
          id: created.id,
          code: created.code,
          amount: created.amount,
          amountInCents: created.amount,
          type: created.type,
          isUsed: created.isUsed,
          usedAt: created.usedAt,
          expiresAt: created.expiresAt,
          createdAt: created.createdAt,
        },
      },
      201
    )
  } catch (err) {
    console.error('Create voucher error:', err)
    return error('Internal server error', 500)
  }
}
