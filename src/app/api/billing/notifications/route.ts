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

// GET /api/billing/notifications?userId=...
// Returns the current user's billing-related notifications
// (type = 'billing_reminder' or 'billing_blocked').
export async function GET(request: Request) {
  try {
    const session = await getSession(request)
    if (!session) {
      return error('Unauthorized', 401)
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.userId,
        type: { in: ['billing_reminder', 'billing_blocked'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return success({ notifications })
  } catch (err) {
    console.error('GET /api/billing/notifications error:', err)
    return error('Internal server error', 500)
  }
}

// POST /api/billing/notifications
// Admin/system endpoint: for each of the target user's invoices that is
// `pending` AND due within 5 days from now AND has no existing
// `billing_reminder` notification, create a reminder notification.
//
// Idempotent — uses Notification.type = 'billing_reminder' AND a per-invoice
// token `[inv:ID]` embedded in the message so we never duplicate reminders.
//
// Body (optional): { userId } — when supplied by an admin/system caller.
// When omitted, the session user's own invoices are scanned (used by the
// fire-and-forget call from the billing page on mount).
export async function POST(request: Request) {
  try {
    // Try session (reads userId from query/body) — fall back to body.userId.
    const session = await getSession(request)
    const bodyUserId = await readBodyUserId(request)
    const targetUserId = session?.userId || bodyUserId

    if (!targetUserId) {
      return error('userId is required', 401)
    }

    // Verify the user exists.
    const user = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!user) {
      return error('User not found', 404)
    }

    const now = new Date()
    const horizon = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) // +5 days

    // Pull all pending invoices for the user.
    const invoices = await prisma.invoice.findMany({
      where: { userId: targetUserId, status: 'pending' },
      orderBy: { dueDate: 'asc' },
    })

    // Filter: dueDate is within the next 5 days (inclusive of today).
    const upcoming = invoices.filter((inv) => {
      const status = getInvoiceStatus(inv)
      if (status !== 'pending') return false
      const days = getDaysUntilDue(inv)
      return days >= 0 && days <= 5
    })

    // For idempotency, look up existing reminder notifications for this user.
    // We embed `[inv:ID]` in the notification message and search by type.
    const existing = await prisma.notification.findMany({
      where: { userId: targetUserId, type: 'billing_reminder' },
      select: { message: true },
    })

    const alreadyNotifiedTokens = new Set<string>()
    for (const n of existing) {
      const m = n.message || ''
      const match = m.match(/\[inv:([a-zA-Z0-9]+)\]/)
      if (match) alreadyNotifiedTokens.add(match[1])
    }

    const created: Array<{ id: string; invoiceId: string }> = []

    for (const inv of upcoming) {
      // Skip if the invoice's dueDate is past the 5-day horizon.
      const due = new Date(inv.dueDate)
      if (due.getTime() > horizon.getTime()) continue

      if (alreadyNotifiedTokens.has(inv.id)) continue

      const bucket = bucketInvoiceType(inv.type)
      const label = bucketLabel(bucket)
      const days = getDaysUntilDue(inv)
      const dueStr = new Date(inv.dueDate).toLocaleDateString('pt-BR')
      const amountStr = formatBRL(Number(inv.amount) || 0)

      const message =
        `Sua fatura de ${label} (${amountStr}) vence em ${days} dia${days === 1 ? '' : 's'} (${dueStr}). ` +
        `Pague para evitar o bloqueio da sua conta. [inv:${inv.id}]`

      const notification = await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Lembrete de Pagamento',
          message,
          type: 'billing_reminder',
          isRead: false,
        },
      })

      created.push({ id: notification.id, invoiceId: inv.id })
    }

    return success({
      scanned: invoices.length,
      upcoming: upcoming.length,
      created: created.length,
      created_notifications: created,
    })
  } catch (err) {
    console.error('POST /api/billing/notifications error:', err)
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
