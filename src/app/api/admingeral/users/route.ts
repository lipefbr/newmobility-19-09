import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/users — list app users by type (clientes, motoristas,
// lojistas, entregadores). Supports a `type` query param.

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const type = req.nextUrl.searchParams.get('type') || 'all'
    const q = req.nextUrl.searchParams.get('q') // search by name/email

    const where: Record<string, unknown> = {}
    if (type === 'clientes') {
      where.userType = { in: ['usuario', 'cliente'] }
      where.isDriver = false
      where.isDelivery = false
    } else if (type === 'motoristas') {
      where.isDriver = true
    } else if (type === 'lojistas') {
      where.userType = 'lojista'
    } else if (type === 'entregadores') {
      where.isDelivery = true
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, phone: true, profileImage: true,
        userType: true, isDriver: true, isDelivery: true, isActive: true,
        plan: true, city: true, state: true, createdAt: true,
        balanceWithdrawal: true, balanceFood: true, stars: true, totalRides: true,
        _count: { select: { appStores: true, appOrders: true, driverApplications: true } },
      },
      take: 100,
    })
    return success({ users })
  } catch (err) {
    console.error('[/api/admingeral/users GET] error:', err)
    return error('Internal server error', 500)
  }
}
