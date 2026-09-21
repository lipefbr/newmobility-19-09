import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import {
  createPayment,
  getPayment,
  centsToAsaasValue,
  type AsaasBillingType,
  type AsaasPayment,
} from '@/lib/asaas'

/**
 * POST /api/asaas/payment
 *
 * Creates a PIX or Boleto payment in Asaas for an existing Invoice.
 *
 * Body: { userId, invoiceId, billingType: 'PIX' | 'BOLETO' }
 *
 * Flow:
 *   1. Validate the user exists and has an `asaasCustomerId`. If not,
 *      return 400 — the client should call /api/asaas/customer first.
 *   2. Load the Invoice by id; verify it belongs to the user. Reject
 *      already-paid invoices.
 *   3. If the invoice already has an `asaasPaymentId`, return the existing
 *      Asaas payment (so the user can reopen the QR code / boleto link
 *      without generating a duplicate charge).
 *   4. Otherwise, call Asaas createPayment with billingType PIX or BOLETO,
 *      dueDate = invoice.dueDate, value = invoice.amount/100, and
 *      externalReference = invoice.id.
 *   5. Persist the returned asaasPaymentId, paymentMethod, invoiceUrl,
 *      bankSlipUrl, pixCode, pixQrCode back on the Invoice.
 *   6. Return the AsaasPayment payload.
 *
 * GET /api/asaas/payment?userId=...&invoiceId=...
 *   Returns the AsaasPayment currently linked to the invoice (if any).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as any))
    const { userId, invoiceId, billingType } = body || {}

    if (!userId || !invoiceId || !billingType) {
      return error('userId, invoiceId and billingType are required')
    }

    const bt: AsaasBillingType =
      billingType === 'PIX' ? 'PIX'
      : billingType === 'BOLETO' ? 'BOLETO'
      : billingType === 'CREDIT_CARD' ? 'CREDIT_CARD'
      : 'UNDEFINED'

    if (bt === 'UNDEFINED') {
      return error("billingType must be 'PIX' or 'BOLETO'")
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('Usuário não encontrado', 404)
    }
    if (!user.asaasCustomerId) {
      return error('Cliente Asaas não encontrado', 400)
    }

    const invoices = await db.find(
      'Invoice',
      '"id" = $1 AND "userId" = $2',
      [invoiceId, userId]
    )
    const invoice = invoices?.[0]
    if (!invoice) {
      return error('Fatura não encontrada', 404)
    }
    if (invoice.status === 'paid' || invoice.status === 'received') {
      return error('Esta fatura já foi paga', 400)
    }

    // Idempotent: if there's already an Asaas payment linked, return its
    // current state (re-fetch so the status is fresh).
    if (invoice.asaasPaymentId) {
      try {
        const existing = await getPayment(invoice.asaasPaymentId)
        return success({ payment: existing, invoice, reused: true })
      } catch {
        // The previously-linked payment may have been deleted in Asaas —
        // fall through and create a new one below.
      }
    }

    const value = centsToAsaasValue(Number(invoice.amount) || 0)
    if (value <= 0) {
      return error('Valor da fatura inválido', 400)
    }

    // Asaas expects YYYY-MM-DD. Invoice.dueDate is a Date in Postgres.
    const dueDateISO = new Date(invoice.dueDate).toISOString().slice(0, 10)

    const description =
      invoice.description ||
      `Fatura NewMobility #${String(invoice.id).slice(-8).toUpperCase()}`

    const payment: AsaasPayment = await createPayment({
      customer: user.asaasCustomerId,
      billingType: bt,
      value,
      dueDate: dueDateISO,
      description,
      externalReference: invoice.id,
    })

    // Persist the Asaas payment id + cached fields back on the Invoice.
    // These cached fields let the UI render the QR code / boleto link
    // without a second round-trip to Asaas.
    await db.update('Invoice', '"id" = $1', {
      asaasPaymentId: payment.id,
      paymentMethod: bt === 'PIX' ? 'pix' : bt === 'BOLETO' ? 'boleto' : (bt.toLowerCase()),
      invoiceUrl: payment.invoiceUrl || null,
      bankSlipUrl: payment.bankSlipUrl || null,
      pixCode: payment.pixCopyPaste || null,
      pixQrCode: payment.pixQrCode || null,
    }, [invoice.id])

    return success({ payment, invoice, reused: false }, 201)
  } catch (err: any) {
    console.error('Asaas payment create error:', err)
    const msg = err?.message || 'Internal server error'
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500
    return error(msg, status >= 400 && status < 600 ? status : 500)
  }
}

/**
 * GET /api/asaas/payment?userId=...&invoiceId=...
 *   Returns the cached payment fields stored on the Invoice, plus a fresh
 *   status fetched from Asaas if an asaasPaymentId is linked. Useful for
 *   the "Ver Pagamento" button on invoices that already have a payment in
 *   progress.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const invoiceId = searchParams.get('invoiceId')

    if (!userId || !invoiceId) {
      return error('userId and invoiceId are required')
    }

    const invoices = await db.find(
      'Invoice',
      '"id" = $1 AND "userId" = $2',
      [invoiceId, userId]
    )
    const invoice = invoices?.[0]
    if (!invoice) {
      return error('Fatura não encontrada', 404)
    }

    if (!invoice.asaasPaymentId) {
      return success({ payment: null, invoice })
    }

    let payment: AsaasPayment | null = null
    try {
      payment = await getPayment(invoice.asaasPaymentId)

      // Sync the Invoice status with Asaas' authoritative status so the
      // user sees "Recebido" the moment Asaas confirms the payment.
      const newStatus = mapAsaasStatusToInvoiceStatus(payment.status)
      if (newStatus && newStatus !== invoice.status) {
        const patch: Record<string, unknown> = { status: newStatus }
        if (newStatus === 'paid') {
          patch.paidAt = new Date()
        }
        await db.update('Invoice', '"id" = $1', patch, [invoice.id])
        invoice.status = newStatus
      }
    } catch (err) {
      // Asaas unavailable — fall back to the cached fields on the Invoice.
      console.warn('Asaas getPayment failed, returning cached invoice fields:', err)
    }

    return success({
      payment: payment
        ? payment
        : {
            id: invoice.asaasPaymentId,
            billingType: invoice.paymentMethod === 'pix' ? 'PIX' : 'BOLETO',
            status: invoice.status === 'paid' ? 'RECEIVED' : 'PENDING',
            value: centsToAsaasValue(Number(invoice.amount) || 0),
            dueDate: new Date(invoice.dueDate).toISOString().slice(0, 10),
            invoiceUrl: invoice.invoiceUrl || undefined,
            bankSlipUrl: invoice.bankSlipUrl || undefined,
            pixCopyPaste: invoice.pixCode || undefined,
            pixQrCode: invoice.pixQrCode || undefined,
          },
      invoice,
    })
  } catch (err: any) {
    console.error('Asaas payment get error:', err)
    return error('Internal server error', 500)
  }
}

/** Map Asaas payment status → our Invoice.status enum. */
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
