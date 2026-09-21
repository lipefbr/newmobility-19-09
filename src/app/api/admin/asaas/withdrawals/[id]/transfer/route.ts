import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getTransfer, AsaasApiError } from '@/lib/asaas'

/**
 * GET /api/admin/asaas/withdrawals/[id]/transfer?userId=<admin_user_id>
 *
 * Admin-only. Returns the live Asaas transfer details (including
 * `transactionReceiptUrl`) for a given WithdrawalRequest.
 *
 * Returns 404 if the withdrawal does not exist or has no asaasTransferId yet.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUserId = req.nextUrl.searchParams.get('userId')
    if (!adminUserId) return error('userId é obrigatório', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const wr = await prisma.withdrawalRequest.findUnique({ where: { id } })
    if (!wr) return error('Solicitação de saque não encontrada', 404)
    if (!wr.asaasTransferId) {
      return error('Solicitação ainda não possui transferência Asaas', 404)
    }

    let transfer
    try {
      transfer = await getTransfer(wr.asaasTransferId)
    } catch (e) {
      if (e instanceof AsaasApiError) {
        return error(e.message, e.status || 502)
      }
      throw e
    }

    // Persist the latest status on our record for future lookups
    const updated = await prisma.withdrawalRequest
      .update({
        where: { id: wr.id },
        data: {
          asaasStatus: transfer.status,
        },
      })
      .catch(() => null)

    return success({
      withdrawalId: wr.id,
      asaasTransferId: transfer.id,
      status: transfer.status,
      value: transfer.value,
      netValue: transfer.netValue,
      transferFee: transfer.transferFee,
      effectiveDate: transfer.effectiveDate,
      scheduleDate: transfer.scheduleDate,
      dateCreated: transfer.dateCreated,
      transactionReceiptUrl: transfer.transactionReceiptUrl || null,
      failReason: transfer.failReason || null,
      type: transfer.type,
      _refreshedAt: updated?.updatedAt ?? null,
    })
  } catch (err) {
    console.error('[Asaas admin withdrawals transfer GET] error:', err)
    return error('Internal server error', 500)
  }
}
