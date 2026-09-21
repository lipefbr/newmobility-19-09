import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/bets/[betId]/settle - Settle a bet (win/lose)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ betId: string }> }
) {
  try {
    const { betId } = await params
    const body = await request.json()
    const { result, userId } = body

    if (!result || !['won', 'lost'].includes(result)) {
      return NextResponse.json(
        { error: 'Resultado deve ser "won" ou "lost"' },
        { status: 400 }
      )
    }

    // Get the bet
    const bet = await prisma.bet.findUnique({ where: { id: betId } })
    if (!bet) {
      return NextResponse.json({ error: 'Aposta não encontrada' }, { status: 404 })
    }

    if (bet.status !== 'pending') {
      return NextResponse.json(
        { error: `Aposta já foi resolvida com status: ${bet.status}` },
        { status: 400 }
      )
    }

    if (userId && bet.userId !== userId) {
      return NextResponse.json({ error: 'Aposta não pertence a este usuário' }, { status: 403 })
    }

    const now = new Date()

    if (result === 'won') {
      // Credit winnings to user balanceFree
      const winAmount = bet.potentialWinInCents
      await prisma.$transaction([
        prisma.bet.update({
          where: { id: betId },
          data: { status: 'won', result: 'won', settledAt: now },
        }),
        prisma.user.update({
          where: { id: bet.userId },
          data: { balanceFree: { increment: winAmount } },
        }),
        prisma.transaction.create({
          data: {
            userId: bet.userId,
            type: 'bet_win',
            amount: winAmount,
            status: 'completed',
            category: 'sportbet',
            description: `Aposta ganha: ${bet.eventLabel} - ${bet.selectionLabel}`,
          },
        }),
      ])

      const user = await prisma.user.findUnique({ where: { id: bet.userId } })

      return NextResponse.json({
        bet: { id: betId, status: 'won', result: 'won', settledAt: now },
        winnings: winAmount,
        newBalanceFree: user?.balanceFree || 0,
      })
    } else {
      // Lost - money was already deducted, just update status
      // 5% cashback on lost bets
      const cashbackAmount = Math.round(bet.amountInCents * 0.05)

      await prisma.$transaction([
        prisma.bet.update({
          where: { id: betId },
          data: { status: 'lost', result: 'lost', settledAt: now },
        }),
        prisma.user.update({
          where: { id: bet.userId },
          data: { balanceFree: { increment: cashbackAmount } },
        }),
        prisma.transaction.create({
          data: {
            userId: bet.userId,
            type: 'bet_loss',
            amount: -bet.amountInCents,
            status: 'completed',
            category: 'sportbet',
            description: `Aposta perdida: ${bet.eventLabel} - ${bet.selectionLabel}`,
          },
        }),
        ...(cashbackAmount > 0
          ? [prisma.transaction.create({
              data: {
                userId: bet.userId,
                type: 'cashback_bet',
                amount: cashbackAmount,
                status: 'completed',
                category: 'sportbet_cashback',
                description: `CashBack 5% aposta: ${bet.eventLabel}`,
              },
            })]
          : []),
      ])

      const user = await prisma.user.findUnique({ where: { id: bet.userId } })

      return NextResponse.json({
        bet: { id: betId, status: 'lost', result: 'lost', settledAt: now },
        cashback: cashbackAmount,
        newBalanceFree: user?.balanceFree || 0,
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao resolver aposta'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
