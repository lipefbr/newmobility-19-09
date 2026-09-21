import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const search = req.nextUrl.searchParams.get('search') || ''
    const plan = req.nextUrl.searchParams.get('plan') || 'all'
    const status = req.nextUrl.searchParams.get('status') || 'all'
    // Bug #7 fix (Task 18-C): the admin panel sends a `userType` filter but
    // the GET handler previously ignored it — making the "Tipo de usuário"
    // dropdown in admin-users-panel.tsx do nothing.
    const userType = req.nextUrl.searchParams.get('userType') || 'all'
    // Item 13 (sponsor validation): when the admin clicks "Sem patrocinador",
    // the panel sends noSponsor=true and we filter to users whose
    // referredById is null AND whose role is not 'admin' (the seed admin is
    // the only user allowed to have no sponsor).
    const noSponsor = req.nextUrl.searchParams.get('noSponsor') === 'true'
    const includeMatrix = req.nextUrl.searchParams.get('includeMatrix') === 'true'
    const includeBets = req.nextUrl.searchParams.get('includeBets') === 'true'
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

    // Build Prisma where clause
    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { referralCode: { contains: search } },
      ]
    }
    if (plan !== 'all') {
      where.plan = plan
    }
    if (status !== 'all') {
      where.isActive = status === 'active'
    }
    if (userType !== 'all') {
      where.userType = userType
    }
    if (noSponsor) {
      // Item 13: only the admin seed may legitimately have no sponsor.
      // Users without a sponsor (excluding admins) are the ones the admin
      // needs to identify and link to a sponsor.
      where.referredById = null
      where.role = { not: 'admin' }
    }

    let users: any[] = []
    let total = 0

    try {
      users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true, name: true, email: true, phone: true, cpf: true, plan: true,
          isActive: true, referralCode: true, referredById: true,
          balanceWithdrawal: true, balanceMobility: true, balanceShopping: true,
          balanceFood: true, balancePharmacy: true, balanceGratification: true,
          balancePaymentInvoice: true,
          balanceFree: true, balancePending: true,
          careerPoints: true, personalPoints: true, stars: true,
          city: true, state: true, country: true,
          bankCode: true, bankAgency: true, bankAccount: true, bankType: true,
          pixKey: true, pixEnabled: true,
          isDriver: true, isDelivery: true, role: true, userType: true,
          // BACK-4 — qualification is needed by the admin Edit User dialog to
          // pre-populate the Qualificação dropdown.
          qualification: true,
          createdAt: true,
          _count: { select: { referrals: true } },
        },
      })
    } catch (e) {
      console.error('Admin users findMany error:', e)
    }

    try {
      total = await prisma.user.count({ where })
    } catch (e) {
      console.error('Admin users count error:', e)
    }

    // Optional enrichment: include matrix position counts per user
    if (includeMatrix && users.length > 0) {
      try {
        const userIds = users.map((u: any) => u.id)
        const matrixCounts = await prisma.matrixPosition.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _count: { _all: true },
        })
        const countsMap: Record<string, number> = {}
        for (const mc of matrixCounts) {
          countsMap[mc.userId] = mc._count._all
        }
        users = users.map((u: any) => ({ ...u, matrixPositionCount: countsMap[u.id] || 0 }))
      } catch (e) {
        console.error('Admin users includeMatrix error:', e)
      }
    }

    // Optional enrichment: include bet counts per user
    if (includeBets && users.length > 0) {
      try {
        const userIds = users.map((u: any) => u.id)
        const betCounts = await prisma.bet.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _count: { _all: true },
        })
        const countsMap: Record<string, number> = {}
        for (const bc of betCounts) {
          countsMap[bc.userId] = bc._count._all
        }
        users = users.map((u: any) => ({ ...u, betCount: countsMap[u.id] || 0 }))
      } catch (e) {
        console.error('Admin users includeBets error:', e)
      }
    }

    return success({ users, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('Admin users GET error:', err)
    return error('Failed to fetch users', 500)
  }
}
