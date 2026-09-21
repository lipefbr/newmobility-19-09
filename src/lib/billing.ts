// Billing helpers used by both the API routes (server) and the billing
// page (client). Pure functions only — no DB access, no React.

/**
 * Format a value in BRL cents as a Brazilian currency string.
 *
 *   formatBRL(99990)   // "R$ 999,90"
 *   formatBRL(0)       // "R$ 0,00"
 *   formatBRL(null)    // "R$ 0,00"
 *   formatBRL(undefined) // "R$ 0,00"
 *   formatBRL(NaN)     // "R$ 0,00"
 *
 * NEVER returns "R$ NaN" — every falsy / non-finite input defaults to 0.
 */
export function formatBRL(cents: number | null | undefined | string): string {
  const n = Number(cents)
  if (!Number.isFinite(n) || n === null) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(0)
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n / 100)
}

/** Shape of an invoice row we accept — anything that has the fields we read. */
export interface InvoiceLike {
  status?: string | null
  dueDate?: string | Date | null
  paidAt?: string | Date | null
  type?: string | null
}

/**
 * Compute the effective status of an invoice.
 *
 *  - 'paid'     — status is already 'paid' OR paidAt is set.
 *  - 'overdue'  — status is 'pending' (or anything non-paid) AND dueDate is
 *                 in the past.
 *  - 'pending'  — otherwise (not paid, dueDate in the future or missing).
 */
export function getInvoiceStatus(invoice: InvoiceLike): 'paid' | 'pending' | 'overdue' {
  if (!invoice) return 'pending'
  if (invoice.status === 'paid' || invoice.paidAt) return 'paid'

  const due = invoice.dueDate ? new Date(invoice.dueDate) : null
  if (!due || isNaN(due.getTime())) return 'pending'

  // Compare on date-only boundary at end-of-day in local time so an invoice
  // due "today" doesn't flip to overdue at 00:00:01.
  const now = new Date()
  const dueEndOfDay = new Date(due)
  dueEndOfDay.setHours(23, 59, 59, 999)

  if (now > dueEndOfDay) return 'overdue'
  return 'pending'
}

/**
 * Whole days until (or since) the due date.
 *
 *  - Positive: invoice is due in N days.
 *  - Zero:     invoice is due today.
 *  - Negative: invoice is N days overdue (1 day past due → -1).
 */
export function getDaysUntilDue(invoice: InvoiceLike): number {
  if (!invoice || !invoice.dueDate) return 0
  const due = new Date(invoice.dueDate)
  if (isNaN(due.getTime())) return 0

  const now = new Date()
  // Strip time-of-day so the diff is in whole calendar days.
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const ms = dueDay.getTime() - nowDay.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

/**
 * Whether an invoice triggers an auto-block on the user account.
 *
 * Per the client spec: a pending invoice that is 5+ days overdue causes the
 * user's account to be auto-blocked (isActive = false).
 */
export function isInvoiceBlocking(invoice: InvoiceLike): boolean {
  if (getInvoiceStatus(invoice) !== 'overdue') return false
  return getDaysUntilDue(invoice) <= -5
}

/**
 * Normalise an invoice's raw `type` into one of the four billing buckets
 * the unified "Pagar Faturas" page groups by.
 *
 * The DB stores arbitrary type strings (e.g. `plan_subscription`,
 * `plan_blue3`, `monthly_fee`, `residual_entry`, `cashback_activation`,
 * `telemedicina`, `telemoby`, `talkmobi`). We collapse them into:
 *
 *   - 'plan'          — monthly plan fee (R$999 for Blue 5, etc.)
 *   - 'cashback'      — cashback activation / entry fee
 *   - 'telemedicina'  — telemedicine subscription
 *   - 'telemoby'      — TalkMobi subscription
 *   - 'other'         — anything else (still rendered, just grouped at the end)
 */
export type InvoiceBucket = 'plan' | 'cashback' | 'telemedicina' | 'telemoby' | 'other'

export function bucketInvoiceType(rawType: string | null | undefined): InvoiceBucket {
  if (!rawType) return 'other'
  const t = String(rawType).toLowerCase()

  // Telemedicina — note: must be checked BEFORE 'plan' so a
  // `plan_telemedicina` value buckets into telemedicina, not plan.
  if (t.includes('telemed')) return 'telemedicina'
  if (t === 'telemedicina') return 'telemedicina'

  // TalkMobi / Telemoby
  if (t.includes('telemoby') || t.includes('talkmobi')) return 'telemoby'

  // Cashback (entrada / activation)
  if (t.includes('cashback')) return 'cashback'
  if (t.includes('entrada') || t.includes('residual_entry')) return 'cashback'

  // Plan (monthly fee / subscription / upgrade)
  if (
    t === 'plan' ||
    t.startsWith('plan_') ||
    t === 'monthly_fee' ||
    t === 'subscription' ||
    t.includes('upgrade')
  ) {
    return 'plan'
  }

  return 'other'
}

/** Human-readable Portuguese label for each bucket. */
export function bucketLabel(bucket: InvoiceBucket): string {
  switch (bucket) {
    case 'plan':
      return 'Plano Mensal'
    case 'cashback':
      return 'CashBack'
    case 'telemedicina':
      return 'Telemedicina'
    case 'telemoby':
      return 'TalkMobi'
    default:
      return 'Outros'
  }
}
