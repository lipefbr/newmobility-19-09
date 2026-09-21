import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// POST /api/admin/bets/[id]/cancel body { userId, reason? }
// Cancel a pending bet and refund the stake to user's balanceWithdrawal.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const userId = body.userId
    const reason = typeof body.reason === 'string' ? body.reason : ''

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const bet = await prisma.bet.findUnique({ where: { id } })
    if (!bet) return error('Bet not found', 404)

    if (bet.status !== 'pending') {
      return error(`Only pending bets can be cancelled (current: ${bet.status})`, 400)
    }

    const refundAmount = bet.amountInCents
    const now = new Date()
    const note = reason ? ` — ${reason}` : ''

    await prisma.$transaction([
      prisma.bet.update({
        where: { id },
        data: { status: 'cancelled', result: 'cancelled', settledAt: now },
      }),
      prisma.user.update({
        where: { id: bet.userId },
        data: { balanceWithdrawal: { increment: refundAmount } },
      }),
      prisma.transaction.create({
        data: {
          userId: bet.userId,
          type: 'bet_refund',
          amount: refundAmount,
          status: 'approved',
          category: 'sportbet',
          description: `[Admin] Reembolso de aposta cancelada: ${bet.eventLabel}${note}`,
        },
      }),
    ])

    const updatedUser = await prisma.user.findUnique({
      where: { id: bet.userId },
      select: { balanceWithdrawal: true },
    })

    return success({
      bet: {
        id,
        status: 'cancelled',
        result: 'cancelled',
        settledAt: now,
      },
      refund: refundAmount,
      newBalanceWithdrawal: updatedUser?.balanceWithdrawal ?? 0,
    })
  } catch (err) {
    console.error('Admin bet cancel POST error:', err)
    return error('Failed to cancel bet', 500)
  }
}
