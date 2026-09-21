import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { countMatrixDescendants } from '@/lib/matrix-placement'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    // ─── INDICAÇÕES DIRETAS (patrocínio) ────────────────────────────────
    // "Quem eu trouxe" — independente de onde caíram na matriz (spillover).
    // Isto é diferente da "posição na matriz" (MatrixPosition.parentId).
    // Mostra TODAS as indicações diretas, não só as 4 que ficaram no nível 1.
    const directReferrals = await db.find(
      'User',
      '"referredById" = $1',
      [userId],
      'ORDER BY "createdAt" DESC'
    ) as any[]

    const directReferralData = directReferrals.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      plan: r.plan,
      isActive: r.isActive,
      createdAt: r.createdAt,
      profileImage: r.profileImage,
    }))

    // ─── MATRIZ: árvore usando MatrixPosition (respeita cap 4 + spillover) ──
    // Tarefa (19/09): a "Visualização da Rede" e os "Níveis da Rede" agora
    // usam a árvore da MATRIZ (MatrixPosition.parentId), não a árvore de
    // patrocínio (User.referredById). Se o admin indicou 10 pessoas, só 4
    // ficam no nível 1 (cap 4-wide); as outras 6 caem em spillover (níveis 2+).
    //
    // Usamos a matriz "residual" como referência para a visualização da rede
    // (todos os usuários têm posição nesta matriz, ao contrário de "entrada"
    // que é só para pagantes).
    const matrixNetwork = await countMatrixDescendants(userId, 'residual', 7)

    // Stats da matriz (respeita spillover)
    const totalMatrixNetwork = matrixNetwork.total
    const activeMatrixNetwork = matrixNetwork.activeTotal
    const pendingMatrixNetwork = totalMatrixNetwork - activeMatrixNetwork

    // Para stats de ativos/pendentes, USA A MATRIZ (consistente com totalNetwork).
    // Antes usava a árvore de patrocínio, o que era inconsistente (totalNetwork
    // = 15 da matriz, mas activeNetwork = 26 do patrocínio).
    const totalNetwork = totalMatrixNetwork
    const activeNetwork = activeMatrixNetwork
    const pendingNetwork = pendingMatrixNetwork

    // Total referral earnings — soma de cashback dos descendentes na MATRIZ
    // Busca os userIds das posições na matriz residual
    const matrixPositions = await prisma.matrixPosition.findMany({
      where: { matrixType: 'residual', userId: { not: userId } },
      select: { userId: true },
      distinct: ['userId'],
    }).catch(() => [])
    const networkIds = matrixPositions.map(p => p.userId)
    let totalEarningsCents = 0
    if (networkIds.length > 0) {
      const [entradaSum, residualSum, vendasSum] = await Promise.all([
        prisma.cashbackEntry.aggregate({
          where: { userId, fromUserId: { in: networkIds } },
          _sum: { amount: true },
        }),
        prisma.cashbackResidual.aggregate({
          where: { userId, fromUserId: { in: networkIds } },
          _sum: { amount: true },
        }),
        prisma.cashbackSales.aggregate({
          where: { userId, fromUserId: { in: networkIds } },
          _sum: { amount: true },
        }),
      ])
      totalEarningsCents =
        (entradaSum._sum.amount ?? 0) +
        (residualSum._sum.amount ?? 0) +
        (vendasSum._sum.amount ?? 0)
    }

    // ─── ÁRVORE DA MATRIZ (para visualização) ───────────────────────────
    // Constrói a árvore usando MatrixPosition.parentId (respeita spillover).
    // Cada posição só tem no máximo 4 filhos diretos (cap 4-wide).
    // Os excedentes caem em spillover para níveis mais profundos.
    const rootPosition = await prisma.matrixPosition.findFirst({
      where: { userId, matrixType: 'residual' },
    }).catch(() => null)

    // Busca TODAS as MatrixPosition da matriz residual em uma query
    const allPositions = rootPosition
      ? await prisma.matrixPosition.findMany({
          where: { matrixType: 'residual' },
          select: {
            id: true,
            parentId: true,
            userId: true,
            level: true,
            position: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }).catch(() => [])
      : []

    // Busca dados dos usuários nas posições
    const positionUserIds = allPositions.map(p => p.userId)
    const positionUsers = positionUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: positionUserIds } },
          select: { id: true, name: true, plan: true, isActive: true, createdAt: true, profileImage: true },
        }).catch(() => [])
      : []
    const userMap = new Map(positionUsers.map(u => [u.id, u]))

    // Constrói mapa parent→children
    const childrenMap: Record<string, typeof allPositions> = {}
    for (const pos of allPositions) {
      if (pos.parentId) {
        if (!childrenMap[pos.parentId]) childrenMap[pos.parentId] = []
        childrenMap[pos.parentId].push(pos)
      }
    }

    // BFS recursivo para construir a árvore
    function buildMatrixTree(parentPositionId: string, depth: number, maxDepth: number): any[] {
      if (depth > maxDepth) return []
      const childPositions = childrenMap[parentPositionId] || []
      const tree: any[] = []
      for (const pos of childPositions) {
        const childUser = userMap.get(pos.userId)
        if (!childUser) continue
        const subTree = buildMatrixTree(pos.id, depth + 1, maxDepth)
        tree.push({
          id: childUser.id,
          name: childUser.name,
          plan: childUser.plan,
          isActive: childUser.isActive,
          createdAt: childUser.createdAt,
          profileImage: childUser.profileImage,
          children: subTree,
        })
      }
      return tree
    }

    // Usa a árvore da MATRIZ se o usuário tem posição, senão fallback para patrocínio
    const referralTree = rootPosition
      ? buildMatrixTree(rootPosition.id, 1, 5)
      : await buildReferralTree(userId, 1, 5)

    // Fallback: árvore de patrocínio (legacy, sem spillover)
    async function buildReferralTree(parentId: string, depth: number, maxDepth: number): Promise<any[]> {
      if (depth > maxDepth) return []
      const children = await db.find(
        'User',
        '"referredById" = $1',
        [parentId]
      ) as any[]
      const tree: any[] = []
      for (const child of children) {
        const subTree = await buildReferralTree(child.id, depth + 1, maxDepth)
        tree.push({
          id: child.id,
          name: child.name,
          plan: child.plan,
          isActive: child.isActive,
          createdAt: child.createdAt,
          children: subTree,
        })
      }
      return tree
    }

    return success({
      directReferrals: directReferralData,
      stats: {
        totalDirect: directReferralData.length,
        activeDirect: directReferralData.filter((r) => r.isActive).length,
        pendingDirect: directReferralData.length - directReferralData.filter((r) => r.isActive).length,
        // totalNetwork agora usa a MATRIZ (respeita spillover cap 4)
        totalNetwork: totalMatrixNetwork,
        activeNetwork,
        pendingNetwork,
        activeNetworkPercent: totalNetwork > 0 ? Math.round((activeNetwork / totalNetwork) * 100) : 0,
        totalEarningsCents,
        // Stats da matriz por nível (respeita spillover)
        matrixByLevel: matrixNetwork.byLevel,
      },
      referralTree,
    })
  } catch (err) {
    console.error('Referrals error:', err)
    return error('Internal server error', 500)
  }
}
