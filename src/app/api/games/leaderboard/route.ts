import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    if (!userId) {
      return error('userId é obrigatório')
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, stars: true, name: true, profileImage: true, plan: true },
    })

    if (!currentUser) {
      return error('Usuário não encontrado', 404)
    }

    // Get top users by stars
    const topUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        stars: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        profileImage: true,
        plan: true,
        stars: true,
      },
      orderBy: { stars: 'desc' },
      take: Math.min(limit, 100),
    })

    // Find current user's rank
    const usersWithMoreStars = await prisma.user.count({
      where: {
        isActive: true,
        stars: { gt: currentUser.stars },
      },
    })

    const myRank = usersWithMoreStars + 1

    const leaderboard = topUsers.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      profileImage: u.profileImage,
      plan: u.plan,
      stars: u.stars,
      isMe: u.id === userId,
    }))

    return success({
      leaderboard,
      myRank,
      myStars: currentUser.stars,
      totalPlayers: await prisma.user.count({ where: { isActive: true, stars: { gt: 0 } } }),
    })
  } catch (err) {
    console.error('Games leaderboard error:', err)
    return error('Erro interno do servidor', 500)
  }
}
