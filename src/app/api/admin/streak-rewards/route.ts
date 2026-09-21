import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const DEFAULT_STREAK_REWARDS = [
  { streakDays: 7, rewardType: 'points', rewardAmount: 10, description: 'Sequência de 7 dias consecutivos.' },
  { streakDays: 14, rewardType: 'points', rewardAmount: 25, description: 'Sequência de 14 dias consecutivos.' },
  { streakDays: 30, rewardType: 'points', rewardAmount: 100, description: 'Sequência de 30 dias consecutivos.' },
  { streakDays: 60, rewardType: 'points', rewardAmount: 500, description: 'Sequência de 60 dias consecutivos.' },
  { streakDays: 90, rewardType: 'points', rewardAmount: 1000, description: 'Sequência de 90 dias consecutivos.' },
]

async function seedDefaultStreakRewardsIfEmpty() {
  const count = await prisma.streakReward.count()
  if (count > 0) return
  for (const s of DEFAULT_STREAK_REWARDS) {
    await prisma.streakReward.create({ data: s })
  }
}

// GET — list all streak rewards
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    await seedDefaultStreakRewardsIfEmpty()

    const rewards = await prisma.streakReward.findMany({
      orderBy: [{ streakDays: 'asc' }],
    })

    return success({ rewards })
  } catch (err) {
    console.error('Admin streak-rewards GET error:', err)
    return error('Failed to fetch streak rewards', 500)
  }
}

// POST — create a new streak reward
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      streakDays,
      rewardType = 'points',
      rewardAmount = 0,
      description,
      isActive = true,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (streakDays === undefined || Number(streakDays) <= 0) {
      return error('streakDays deve ser um número positivo', 400)
    }

    const existing = await prisma.streakReward.findUnique({ where: { streakDays: Number(streakDays) } })
    if (existing) return error('Já existe uma recompensa para esta quantidade de dias', 400)

    const created = await prisma.streakReward.create({
      data: {
        streakDays: Number(streakDays),
        rewardType: rewardType || 'points',
        rewardAmount: Number(rewardAmount) || 0,
        description: description || null,
        isActive: Boolean(isActive),
      },
    })

    return success(created, 201)
  } catch (err) {
    console.error('Admin streak-rewards POST error:', err)
    return error('Failed to create streak reward', 500)
  }
}
