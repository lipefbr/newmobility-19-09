import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * GET /api/admin/matrix-positions
 *
 * Lists MatrixPosition records (with user name/email), optionally filtered by
 * matrixType / level / free-text search on user name or email. Paginated
 * (limit=50, page-based). Used by the "Modo Avançado" editor in the
 * Matrizes MMN admin tab.
 *
 * Query params:
 *   userId      — required, must be an admin
 *   matrixType  — optional, one of 'entrada' | 'residual' | 'vendas'
 *   level       — optional integer level filter
 *   search      — optional case-insensitive match on user.name / user.email
 *   page        — optional, default 1 (1-indexed)
 *   limit       — optional, default 50, capped at 100
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const matrixType = req.nextUrl.searchParams.get('matrixType')
    const levelRaw = req.nextUrl.searchParams.get('level')
    const search = (req.nextUrl.searchParams.get('search') || '').trim()
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '50', 10) || 50))

    const where: {
      matrixType?: string
      level?: number
      user?: { OR: Array<{ name: { contains: string } } | { email: { contains: string } }> }
    } = {}

    if (matrixType && matrixType !== 'all') where.matrixType = matrixType

    if (levelRaw !== null && levelRaw !== '') {
      const lvl = parseInt(levelRaw, 10)
      if (!Number.isNaN(lvl)) where.level = lvl
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }
    }

    const [total, rows] = await Promise.all([
      prisma.matrixPosition.count({ where }),
      prisma.matrixPosition.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, plan: true } },
        },
      }),
    ])

    const positions = rows.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user?.name || null,
      userEmail: p.user?.email || null,
      userPlan: p.user?.plan || null,
      matrixType: p.matrixType,
      level: p.level,
      position: p.position,
      isFilled: p.isFilled,
      status: p.isFilled ? 'filled' : 'reserved',
      parentId: p.parentId,
      createdAt: p.createdAt,
    }))

    return success({
      positions,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (err) {
    console.error('Get matrix positions error:', err)
    return error('Failed to fetch matrix positions', 500)
  }
}
