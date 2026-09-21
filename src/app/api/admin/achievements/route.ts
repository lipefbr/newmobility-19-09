import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const DEFAULT_ACHIEVEMENTS = [
  { code: 'first_referral', name: 'Primeira Indicação', description: 'Indique seu primeiro usuário para a plataforma.', icon: '🎯', category: 'referral', pointsReward: 50, targetValue: 1, sortOrder: 1 },
  { code: '10_referrals', name: 'Indicador Bronze', description: 'Alcance 10 indicações ativas.', icon: '🥉', category: 'referral', pointsReward: 200, targetValue: 10, sortOrder: 2 },
  { code: '100_referrals', name: 'Indicador Diamante', description: 'Alcance 100 indicações ativas.', icon: '💎', category: 'referral', pointsReward: 2000, targetValue: 100, sortOrder: 3 },
  { code: 'first_withdrawal', name: 'Primeiro Saque', description: 'Realize seu primeiro saque na plataforma.', icon: '💰', category: 'financial', pointsReward: 30, targetValue: 1, sortOrder: 10 },
  { code: 'plan_upgrade', name: 'Upgrade de Plano', description: 'Faça upgrade para um plano superior.', icon: '⬆️', category: 'plan', pointsReward: 100, targetValue: 1, sortOrder: 20 },
  { code: 'first_bet', name: 'Primeira Aposta', description: 'Faça sua primeira aposta nos jogos.', icon: '🎲', category: 'gaming', pointsReward: 20, targetValue: 1, sortOrder: 30 },
  { code: 'bet_streak_7', name: 'Apostador Frequente', description: 'Aposte por 7 dias seguidos.', icon: '🔥', category: 'gaming', pointsReward: 150, targetValue: 7, sortOrder: 31 },
  { code: 'first_game_win', name: 'Primeira Vitória', description: 'Vença seu primeiro jogo.', icon: '🏆', category: 'gaming', pointsReward: 25, targetValue: 1, sortOrder: 32 },
  { code: 'streak_30', name: 'Mês de Acesso', description: 'Acesse a plataforma por 30 dias seguidos.', icon: '📅', category: 'engagement', pointsReward: 300, targetValue: 30, sortOrder: 40 },
  { code: 'career_silver', name: 'Carreira Prata', description: 'Alcance o rank Prata no plano de carreira.', icon: '🥈', category: 'career', pointsReward: 100, targetValue: 1, sortOrder: 50 },
]

async function seedDefaultAchievementsIfEmpty() {
  const count = await prisma.achievement.count()
  if (count > 0) return
  for (const a of DEFAULT_ACHIEVEMENTS) {
    await prisma.achievement.create({ data: a })
  }
}

// GET — list all achievements
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    await seedDefaultAchievementsIfEmpty()

    const achievements = await prisma.achievement.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return success({ achievements })
  } catch (err) {
    console.error('Admin achievements GET error:', err)
    return error('Failed to fetch achievements', 500)
  }
}

// POST — create a new achievement
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      code,
      name,
      description,
      icon,
      category = 'general',
      pointsReward = 0,
      targetValue = 1,
      isActive = true,
      sortOrder = 99,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!code || !name) return error('code and name are required', 400)

    const existing = await prisma.achievement.findUnique({ where: { code } })
    if (existing) return error('Já existe uma conquista com este código', 400)

    const created = await prisma.achievement.create({
      data: {
        code,
        name,
        description: description || null,
        icon: icon || null,
        category: category || 'general',
        pointsReward: Number(pointsReward) || 0,
        targetValue: Number(targetValue) || 1,
        isActive: Boolean(isActive),
        sortOrder: Number(sortOrder) || 0,
      },
    })

    return success(created, 201)
  } catch (err) {
    console.error('Admin achievements POST error:', err)
    return error('Failed to create achievement', 500)
  }
}
