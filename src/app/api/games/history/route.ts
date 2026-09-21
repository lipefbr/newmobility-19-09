import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const game = url.searchParams.get('game') // optional filter

    if (!userId) {
      return error('userId é obrigatório')
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, stars: true },
    })

    if (!user) {
      return error('Usuário não encontrado', 404)
    }

    // Get game transactions
    const where: any = {
      userId,
      type: { in: ['game_win', 'game_loss', 'game_draw'] },
    }
    if (game) {
      where.referenceId = game
    }

    const transactions = await prisma.pointTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    })

    // Compute stats
    const stats = {
      totalPlays: transactions.length,
      wins: transactions.filter((t) => t.type === 'game_win').length,
      losses: transactions.filter((t) => t.type === 'game_loss').length,
      draws: transactions.filter((t) => t.type === 'game_draw').length,
      totalEarned: transactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0),
      totalLost: Math.abs(
        transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
      ),
      currentStars: user.stars,
    }

    // Per-game stats
    const perGame: Record<string, { plays: number; wins: number; netPoints: number }> = {}
    for (const t of transactions) {
      const g = t.referenceId || 'unknown'
      if (!perGame[g]) perGame[g] = { plays: 0, wins: 0, netPoints: 0 }
      perGame[g].plays++
      if (t.type === 'game_win') perGame[g].wins++
      perGame[g].netPoints += t.amount
    }

    return success({
      history: transactions,
      stats,
      perGame,
    })
  } catch (err) {
    console.error('Games history error:', err)
    return error('Erro interno do servidor', 500)
  }
}
