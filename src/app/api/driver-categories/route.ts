import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/driver-categories
// ----------------------------------------------------------------------------
// Endpoint público (sem auth) para listar categorias ativas de motorista.
// Usado pelo backoffice do motorista para mostrar sua categoria atual e
// o progresso mensal.
//
// GET → retorna apenas categorias isActive=true, ordenadas por sortOrder.
// ============================================================================

export async function GET(_req: NextRequest) {
  try {
    const categories = await prisma.driverCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        sortOrder: true,
        monthlyTripsTarget: true,
        bonusCents: true,
        maxCancellationPerMonth: true,
        color: true,
        icon: true,
      },
    })

    return success({ categories })
  } catch (err) {
    console.error('Public driver-categories GET error:', err)
    return success({ categories: [] })
  }
}

export async function POST() {
  return error('Method Not Allowed', 405)
}
