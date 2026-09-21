import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// GET all matrix types with their level earnings
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const matrixTypes = await prisma.matrixType.findMany({
      orderBy: { createdAt: 'asc' },
      include: { MatrixLevelEarning: { orderBy: { level: 'asc' } } },
    })

    const formatted = matrixTypes.map((mt) => ({
      id: mt.id,
      code: mt.code,
      name: mt.name,
      matrixKind: mt.matrixKind,
      width: mt.width,
      depth: mt.depth,
      description: mt.description,
      color: mt.color,
      isActive: mt.isActive,
      levelEarnings: mt.MatrixLevelEarning.map((le) => ({
        id: le.id,
        level: le.level,
        percentage: le.percentage,
        fixedBonusCents: le.fixedBonusCents,
      })),
    }))

    return success({ matrixTypes: formatted })
  } catch (err) {
    console.error('Get matrix types error:', err)
    return error('Failed to fetch matrix types', 500)
  }
}

// POST create a new matrix type
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, code, name, matrixKind, width, depth, description, color, isActive = true, levelEarnings = [] } = body

    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!code || !name || !matrixKind) return error('code, name and matrixKind are required', 400)

    const existing = await prisma.matrixType.findUnique({ where: { code } })
    if (existing) return error('Já existe uma matriz com este código', 400)

    const id = `mt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const created = await prisma.matrixType.create({
      data: {
        id,
        code,
        name,
        matrixKind,
        width: Number(width) || 4,
        depth: Number(depth) || 5,
        description: description || null,
        color: color || null,
        isActive: Boolean(isActive),
      },
    })

    // Create level earnings if provided
    if (Array.isArray(levelEarnings) && levelEarnings.length > 0) {
      for (const le of levelEarnings) {
        const leId = `le_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${le.level}`
        await prisma.matrixLevelEarning.create({
          data: {
            id: leId,
            matrixTypeId: id,
            level: Number(le.level),
            percentage: Number(le.percentage) || 0,
            fixedBonusCents: Number(le.fixedBonusCents) || 0,
          },
        })
      }
    }

    return success({ ...created, levelEarnings })
  } catch (err) {
    console.error('Create matrix type error:', err)
    return error('Failed to create matrix type', 500)
  }
}
