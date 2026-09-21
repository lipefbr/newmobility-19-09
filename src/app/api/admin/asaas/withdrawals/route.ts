import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * GET /api/admin/asaas/withdrawals
 * Query params:
 *   - userId    (required) — admin user id, validated against `role === 'admin'`
 *   - status    (optional) — 'all' | 'pending' | 'approved' | 'paid' | 'rejected'
 *                            (also accepts 'failed' explicitly; everything else falls back to 'all')
 *   - page      (optional, default 1)
 *   - limit     (optional, default 20, max 100)
 *
 * Returns WithdrawalRequest records ordered by createdAt desc with the related
 * user's name/email/cpf/pixKey/bankCode/bankAgency/bankAccount/bankType.
 *
 * Response shape:
 *   {
 *     withdrawals: WithdrawalRequest[],
 *     total: number,
 *     totalPages: number,
 *     stats: { pendingCount, approvedCount, paidCount, rejectedCount }
 *   }
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId é obrigatório', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const statusParam = (req.nextUrl.searchParams.get('status') || 'all').toLowerCase()
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20', 10) || 20)
    )
    const offset = (page - 1) * limit

    // Build where clause from status filter
    const validStatuses = ['pending', 'approved', 'paid', 'rejected', 'failed']
    const where: { status?: { in: string[] } } = {}
    if (statusParam !== 'all') {
      if (validStatuses.includes(statusParam)) {
        where.status = { in: [statusParam] }
      }
    }

    // Run list + count + stats. Use Promise.all for parallelism.
    const [withdrawals, total, pendingCount, approvedCount, paidCount, rejectedCount] =
      await Promise.all([
        prisma.withdrawalRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
                pixKey: true,
                bankCode: true,
                bankAgency: true,
                bankAccount: true,
                bankType: true,
              },
            },
          },
        }),
        prisma.withdrawalRequest.count({ where }),
        prisma.withdrawalRequest.count({ where: { status: 'pending' } }),
        prisma.withdrawalRequest.count({ where: { status: 'approved' } }),
        prisma.withdrawalRequest.count({ where: { status: 'paid' } }),
        prisma.withdrawalRequest.count({ where: { status: 'rejected' } }),
      ])

    return success({
      withdrawals,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        pendingCount,
        approvedCount,
        paidCount,
        rejectedCount,
      },
    })
  } catch (err) {
    console.error('[Asaas admin withdrawals GET] error:', err)
    return error('Internal server error', 500)
  }
}
