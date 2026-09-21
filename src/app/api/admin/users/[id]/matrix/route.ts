import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const VALID_MATRIX_TYPES = ['entrada', 'residual', 'vendas']

// Depth per matrix type — must match the matrix dimensions in the database
// (entrada_4x5 → 5 levels, residual_4x7 → 7 levels, vendas_4x9 → 9 levels).
const MATRIX_DEPTH: Record<string, number> = {
  entrada: 5,
  residual: 7,
  vendas: 9,
}

interface MatrixNode {
  id: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  level: number
  position: number
  isFilled: boolean
  parentId: string | null
  children: MatrixNode[]
}

// GET /api/admin/users/[id]/matrix?userId=X&matrixType=entrada
// Returns the matrix tree for a user. The user's own root position is level 1,
// and levels go up to the matrix depth (entrada=5, residual=7, vendas=9).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminId = req.nextUrl.searchParams.get('userId')
    if (!adminId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const matrixType = req.nextUrl.searchParams.get('matrixType') || 'entrada'
    if (!VALID_MATRIX_TYPES.includes(matrixType)) {
      return error(`matrixType must be one of: ${VALID_MATRIX_TYPES.join(', ')}`, 400)
    }

    const maxDepth = MATRIX_DEPTH[matrixType]

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return error('User not found', 404)

    // Find the user's root position in this matrix
    const rootPositions = await prisma.matrixPosition.findMany({
      where: { userId: id, matrixType },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    if (rootPositions.length === 0) {
      // Return an empty shell that still declares the expected number of levels
      // so the admin UI can render the level distribution consistently.
      const emptyLevelCounts = Array.from({ length: maxDepth }, (_, i) => ({
        level: i + 1,
        count: 0,
      }))
      return success({
        tree: null,
        stats: {
          totalPositions: 0,
          filledPositions: 0,
          emptyPositions: 0,
          totalLevels: maxDepth,
          levelCounts: emptyLevelCounts,
          matrixType,
          maxDepth,
        },
      })
    }

    // Track visited ids to prevent cycles
    const visited = new Set<string>()
    const levelCountsMap: Record<number, number> = {}
    let totalPositions = 0
    let filledPositions = 0

    const buildNode = async (
      positionId: string,
      level: number
    ): Promise<MatrixNode | null> => {
      // Levels are 1-indexed (1 = the user's own root position, up to maxDepth).
      if (level > maxDepth) return null
      if (visited.has(positionId)) return null
      visited.add(positionId)

      const pos = await prisma.matrixPosition.findUnique({
        where: { id: positionId },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
      if (!pos) return null

      totalPositions += 1
      if (pos.isFilled) filledPositions += 1
      levelCountsMap[level] = (levelCountsMap[level] || 0) + 1

      // Find direct children
      const childPositions = await prisma.matrixPosition.findMany({
        where: { parentId: positionId, matrixType },
        orderBy: { position: 'asc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      })

      const children: MatrixNode[] = []
      for (const child of childPositions) {
        const childNode = await buildNode(child.id, level + 1)
        if (childNode) children.push(childNode)
      }

      return {
        id: pos.id,
        userId: pos.userId,
        userName: pos.user?.name || null,
        userEmail: pos.user?.email || null,
        level,
        position: pos.position,
        isFilled: pos.isFilled,
        parentId: pos.parentId,
        children,
      }
    }

    // Use the first root position as the tree root (level 1).
    const root = rootPositions[0]
    const tree = await buildNode(root.id, 1)

    // Build levelCounts for ALL levels 1..maxDepth, even when count is 0,
    // so the admin UI can render the full level distribution consistently
    // regardless of which levels happen to be filled.
    const levelCounts = Array.from({ length: maxDepth }, (_, i) => {
      const level = i + 1
      return { level, count: levelCountsMap[level] || 0 }
    })

    return success({
      tree,
      stats: {
        totalPositions,
        filledPositions,
        emptyPositions: totalPositions - filledPositions,
        totalLevels: maxDepth,
        levelCounts,
        matrixType,
        maxDepth,
      },
    })
  } catch (err) {
    console.error('Admin user matrix GET error:', err)
    return error('Failed to fetch matrix tree', 500)
  }
}
