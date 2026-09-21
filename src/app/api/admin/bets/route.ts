import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// GET /api/admin/bets - list all bets with user info + stats
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const status = req.nextUrl.searchParams.get('status') || 'all'
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status !== 'all') where.status = status

    let bets: any[] = []
    try {
      bets = await prisma.bet.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      })
    } catch (e) {
      console.error('Admin bets findMany error:', e)
    }

    const formatted = bets.map((b: any) => ({
      id: b.id,
      userId: b.userId,
      userName: b.user?.name || '—',
      userEmail: b.user?.email || '',
      eventId: b.eventId,
      eventLabel: b.eventLabel,
      selection: b.selection,
      selectionLabel: b.selectionLabel,
      odds: b.odds,
      amountInCents: b.amountInCents,
      potentialPayoutInCents: b.potentialWinInCents, // map to spec field name
      potentialWinInCents: b.potentialWinInCents,
      status: b.status,
      result: b.result,
      createdAt: b.createdAt,
      settledAt: b.settledAt,
    }))

    // Stats
    let totalBets = 0
    let pendingBets = 0
    let wonBets = 0
    let lostBets = 0
    let totalStaked = 0
    let totalPaid = 0

    try {
      totalBets = await prisma.bet.count({})
    } catch (e) {
      console.error('Admin bets count error:', e)
    }
    try {
      pendingBets = await prisma.bet.count({ where: { status: 'pending' } })
    } catch (e) {
      console.error('Admin bets pending count error:', e)
    }
    try {
      wonBets = await prisma.bet.count({ where: { status: 'won' } })
    } catch (e) {
      console.error('Admin bets won count error:', e)
    }
    try {
      lostBets = await prisma.bet.count({ where: { status: 'lost' } })
    } catch (e) {
      console.error('Admin bets lost count error:', e)
    }
    try {
      const staked = await prisma.bet.aggregate({
        _sum: { amountInCents: true },
        where: { status: { in: ['pending', 'won', 'lost'] } },
      })
      totalStaked = staked._sum.amountInCents || 0
    } catch (e) {
      console.error('Admin bets staked aggregate error:', e)
    }
    try {
      const paid = await prisma.bet.aggregate({
        _sum: { potentialWinInCents: true },
        where: { status: 'won' },
      })
      totalPaid = paid._sum.potentialWinInCents || 0
    } catch (e) {
      console.error('Admin bets paid aggregate error:', e)
    }

    let total = 0
    try {
      total = await prisma.bet.count({ where })
    } catch (e) {
      console.error('Admin bets total count error:', e)
    }

    return success({
      bets: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalBets,
        pendingBets,
        wonBets,
        lostBets,
        totalStaked,
        totalPaid,
      },
    })
  } catch (err) {
    console.error('Admin bets GET error:', err)
    return error('Failed to fetch bets', 500)
  }
}
