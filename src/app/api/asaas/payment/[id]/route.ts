import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getPayment, type AsaasPayment } from '@/lib/asaas'

/**
 * GET /api/asaas/payment/[id]?userId=...
 *
 * Fetches the current state of an Asaas payment by its Asaas id. Also
 * looks up the linked Invoice (by asaasPaymentId) and syncs its status
 * field with whatever Asaas returns, so the rest of the backoffice UI
 * sees the update immediately.
 *
 * Returns: { payment: AsaasPayment, invoice: Invoice | null }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { id: asaasPaymentId } = await params

    if (!userId || !asaasPaymentId) {
      return error('userId and asaasPaymentId are required')
    }

    const payment: AsaasPayment = await getPayment(asaasPaymentId)

    // Find the linked invoice (must belong to the requesting user).
    let invoice: any = null
    try {
      const rows = await db.find(
        'Invoice',
        '"asaasPaymentId" = $1 AND "userId" = $2',
        [asaasPaymentId, userId]
      )
      invoice = rows?.[0] || null

      if (invoice) {
        const newStatus = mapAsaasStatusToInvoiceStatus(payment.status)
        if (newStatus && newStatus !== invoice.status) {
          const patch: Record<string, unknown> = { status: newStatus }
          if (newStatus === 'paid') {
            patch.paidAt = new Date()
          }
          await db.update('Invoice', '"id" = $1', patch, [invoice.id])
          invoice.status = newStatus
        }
      }
    } catch (syncErr) {
      // Status sync is best-effort — don't fail the whole request.
      console.warn('Invoice status sync failed:', syncErr)
    }

    return success({ payment, invoice })
  } catch (err: any) {
    console.error('Asaas payment fetch error:', err)
    const msg = err?.message || 'Internal server error'
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500
    return error(msg, status >= 400 && status < 600 ? status : 500)
  }
}

function mapAsaasStatusToInvoiceStatus(
  asaasStatus: string
): 'pending' | 'paid' | 'overdue' | 'cancelled' | null {
  switch (asaasStatus) {
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return 'pending'
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return 'paid'
    case 'OVERDUE':
      return 'overdue'
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'AWAITING_CHARGEBACK_REVERSAL':
    case 'DUNNING_REQUESTED':
    case 'DUNNING_RECEIVED':
      return 'cancelled'
    default:
      return null
  }
}
