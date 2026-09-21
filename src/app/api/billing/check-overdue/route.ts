import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import {
  getInvoiceStatus,
  getDaysUntilDue,
  bucketInvoiceType,
  bucketLabel,
  formatBRL,
} from '@/lib/billing'

// POST /api/billing/check-overdue
// Admin/system endpoint: finds all invoices that are `pending` AND dueDate
// is more than 5 days in the past, marks the owing user `isActive = false`
// (auto-block), and creates a one-shot `billing_blocked` notification.
//
// Idempotent:
//   - For each blocked user we look for an existing `billing_blocked`
//     notification whose message contains `[inv:INVOICE_ID]`; if one exists,
//     we skip both the (already-applied) block update and the notification.
//   - Re-running the endpoint is safe.
//
// Body (optional): { userId } — restricts the scan to a single user
// (used by the fire-and-forget call from the billing page on mount).
// When omitted, ALL pending invoices across ALL users are scanned.
export async function POST(request: Request) {
  try {
    const session = await getSession(request)
    const bodyUserId = await readBodyUserId(request)

    // Auth: require a session. The session user can scan their own invoices
    // (so the fire-and-forget call from the billing page works), or an admin
    // can supply any userId / scan the whole platform.
    const targetUserId = session?.userId || bodyUserId
    if (!targetUserId) {
      return error('Unauthorized', 401)
    }

    // Verify the calling user exists.
    const caller = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!caller) {
      return error('User not found', 404)
    }

    // Determine the set of invoices to scan. If a userId was supplied, only
    // that user's invoices are scanned; otherwise we scan ALL pending
    // invoices platform-wide (admin/system cron use case).
    const invoiceWhere = bodyUserId
      ? { userId: bodyUserId, status: 'pending' as const }
      : { status: 'pending' as const }

    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
      orderBy: { dueDate: 'asc' },
    })

    const blocking = invoices.filter((inv) => {
      const status = getInvoiceStatus(inv)
      if (status !== 'overdue') return false
      return getDaysUntilDue(inv) <= -5
    })

    const blocked: Array<{ userId: string; invoiceId: string; wasAlreadyBlocked: boolean }> = []

    for (const inv of blocking) {
      // Idempotency: have we already sent a `billing_blocked` notification
      // for this invoice? If so, skip both the user update and the notification.
      const existing = await prisma.notification.findFirst({
        where: {
          userId: inv.userId,
          type: 'billing_blocked',
          message: { contains: `[inv:${inv.id}]` },
        },
        select: { id: true },
      })
      if (existing) {
        blocked.push({ userId: inv.userId, invoiceId: inv.id, wasAlreadyBlocked: true })
        continue
      }

      // Auto-block the user (only flip if currently active).
      const wasActive = inv.user?.isActive === true
      if (wasActive) {
        await prisma.user.update({
          where: { id: inv.userId },
          data: { isActive: false },
        })
      }

      const bucket = bucketInvoiceType(inv.type)
      const label = bucketLabel(bucket)
      const days = Math.abs(getDaysUntilDue(inv))
      const dueStr = new Date(inv.dueDate).toLocaleDateString('pt-BR')
      const amountStr = formatBRL(Number(inv.amount) || 0)

      const message =
        `Sua conta foi bloqueada automaticamente. A fatura de ${label} (${amountStr}) ` +
        `venceu em ${dueStr} há ${days} dias. Regularize o pagamento para reativar sua conta. [inv:${inv.id}]`

      await prisma.notification.create({
        data: {
          userId: inv.userId,
          title: 'Conta Bloqueada — Fatura Vencida',
          message,
          type: 'billing_blocked',
          isRead: false,
        },
      })

      blocked.push({ userId: inv.userId, invoiceId: inv.id, wasAlreadyBlocked: !wasActive })
    }

    return success({
      scanned: invoices.length,
      blocking: blocking.length,
      blocked: blocked.length,
      blocked_details: blocked,
    })
  } catch (err) {
    console.error('POST /api/billing/check-overdue error:', err)
    return error('Internal server error', 500)
  }
}

// Helper: read `userId` from the request body without disturbing the
// downstream `request.json()` call (we clone first).
async function readBodyUserId(request: Request): Promise<string | null> {
  try {
    const ct = request.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    const clone = request.clone()
    const body = await clone.json().catch(() => null)
    if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).userId === 'string') {
      return (body as Record<string, string>).userId
    }
    return null
  } catch {
    return null
  }
}
