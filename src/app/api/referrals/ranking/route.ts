import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/referrals/ranking — Ranking de indicados diretos por usuário
// ----------------------------------------------------------------------------
// Tarefa 1 (19/09): separa "quantas pessoas eu trouxe" (indicação direta) de
// "estrutura da matriz" (posição na árvore com spillover).
//
// GET ?userId=X → retorna os indicados diretos do usuário X, ordenados por:
//   1. Número de sub-indicados (total de descendentes na árvore de patrocínio)
//   2. Data de ativação (mais antigos primeiro)
//
// Retorna:
//   { ranking: [{ id, name, email, qualification, createdAt, directCount,
//                 totalDescendants, plan, isActive }] }
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })
    if (!user) return error('User not found', 404)

    // Busca todos os indicados diretos (User.referredById === userId)
    const directReferrals = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        name: true,
        email: true,
        qualification: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: { select: { referrals: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Para cada indicado direto, conta o total de descendentes (sub-árvore)
    // usando BFS pela árvore de patrocínio (User.referredById).
    const ranking = []
    for (const r of directReferrals) {
      let totalDescendants = 0
      const queue: string[] = [r.id]
      const visited = new Set<string>([r.id])
      let depth = 0
      while (queue.length > 0 && depth < 50) {
        const current = queue.shift()!
        const children = await prisma.user.findMany({
          where: { referredById: current },
          select: { id: true },
        })
        for (const c of children) {
          if (!visited.has(c.id)) {
            visited.add(c.id)
            queue.push(c.id)
            totalDescendants++
          }
        }
        depth++
      }

      ranking.push({
        id: r.id,
        name: r.name,
        email: r.email,
        qualification: r.qualification || null,
        plan: r.plan,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
        // Indicados diretos deste indicado (filhos diretos dele)
        directCount: r._count.referrals,
        // Total de descendentes na sub-árvore (netos, bisnetos, etc.)
        totalDescendants,
      })
    }

    // Ordena por totalDescendants DESC (quem mais trouxe gente fica no topo)
    ranking.sort((a, b) => b.totalDescendants - a.totalDescendants || b.directCount - a.directCount)

    return success({
      totalDirectReferrals: directReferrals.length,
      ranking,
    })
  } catch (err) {
    console.error('Referrals ranking error:', err)
    return error('Failed to fetch referrals ranking', 500)
  }
}
