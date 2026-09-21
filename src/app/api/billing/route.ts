import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import {
  getInvoiceStatus,
  getDaysUntilDue,
  isInvoiceBlocking,
  bucketInvoiceType,
  type InvoiceBucket,
} from '@/lib/billing'

// GET /api/billing?userId=...
// Returns all invoices for the current user, grouped by billing bucket
// (plan / cashback / telemedicina / telemoby / other), with computed
// status, daysUntilDue, and a `blockWarning` flag when the invoice is
// overdue by 5+ days (which triggers auto-block).
export async function GET(request: Request) {
  try {
    const session = await getSession(request)
    if (!session) {
      return error('Unauthorized', 401)
    }

    const invoices = (await db.find(
      'Invoice',
      '"userId" = $1',
      [session.userId],
      'ORDER BY "dueDate" ASC'
    )) as Array<{
      id: string
      userId: string
      amount: number
      type: string | null
      status: string
      dueDate: string | Date
      paidAt: string | Date | null
      createdAt: string | Date
      description: string | null
      asaasPaymentId: string | null
      paymentMethod: string | null
      invoiceUrl: string | null
      bankSlipUrl: string | null
      pixCode: string | null
      pixQrCode: string | null
    }>

    const computed = invoices.map((inv) => {
      const status = getInvoiceStatus(inv)
      const daysUntilDue = getDaysUntilDue(inv)
      const blockWarning = isInvoiceBlocking(inv)
      return {
        ...inv,
        // Normalise amount — guarantee a finite integer so the client never
        // has to deal with `R$ NaN`.
        amount: Number.isFinite(Number(inv.amount)) ? Math.round(Number(inv.amount)) : 0,
        computedStatus: status,
        daysUntilDue,
        blockWarning,
        bucket: bucketInvoiceType(inv.type),
      }
    })

    // Group by bucket.
    const groups: Record<InvoiceBucket, typeof computed> = {
      plan: [],
      cashback: [],
      telemedicina: [],
      telemoby: [],
      other: [],
    }
    for (const inv of computed) {
      groups[inv.bucket].push(inv)
    }

    // Summary flags used by the page's top warning banner.
    const hasOverdue = computed.some((i) => i.computedStatus === 'overdue')
    const hasUpcoming = computed.some(
      (i) => i.computedStatus === 'pending' && i.daysUntilDue >= 0 && i.daysUntilDue <= 5
    )
    const hasBlocking = computed.some((i) => i.blockWarning)

    return success({
      invoices: computed,
      groups,
      summary: {
        total: computed.length,
        pending: computed.filter((i) => i.computedStatus === 'pending').length,
        overdue: computed.filter((i) => i.computedStatus === 'overdue').length,
        paid: computed.filter((i) => i.computedStatus === 'paid').length,
        hasOverdue,
        hasUpcoming,
        hasBlocking,
      },
    })
  } catch (err) {
    console.error('GET /api/billing error:', err)
    return error('Internal server error', 500)
  }
}

// POST /api/billing
// Body: { type, amount, description?, dueDate }
// Creates a new Invoice for the current user.
export async function POST(request: Request) {
  try {
    const session = await getSession(request)
    if (!session) {
      return error('Unauthorized', 401)
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const { type, amount, description, dueDate } = body as {
      type?: string
      amount?: number
      description?: string
      dueDate?: string
    }

    if (!type || amount === undefined || amount === null || !dueDate) {
      return error('type, amount and dueDate are required')
    }

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return error('amount must be a non-negative number')
    }

    const parsedDue = new Date(dueDate)
    if (isNaN(parsedDue.getTime())) {
      return error('dueDate must be a valid date')
    }

    const invoice = await db.insert('Invoice', {
      userId: session.userId,
      amount: Math.round(numericAmount),
      type: String(type),
      status: 'pending',
      dueDate: parsedDue,
      description: description ? String(description) : null,
    })

    return success({ invoice }, 201)
  } catch (err) {
    console.error('POST /api/billing error:', err)
    return error('Internal server error', 500)
  }
}
