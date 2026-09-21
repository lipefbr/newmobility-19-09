import { NextRequest } from 'next/server'
import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Valid games and their reward/penalty config
const GAMES_CONFIG: Record<string, { winReward: number; lossPenalty: number; maxDailyPlays: number }> = {
  tic_tac_toe: { winReward: 10, lossPenalty: 3, maxDailyPlays: 30 },
  memory: { winReward: 15, lossPenalty: 5, maxDailyPlays: 30 },
  number_guess: { winReward: 8, lossPenalty: 2, maxDailyPlays: 30 },
  snake: { winReward: 0, lossPenalty: 0, maxDailyPlays: 50 }, // dynamic based on score
  coin_flip: { winReward: 5, lossPenalty: 5, maxDailyPlays: 50 },
  dice_roll: { winReward: 12, lossPenalty: 4, maxDailyPlays: 40 },
  slots: { winReward: 20, lossPenalty: 6, maxDailyPlays: 30 },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, game, result, score } = body as {
      userId: string
      game: string
      result: 'win' | 'loss' | 'draw'
      score?: number
    }

    if (!userId || !game || !result) {
      return error('userId, game e result são obrigatórios')
    }

    if (!['win', 'loss', 'draw'].includes(result)) {
      return error('result deve ser: win, loss ou draw')
    }

    const config = GAMES_CONFIG[game]
    if (!config) {
      return error('Jogo inválido. Jogos disponíveis: ' + Object.keys(GAMES_CONFIG).join(', '))
    }

    // Get user
    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('Usuário não encontrado', 404)
    }

    // Check daily play limit (count PointTransactions of type game_win/game_loss/game_draw today)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayPlays = await prisma.pointTransaction.count({
      where: {
        userId,
        type: { in: ['game_win', 'game_loss', 'game_draw'] },
        createdAt: { gte: todayStart },
      },
    })

    if (todayPlays >= config.maxDailyPlays) {
      return error(`Você atingiu o limite diário de ${config.maxDailyPlays} jogadas. Volte amanhã!`, 429)
    }

    // Calculate points delta
    let pointsDelta = 0
    let txType = 'game_draw'

    if (game === 'snake' && typeof score === 'number') {
      // Snake: award based on score (1 point per 10 score, max 50)
      pointsDelta = Math.min(50, Math.floor(score / 10))
      txType = pointsDelta > 0 ? 'game_win' : 'game_loss'
    } else if (result === 'win') {
      pointsDelta = config.winReward
      txType = 'game_win'
    } else if (result === 'loss') {
      // Don't let stars go negative
      pointsDelta = -Math.min(config.lossPenalty, user.stars)
      txType = 'game_loss'
    } else {
      // draw: small consolation
      pointsDelta = 1
      txType = 'game_draw'
    }

    // Update user stars
    const newStars = Math.max(0, user.stars + pointsDelta)
    await prisma.user.update({
      where: { id: userId },
      data: { stars: newStars },
    })

    // Create point transaction record
    const gameLabels: Record<string, string> = {
      tic_tac_toe: 'Jogo da Velha',
      memory: 'Jogo da Memória',
      number_guess: 'Adivinhação',
      snake: 'Cobra',
      coin_flip: 'Cara ou Coroa',
      dice_roll: 'Dados',
      slots: 'Caça-Níqueis',
    }

    const tx = await prisma.pointTransaction.create({
      data: {
        userId,
        amount: pointsDelta,
        type: txType,
        description: `${gameLabels[game] || game} - ${result === 'win' ? 'Vitória' : result === 'loss' ? 'Derrota' : 'Empate'}${score !== undefined ? ` (score: ${score})` : ''}`,
        referenceId: game,
      },
    })

    return success({
      pointsDelta,
      newStars,
      transactionId: tx.id,
      result,
      game,
    })
  } catch (err) {
    console.error('Games play error:', err)
    return error('Erro interno do servidor', 500)
  }
}
