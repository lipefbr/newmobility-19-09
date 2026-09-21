import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * GET /api/asaas/withdrawals?userId=...
 * Returns the user's withdrawal requests (most recent first, capped at 50).
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId é obrigatório', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return error('Usuário não encontrado', 404)

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return success({ withdrawals })
  } catch (err) {
    console.error('[Asaas withdrawals GET] error:', err)
    return error('Internal server error', 500)
  }
}
