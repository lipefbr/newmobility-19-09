import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const adminUserId = req.nextUrl.searchParams.get('userId')
    if (!adminUserId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const search = req.nextUrl.searchParams.get('search') || ''
    const userIdFilter = req.nextUrl.searchParams.get('userIdFilter') || ''
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (userIdFilter) {
      where.userId = userIdFilter
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { cpf: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    let dependents: any[] = []
    let total = 0

    try {
      dependents = await prisma.beneficiary.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      })
    } catch (e) {
      console.error('Admin dependents findMany error:', e)
    }

    try {
      total = await prisma.beneficiary.count({ where })
    } catch (e) {
      console.error('Admin dependents count error:', e)
    }

    return success({
      dependents,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    return error('Failed to fetch dependents', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId: adminUserId, userId_target, name, cpf, relationship, percentage } = body

    if (!adminUserId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!userId_target) return error('userId_target is required', 400)
    if (!name) return error('name is required', 400)
    if (!relationship) return error('relationship is required', 400)

    const targetUser = await prisma.user.findUnique({ where: { id: userId_target } })
    if (!targetUser) return error('Target user not found', 404)

    const dependent = await prisma.beneficiary.create({
      data: {
        userId: userId_target,
        name,
        cpf: cpf || null,
        relationship,
        percentage: percentage || 100,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return success(dependent, 201)
  } catch (err) {
    return error('Failed to create dependent', 500)
  }
}
