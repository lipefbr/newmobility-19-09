import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Default game configs - seed for existing games in /components/newmobility/games/games-page.tsx
const DEFAULT_GAME_CONFIGS = [
  {
    gameCode: 'tictactoe',
    name: 'Jogo da Velha',
    description: 'Desafie a inteligência artificial no clássico jogo da velha.',
    pointsPerWin: 10,
    pointsPerPlay: 1,
    cashbackPerWin: 0,
    minBetCents: 0,
    maxPlaysPerDay: 20,
  },
  {
    gameCode: 'memory',
    name: 'Jogo da Memória',
    description: 'Encontre todos os pares de emojis no menor tempo possível.',
    pointsPerWin: 15,
    pointsPerPlay: 2,
    cashbackPerWin: 0,
    minBetCents: 0,
    maxPlaysPerDay: 20,
  },
  {
    gameCode: 'number_guess',
    name: 'Adivinhação',
    description: 'Adivinhe o número secreto com dicas de temperatura.',
    pointsPerWin: 12,
    pointsPerPlay: 1,
    cashbackPerWin: 0,
    minBetCents: 0,
    maxPlaysPerDay: 15,
  },
  {
    gameCode: 'snake',
    name: 'Cobra',
    description: 'Controle a cobra e coma o máximo que puder.',
    pointsPerWin: 20,
    pointsPerPlay: 2,
    cashbackPerWin: 0,
    minBetCents: 0,
    maxPlaysPerDay: 15,
  },
  {
    gameCode: 'sports_betting',
    name: 'Apostas Esportivas',
    description: 'Apostas em eventos esportivos com odds dinâmicas.',
    pointsPerWin: 25,
    pointsPerPlay: 0,
    cashbackPerWin: 5,
    minBetCents: 100,
    maxPlaysPerDay: 50,
  },
]

async function seedDefaultGameConfigsIfEmpty() {
  const count = await prisma.gameConfig.count()
  if (count > 0) return
  for (const g of DEFAULT_GAME_CONFIGS) {
    await prisma.gameConfig.create({ data: g })
  }
}

// GET — list all game configs
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    await seedDefaultGameConfigsIfEmpty()

    const configs = await prisma.gameConfig.findMany({
      orderBy: [{ createdAt: 'asc' }],
    })

    return success({ configs })
  } catch (err) {
    console.error('Admin game-config GET error:', err)
    return error('Failed to fetch game configs', 500)
  }
}

// POST — create a new game config
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      gameCode,
      name,
      description,
      pointsPerWin = 0,
      pointsPerPlay = 0,
      cashbackPerWin = 0,
      minBetCents = 0,
      maxPlaysPerDay = 10,
      isActive = true,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!gameCode || !name) return error('gameCode and name are required', 400)

    const existing = await prisma.gameConfig.findUnique({ where: { gameCode } })
    if (existing) return error('Já existe uma configuração com este gameCode', 400)

    const created = await prisma.gameConfig.create({
      data: {
        gameCode,
        name,
        description: description || null,
        pointsPerWin: Number(pointsPerWin) || 0,
        pointsPerPlay: Number(pointsPerPlay) || 0,
        cashbackPerWin: Number(cashbackPerWin) || 0,
        minBetCents: Number(minBetCents) || 0,
        maxPlaysPerDay: Number(maxPlaysPerDay) || 0,
        isActive: Boolean(isActive),
      },
    })

    return success(created, 201)
  } catch (err) {
    console.error('Admin game-config POST error:', err)
    return error('Failed to create game config', 500)
  }
}
