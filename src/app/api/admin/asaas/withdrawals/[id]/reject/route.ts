import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * POST /api/admin/asaas/withdrawals/[id]/reject
 * Body: { adminUserId, reason }
 *
 * Rejects a pending withdrawal request and refunds the held amount to the
 * user's balanceWithdrawal.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { adminUserId, reason } = body as {
      adminUserId?: string
      reason?: string
    }

    if (!adminUserId) return error('adminUserId é obrigatório', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const wr = await prisma.withdrawalRequest.findUnique({ where: { id } })
    if (!wr) return error('Solicitação de saque não encontrada', 404)
    if (wr.status !== 'pending') {
      return error('Solicitação já processada', 400)
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Refund the held amount to the user
      await tx.user.update({
        where: { id: wr.userId },
        data: { balanceWithdrawal: { increment: wr.amount } },
      })

      // Mark rejected
      return tx.withdrawalRequest.update({
        where: { id: wr.id },
        data: {
          status: 'rejected',
          rejectedReason: reason?.substring(0, 500) || null,
          processedById: adminUserId,
          processedAt: new Date(),
        },
      })
    })

    return success({
      withdrawal: updated,
      message: 'Solicitação rejeitada. Saldo devolvido ao usuário.',
    })
  } catch (err) {
    console.error('[Asaas admin withdrawals reject] error:', err)
    return error('Internal server error', 500)
  }
}
