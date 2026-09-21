import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * POST /api/vouchers/[id]/redeem
 *
 * Redeems a voucher by its database ID (as opposed to /api/vouchers/redeem
 * which redeems by code). Marks the voucher as used (isUsed=true, usedAt=now)
 * and credits the voucher amount to the user's `balanceShopping` wallet
 * (cashback shopping wallet — non-withdrawable per client spec §7).
 *
 * Body: { userId } — the caller's userId (resolved via getSession for auth).
 *
 * Returns the new shopping balance on success.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req)
    if (!session) {
      return error('Unauthorized', 401)
    }

    const { id: voucherId } = await params
    if (!voucherId) {
      return error('voucher id is required', 400)
    }

    const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } })
    if (!voucher) {
      return error('Voucher não encontrado.', 404)
    }

    // Ownership: only the voucher owner can redeem their own voucher.
    if (voucher.userId !== session.userId) {
      return error('Forbidden: voucher does not belong to caller.', 403)
    }

    if (voucher.isUsed) {
      return error('Este voucher já foi utilizado.', 400)
    }

    if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
      return error('Este voucher está expirado.', 400)
    }

    const safeAmount =
      typeof voucher.amount === 'number' && !isNaN(voucher.amount)
        ? voucher.amount
        : 0

    // Mark voucher as used + credit balanceShopping in a single transaction.
    const [updatedVoucher, updatedUser] = await prisma.$transaction([
      prisma.voucher.update({
        where: { id: voucher.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: voucher.userId },
        data: {
          balanceShopping: { increment: safeAmount },
        },
        select: {
          id: true,
          balanceShopping: true,
          balanceWithdrawal: true,
          balanceMobility: true,
          balanceFood: true,
          balancePharmacy: true,
          balanceGratification: true,
          balancePaymentInvoice: true,
        },
      }),
    ])

    // Best-effort transaction log — never fails the parent flow.
    try {
      await prisma.transaction.create({
        data: {
          userId: voucher.userId,
          type: 'voucher_redeem',
          category: voucher.type || 'voucher',
          amount: safeAmount,
          status: 'approved',
          description: `Voucher resgatado: ${voucher.code}`,
        },
      })
    } catch (txErr) {
      console.error('Failed to create voucher redeem transaction record:', txErr)
    }

    return success({
      voucher: {
        id: updatedVoucher.id,
        code: updatedVoucher.code,
        amount: updatedVoucher.amount,
        type: updatedVoucher.type,
        usedAt: updatedVoucher.usedAt,
      },
      creditedAmount: safeAmount,
      balanceField: 'balanceShopping',
      balanceName: 'Saldo Compras',
      newBalance: updatedUser.balanceShopping,
      user: {
        id: updatedUser.id,
        balanceShopping: updatedUser.balanceShopping,
        balanceWithdrawal: updatedUser.balanceWithdrawal,
        balanceMobility: updatedUser.balanceMobility,
        balanceFood: updatedUser.balanceFood,
        balancePharmacy: updatedUser.balancePharmacy,
        balanceGratification: updatedUser.balanceGratification,
        balancePaymentInvoice: updatedUser.balancePaymentInvoice,
      },
    })
  } catch (err) {
    console.error('Voucher redeem-by-id error:', err)
    return error('Failed to redeem voucher', 500)
  }
}
