import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const adminUserId = req.nextUrl.searchParams.get('userId')
    if (!adminUserId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const type = req.nextUrl.searchParams.get('type') || undefined
    const status = req.nextUrl.searchParams.get('status') || undefined
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (type) where.type = type

    const validStatuses = ['pending', 'approved', 'rejected', 'paid']
    if (status && validStatuses.includes(status)) {
      where.status = status
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
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
      }),
      prisma.transaction.count({ where }),
    ])

    return success({
      payments: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    return error('Failed to fetch payments', 500)
  }
}
