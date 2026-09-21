import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// PUT /api/admin/bets/[id] body { userId, result: 'won' | 'lost' }
// Settle a bet: if 'won', credit potentialWinInCents to user's balanceWithdrawal.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, result } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!result || !['won', 'lost'].includes(result)) {
      return error('result must be "won" or "lost"', 400)
    }

    const bet = await prisma.bet.findUnique({ where: { id } })
    if (!bet) return error('Bet not found', 404)

    if (bet.status !== 'pending') {
      return error(`Bet already settled with status: ${bet.status}`, 400)
    }

    const now = new Date()

    if (result === 'won') {
      const payout = bet.potentialWinInCents
      await prisma.$transaction([
        prisma.bet.update({
          where: { id },
          data: { status: 'won', result: 'won', settledAt: now },
        }),
        prisma.user.update({
          where: { id: bet.userId },
          data: { balanceWithdrawal: { increment: payout } },
        }),
        prisma.transaction.create({
          data: {
            userId: bet.userId,
            type: 'bet_win',
            amount: payout,
            status: 'approved',
            category: 'sportbet',
            description: `[Admin] Aposta ganha: ${bet.eventLabel} - ${bet.selectionLabel}`,
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
          status: 'won',
          result: 'won',
          settledAt: now,
        },
        payout,
        newBalanceWithdrawal: updatedUser?.balanceWithdrawal ?? 0,
      })
    } else {
      // lost: update status only (stake was already deducted at placement)
      await prisma.$transaction([
        prisma.bet.update({
          where: { id },
          data: { status: 'lost', result: 'lost', settledAt: now },
        }),
        prisma.transaction.create({
          data: {
            userId: bet.userId,
            type: 'bet_loss',
            amount: -bet.amountInCents,
            status: 'approved',
            category: 'sportbet',
            description: `[Admin] Aposta perdida: ${bet.eventLabel} - ${bet.selectionLabel}`,
          },
        }),
      ])

      return success({
        bet: {
          id,
          status: 'lost',
          result: 'lost',
          settledAt: now,
        },
      })
    }
  } catch (err) {
    console.error('Admin bet settle PUT error:', err)
    return error('Failed to settle bet', 500)
  }
}
