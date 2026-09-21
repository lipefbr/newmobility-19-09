import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { generateVoucherForUser, VOUCHER_TYPE_SIGNUP_BONUS } from '@/lib/voucher'

/**
 * Welcome / signup-bonus voucher endpoint.
 *
 * GET  /api/voucher/generate-signup-bonus?userId=...
 *   Returns the user's existing UNUSED signup_bonus voucher, or `null` if
 *   they don't have one yet (or it has already been redeemed). The frontend
 *   uses this to render the "Voucher de Boas-Vindas" banner: if a voucher
 *   is returned, the banner shows the code + "Copiar" + "Aplicar" buttons;
 *   otherwise it offers a "Resgatar Agora" button that hits POST below.
 *
 * POST /api/voucher/generate-signup-bonus
 *   Body: { userId }
 *   Idempotent: if the user already has an unused signup_bonus voucher, it
 *   is returned as-is. Otherwise a fresh one is created via
 *   `generateVoucherForUser(userId, userType, { type: 'signup_bonus' })`
 *   which sizes the amount to the user's current `userType`
 *   (gratuito=R$5, usuario=R$10, motorista=R$20, ...). Amounts are in BRL
 *   cents.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required', 400)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, userType: true },
    })
    if (!user) {
      return error('User not found', 404)
    }

    const existing = await prisma.voucher.findFirst({
      where: {
        userId,
        type: VOUCHER_TYPE_SIGNUP_BONUS,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!existing) {
      return success({ voucher: null })
    }

    return success({
      voucher: {
        id: existing.id,
        code: existing.code,
        amount: existing.amount,
        type: existing.type,
        isUsed: existing.isUsed,
        expiresAt: existing.expiresAt,
        createdAt: existing.createdAt,
      },
    })
  } catch (err) {
    console.error('Get signup-bonus voucher error:', err)
    return error('Internal server error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return error('Invalid JSON body', 400)
    }
    const { userId } = body as { userId?: string }

    if (!userId || typeof userId !== 'string') {
      return error('userId is required', 400)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, userType: true, name: true, email: true },
    })
    if (!user) {
      return error('User not found', 404)
    }

    // Idempotent: if the user already has an UNUSED signup_bonus voucher,
    // return it instead of creating a duplicate. This protects against the
    // user double-clicking "Resgatar Agora" or refreshing mid-request.
    const existing = await prisma.voucher.findFirst({
      where: {
        userId,
        type: VOUCHER_TYPE_SIGNUP_BONUS,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      return success({
        voucher: {
          id: existing.id,
          code: existing.code,
          amount: existing.amount,
          type: existing.type,
          isUsed: existing.isUsed,
          expiresAt: existing.expiresAt,
          createdAt: existing.createdAt,
        },
        created: false,
      })
    }

    // Generate a fresh signup_bonus voucher sized to the user's current
    // userType (gratuito=R$5, usuario=R$10, motorista=R$20, ...).
    const created = await generateVoucherForUser(
      userId,
      user.userType || 'gratuito',
      { type: VOUCHER_TYPE_SIGNUP_BONUS }
    )

    // Reload the full row so we can return expiresAt/createdAt alongside
    // the code+amount that generateVoucherForUser already produced.
    const row = await prisma.voucher.findUnique({ where: { id: created.voucherId } })

    return success(
      {
        voucher: {
          id: created.voucherId,
          code: created.code,
          amount: created.amount,
          type: VOUCHER_TYPE_SIGNUP_BONUS,
          isUsed: false,
          expiresAt: row?.expiresAt ?? null,
          createdAt: row?.createdAt ?? new Date(),
        },
        created: true,
      },
      201
    )
  } catch (err) {
    console.error('Create signup-bonus voucher error:', err)
    return error('Internal server error', 500)
  }
}
