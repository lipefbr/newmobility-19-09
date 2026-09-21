import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/driver-categories
// ----------------------------------------------------------------------------
// CRUD para categorias de veículo do motorista (Safira, Rubi, Esmeralda,
// Diamante, Imperial). Cada categoria tem:
//   - monthlyTripsTarget: meta mensal de corridas
//   - bonusCents: bônus pago se bater a meta no mês
//   - maxCancellationPerMonth: 0 = tolerância zero (idoso), 2 = demais
//
// GET  ?userId=<adminId>  → lista todas as categorias (ativas + inativas)
// POST { userId, code, name, ... }  → cria nova categoria
// ============================================================================

async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, userType: true },
  })
  if (!admin || (admin.role !== 'admin' && admin.userType !== 'admin')) {
    return null
  }
  return admin
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    const categories = await prisma.driverCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { users: true } } },
    })

    return success({
      categories: categories.map(c => ({
        ...c,
        userCount: c._count.users,
        _count: undefined,
      })),
    })
  } catch (err) {
    console.error('Admin driver-categories GET error:', err)
    return error('Failed to fetch driver categories', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      code,
      name,
      description = null,
      sortOrder = 99,
      monthlyTripsTarget = 0,
      bonusCents = 0,
      maxCancellationPerMonth = 2,
      color = null,
      icon = null,
      isActive = true,
    } = body

    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    if (!code || !name) {
      return error('code e name são obrigatórios', 400)
    }

    const existing = await prisma.driverCategory.findUnique({ where: { code } })
    if (existing) return error('Já existe uma categoria com este código', 400)

    const created = await prisma.driverCategory.create({
      data: {
        code,
        name,
        description: description || null,
        sortOrder: Number(sortOrder) || 99,
        monthlyTripsTarget: Number(monthlyTripsTarget) || 0,
        bonusCents: Number(bonusCents) || 0,
        maxCancellationPerMonth: Number(maxCancellationPerMonth) || 0,
        color: color || null,
        icon: icon || null,
        isActive: Boolean(isActive),
      },
    })

    return success(created, 201)
  } catch (err) {
    console.error('Admin driver-categories POST error:', err)
    return error('Failed to create driver category', 500)
  }
}
