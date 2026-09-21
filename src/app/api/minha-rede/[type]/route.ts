import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Matrix type config: depth limits + level metadata
// Tarefa (19/09): agora lê width/depth do MatrixType do banco em vez de
// usar MATRIX_CONFIG hardcoded. As percentuais por nível continuam vindo
// do MatrixLevelEarning do banco (admin-configurável).
const MATRIX_TYPE_MAP: Record<string, string> = {
  direta: 'entrada',   // "direta" na URL = matriz "entrada" no DB
  residual: 'residual',
  vendas: 'vendas',
}

interface MatrixLevelData {
  level: number
  percentage: number
  capacity: number
}

async function getMatrixConfig(matrixType: string): Promise<{
  levels: MatrixLevelData[]
  maxDepth: number
  label: string
} | null> {
  // Mapeia "direta" → "entrada" para buscar no DB
  const dbMatrixKind = MATRIX_TYPE_MAP[matrixType]
  if (!dbMatrixKind) return null

  // Busca o MatrixType do banco (admin pode editar width/depth)
  const matrixTypeRow = await prisma.matrixType.findFirst({
    where: { matrixKind: dbMatrixKind, isActive: true },
    include: {
      MatrixLevelEarning: {
        orderBy: { level: 'asc' },
      },
    },
  }).catch(() => null)

  // Fallback para os defaults hardcoded se o DB não estiver disponível
  if (!matrixTypeRow || !matrixTypeRow.MatrixLevelEarning || matrixTypeRow.MatrixLevelEarning.length === 0) {
    const FALLBACK = {
      direta: { maxDepth: 5, label: 'Matriz de Entrada', levels: [
        { level: 1, percentage: 5, capacity: 4 }, { level: 2, percentage: 10, capacity: 16 },
        { level: 3, percentage: 10, capacity: 64 }, { level: 4, percentage: 5, capacity: 256 },
        { level: 5, percentage: 5, capacity: 1024 },
      ]},
      residual: { maxDepth: 7, label: 'Matriz Residual', levels: [
        { level: 1, percentage: 5, capacity: 4 }, { level: 2, percentage: 5.5, capacity: 16 },
        { level: 3, percentage: 6, capacity: 64 }, { level: 4, percentage: 6.5, capacity: 256 },
        { level: 5, percentage: 7, capacity: 1024 }, { level: 6, percentage: 7.5, capacity: 4096 },
        { level: 7, percentage: 8, capacity: 16384 },
      ]},
      vendas: { maxDepth: 9, label: 'Matriz de Vendas', levels: [
        { level: 1, percentage: 0.1, capacity: 4 }, { level: 2, percentage: 0.1, capacity: 16 },
        { level: 3, percentage: 0.1, capacity: 64 }, { level: 4, percentage: 0.1, capacity: 256 },
        { level: 5, percentage: 0.1, capacity: 1024 }, { level: 6, percentage: 0.1, capacity: 4096 },
        { level: 7, percentage: 0.1, capacity: 16384 }, { level: 8, percentage: 0.1, capacity: 65536 },
        { level: 9, percentage: 0.2, capacity: 262144 },
      ]},
    }
    return FALLBACK[matrixType] || null
  }

  // Constrói config a partir do banco: width e depth do MatrixType,
  // percentuais do MatrixLevelEarning (admin-configurável).
  const width = matrixTypeRow.width || 4
  const maxDepth = matrixTypeRow.depth || 5
  const levels: MatrixLevelData[] = matrixTypeRow.MatrixLevelEarning.map(le => ({
    level: le.level,
    percentage: le.percentage,
    capacity: Math.pow(width, le.level), // capacity = width^level (ex: 4^1=4, 4^2=16, 4^3=64...)
  }))

  return { levels, maxDepth, label: matrixTypeRow.name || `Matriz ${matrixType}` }
}

interface TreeNode {
  id: string
  name: string
  email: string
  plan: string
  isActive: boolean
  referralCode: string | null
  profileImage: string | null
  stars: number
  createdAt: string
  level: number
  children: TreeNode[]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { type: matrixType } = await params

    if (!userId) {
      return error('userId is required')
    }

    const config = await getMatrixConfig(matrixType)
    if (!config) {
      return error('Invalid matrix type. Use: direta, residual, or vendas', 400)
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    // Tarefa (19/09): construir a árvore usando MatrixPosition (que respeita
    // o spillover com cap de 4 por posição), NÃO User.referredById (que mostra
    // TODAS as indicações diretas no nível 1, ignorando o spillover).
    //
    // "Indicação direta" (User.referredById) é diferente de "posição na matriz"
    // (MatrixPosition.parentId). Uma pessoa pode ter 10 indicações diretas mas
    // só 4 ficam no nível 1 da matriz — as outras 6 caem em spillover (níveis 2+).
    //
    // Mapeia "direta" → "entrada" para o MatrixPosition.matrixType do banco.
    const dbMatrixKind = MATRIX_TYPE_MAP[matrixType] || matrixType

    // Busca a posição raiz do usuário nesta matriz
    const rootPosition = await prisma.matrixPosition.findFirst({
      where: { userId, matrixType: dbMatrixKind },
    }).catch(() => null)

    // Recursively build tree from MatrixPosition.parentId (respects spillover),
    // capping at maxDepth. Falls back to User.referredById if no MatrixPosition
    // exists (e.g., legacy users created before the matrix placement logic).
    async function buildTreeFromMatrix(parentPositionId: string, currentDepth: number, maxDepth: number): Promise<TreeNode[]> {
      if (currentDepth > maxDepth) return []

      // Busca os MatrixPosition filhos desta posição (respeita spillover: max 4)
      const childPositions = await prisma.matrixPosition.findMany({
        where: { parentId: parentPositionId, matrixType: dbMatrixKind },
        orderBy: { position: 'asc' },
      }).catch(() => [])

      const tree: TreeNode[] = []
      for (const pos of childPositions) {
        // Busca os dados do User correspondente a esta posição
        const childUser = await prisma.user.findUnique({
          where: { id: pos.userId },
          select: { id: true, name: true, email: true, plan: true, isActive: true, referralCode: true, profileImage: true, stars: true, createdAt: true },
        }).catch(() => null)
        if (!childUser) continue

        const subTree = await buildTreeFromMatrix(pos.id, currentDepth + 1, maxDepth)
        tree.push({
          id: childUser.id,
          name: childUser.name,
          email: childUser.email,
          plan: childUser.plan,
          isActive: childUser.isActive,
          referralCode: childUser.referralCode,
          profileImage: childUser.profileImage,
          stars: childUser.stars || 0,
          createdAt: childUser.createdAt?.toISOString?.() ?? new Date(childUser.createdAt as any).toISOString(),
          level: currentDepth,
          children: subTree,
        })
      }
      return tree
    }

    // Fallback: build tree from User.referredById (legacy, sem spillover)
    async function buildTreeFromReferrals(parentId: string, currentDepth: number, maxDepth: number): Promise<TreeNode[]> {
      if (currentDepth > maxDepth) return []

      const children = await db.find(
        'User',
        '"referredById" = $1',
        [parentId],
        'ORDER BY "createdAt" ASC'
      ) as any[]

      const tree: TreeNode[] = []
      for (const child of children) {
        const subTree = await buildTreeFromReferrals(child.id, currentDepth + 1, maxDepth)
        tree.push({
          id: child.id,
          name: child.name,
          email: child.email,
          plan: child.plan,
          isActive: child.isActive,
          referralCode: child.referralCode,
          profileImage: child.profileImage,
          stars: child.stars || 0,
          createdAt: child.createdAt?.toISOString?.() ?? new Date(child.createdAt).toISOString(),
          level: currentDepth,
          children: subTree,
        })
      }
      return tree
    }

    // Usa MatrixPosition se o usuário tem posição nesta matriz (respeita spillover).
    // Senão, fallback para referredById (legacy).
    const tree = rootPosition
      ? await buildTreeFromMatrix(rootPosition.id, 1, config.maxDepth)
      : await buildTreeFromReferrals(userId, 1, config.maxDepth)

    // Build per-level stats
    const levelMap: Record<number, { users: number }> = {}
    function walk(nodes: TreeNode[]) {
      for (const n of nodes) {
        const cur = levelMap[n.level] || { users: 0 }
        cur.users += 1
        levelMap[n.level] = cur
        if (n.children.length > 0) walk(n.children)
      }
    }
    walk(tree)

    const levels = config.levels.map(lv => ({
      level: lv.level,
      percentage: lv.percentage,
      capacity: lv.capacity,
      currentUsers: levelMap[lv.level]?.users || 0,
      fillPercentage: Math.min(((levelMap[lv.level]?.users || 0) / lv.capacity) * 100, 100),
    }))

    // Total counts
    function countNodes(nodes: TreeNode[]): number {
      let count = 0
      for (const n of nodes) {
        count += 1
        count += countNodes(n.children)
      }
      return count
    }
    const totalUsers = countNodes(tree)

    // Direct children (level 1 only)
    const directReferrals = levelMap[1]?.users || 0

    return success({
      type: matrixType,
      label: config.label,
      maxDepth: config.maxDepth,
      rootUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        referralCode: user.referralCode,
        stars: user.stars || 0,
      },
      tree,
      levels,
      totalUsers,
      directReferrals,
      maxMatrixSize: config.levels.reduce((sum, l) => sum + l.capacity, 0),
    })
  } catch (err) {
    console.error('Minha Rede error:', err)
    return error('Internal server error', 500)
  }
}
