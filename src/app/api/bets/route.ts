import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/bets - Place a bet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, eventId, eventLabel, selection, selectionLabel, odds, amountInCents } = body

    if (!userId || !eventId || !selection || !odds || !amountInCents) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: userId, eventId, selection, odds, amountInCents' },
        { status: 400 }
      )
    }

    if (amountInCents < 100) {
      return NextResponse.json(
        { error: 'Valor mínimo da aposta: R$ 1,00' },
        { status: 400 }
      )
    }

    if (odds < 1.01) {
      return NextResponse.json(
        { error: 'Odds inválidas' },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Block bets for free plan users (subscription not paid)
    if (user.plan === 'free' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Você precisa assinar um plano para apostar. Acesse "Meu Plano" para assinar.' },
        { status: 403 }
      )
    }

    // Check balance
    if (user.balanceFree < amountInCents) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Saldo livre: ${(user.balanceFree / 100).toFixed(2)}` },
        { status: 400 }
      )
    }

    const potentialWinInCents = Math.round(amountInCents * odds)

    // Deduct from balance and create bet in a transaction
    const [bet] = await prisma.$transaction([
      prisma.bet.create({
        data: {
          userId,
          eventId,
          eventLabel: eventLabel || eventId,
          selection,
          selectionLabel: selectionLabel || selection,
          odds,
          amountInCents,
          potentialWinInCents,
          status: 'pending',
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { balanceFree: { decrement: amountInCents } },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'bet',
          amount: -amountInCents,
          status: 'completed',
          category: 'sportbet',
          description: `Aposta: ${eventLabel || eventId} - ${selectionLabel || selection}`,
        },
      }),
    ])

    return NextResponse.json({
      bet: {
        id: bet.id,
        eventId: bet.eventId,
        eventLabel: bet.eventLabel,
        selection: bet.selection,
        selectionLabel: bet.selectionLabel,
        odds: bet.odds,
        amountInCents: bet.amountInCents,
        potentialWinInCents: bet.potentialWinInCents,
        status: bet.status,
        createdAt: bet.createdAt,
      },
      newBalanceFree: (user.balanceFree - amountInCents),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar aposta'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/bets?userId=xxx - Get user's bet history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    const where: Record<string, unknown> = { userId }
    if (status && status !== 'all') {
      where.status = status
    }

    const bets = await prisma.bet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const stats = await prisma.bet.aggregate({
      where: { userId },
      _sum: { amountInCents: true, potentialWinInCents: true },
      _count: true,
    })

    const wonCount = await prisma.bet.count({ where: { userId, status: 'won' } })
    const lostCount = await prisma.bet.count({ where: { userId, status: 'lost' } })
    const pendingCount = await prisma.bet.count({ where: { userId, status: 'pending' } })

    const wonTotal = await prisma.bet.aggregate({
      where: { userId, status: 'won' },
      _sum: { potentialWinInCents: true },
    })

    return NextResponse.json({
      bets: bets.map(b => ({
        id: b.id,
        eventId: b.eventId,
        eventLabel: b.eventLabel,
        selection: b.selection,
        selectionLabel: b.selectionLabel,
        odds: b.odds,
        amountInCents: b.amountInCents,
        potentialWinInCents: b.potentialWinInCents,
        status: b.status,
        result: b.result,
        settledAt: b.settledAt,
        createdAt: b.createdAt,
      })),
      stats: {
        total: stats._count,
        totalWagered: stats._sum.amountInCents || 0,
        totalPotentialWin: stats._sum.potentialWinInCents || 0,
        won: wonCount,
        lost: lostCount,
        pending: pendingCount,
        totalWon: wonTotal._sum.potentialWinInCents || 0,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar apostas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
