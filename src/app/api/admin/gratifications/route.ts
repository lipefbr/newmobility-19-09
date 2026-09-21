import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const adminUserId = req.nextUrl.searchParams.get('userId')
    if (!adminUserId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const filterUserId = req.nextUrl.searchParams.get('filterUserId') || undefined
    const type = req.nextUrl.searchParams.get('type') || undefined
    const isClaimedStr = req.nextUrl.searchParams.get('isClaimed')
    const isClaimed = isClaimedStr !== null ? isClaimedStr === 'true' : undefined
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = 20

    const where: Record<string, unknown> = {}
    if (filterUserId) where.userId = filterUserId
    if (type) where.type = type
    if (isClaimed !== undefined) where.isClaimed = isClaimed

    let gratifications: any[] = []
    let total = 0

    try {
      gratifications = await prisma.gratification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      })
    } catch (e) {
      console.error('Admin gratifications findMany error:', e)
    }

    try {
      total = await prisma.gratification.count({ where })
    } catch (e) {
      console.error('Admin gratifications count error:', e)
    }

    return success({
      gratifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('Admin gratifications GET error:', err)
    return error('Failed to fetch gratifications', 500)
  }
}
