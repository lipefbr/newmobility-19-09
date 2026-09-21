import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const DEFAULT_CHALLENGES = [
  { title: 'Indicar 1 Amigo', description: 'Faça sua primeira indicação', type: 'weekly', targetValue: 1, rewardPoints: 20 },
  { title: '3 Indicações na Semana', description: 'Indique 3 amigos esta semana', type: 'weekly', targetValue: 3, rewardPoints: 50 },
  { title: 'Primeiro Saque', description: 'Solicite seu primeiro saque', type: 'weekly', targetValue: 1, rewardPoints: 30 },
  { title: 'Ativo por 7 Dias', description: 'Faça login por 7 dias seguidos', type: 'weekly', targetValue: 7, rewardPoints: 40 },
  { title: 'Comprar Voucher', description: 'Compre um voucher esta semana', type: 'weekly', targetValue: 1, rewardPoints: 15 },
  { title: '10 Indicações Mensais', description: 'Indique 10 amigos este mês', type: 'monthly', targetValue: 10, rewardPoints: 200 },
  { title: 'R$ 500 em CashBack', description: 'Acumule R$ 500 em CashBack', type: 'monthly', targetValue: 500, rewardPoints: 100 },
]

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')

    // Ensure challenges exist
    const existing = await db.count('Challenge')
    if (existing === 0) {
      for (const c of DEFAULT_CHALLENGES) {
        await db.insert('Challenge', { ...c, isActive: true })
      }
    }

    const challenges = await db.find(
      'Challenge',
      '"isActive" = true',
      [],
      'ORDER BY type ASC, "rewardPoints" ASC'
    ) as any[]

    let userChallenges: { challengeId: string; currentValue: number; completed: boolean }[] = []

    if (userId) {
      userChallenges = await db.find(
        'UserChallenge',
        '"userId" = $1',
        [userId]
      ) as any[]
    }

    const challengesWithProgress = challenges.map(c => {
      const uc = userChallenges.find(uc => uc.challengeId === c.id)
      return {
        ...c,
        currentValue: uc?.currentValue || 0,
        completed: uc?.completed || false,
        progress: c.targetValue > 0 ? Math.min(((uc?.currentValue || 0) / c.targetValue) * 100, 100) : 0,
      }
    })

    return success({ challenges: challengesWithProgress })
  } catch (err) {
    return error('Failed to fetch challenges', 500)
  }
}
