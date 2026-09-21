import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import { bucketInvoiceType } from '@/lib/billing'
import { generateVoucherForUser } from '@/lib/voucher'

// POST /api/billing/pay/[invoiceId]
// Marks an invoice as paid (status = 'paid', paidAt = now).
// For `plan`-type invoices also sets user.plan (when description carries a
// plan slug like 'blue3' / 'blue5') and user.isActive = true (un-blocks the
// user since they just regularised their account).
//
// Task 2-e (Item 5): this endpoint is now ADMIN-ONLY. Real Asaas payment
// confirmation is handled by the Asaas webhook (/api/asaas/webhook), which
// is the ONLY legitimate way for a non-admin user to mark their invoice
// paid (Asaas calls the webhook when the user actually pays the PIX QR /
// Boleto / credit card). Allowing invoice owners to mark their own
// invoices paid through this endpoint would let any user bypass payment
// entirely by POSTing here directly — that defeats the whole billing flow.
//
// Body (optional):
//   { userId, paymentMethod }
//     - `userId`        — admin caller id (required for session resolution).
//     - `paymentMethod` — one of 'pix' | 'boleto' | 'credit_card'. Stored on
//                         the Invoice row (the schema already has this column)
//                         so the UI can show a "Pago via PIX" badge. When
//                         omitted we keep the existing value (or null).

const VALID_PAYMENT_METHODS = new Set(['pix', 'boleto', 'credit_card'])

function normalizePaymentMethod(input: unknown): string | null {
  if (!input || typeof input !== 'string') return null
  const v = input.trim().toLowerCase()
  if (VALID_PAYMENT_METHODS.has(v)) return v
  // Tolerate common synonyms before rejecting.
  if (v === 'creditcard' || v === 'cartao' || v === 'cartão') return 'credit_card'
  if (v === 'bank_slip') return 'boleto'
  return null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getSession(request)
    const { bodyUserId, bodyPaymentMethod } = await readBody(request)
    const targetUserId = session?.userId || bodyUserId

    if (!targetUserId) {
      return error('Unauthorized', 401)
    }

    const { invoiceId } = await params
    if (!invoiceId) {
      return error('invoiceId is required', 400)
    }

    // Fetch the invoice first so we can verify ownership and apply plan rules.
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) {
      return error('Invoice not found', 404)
    }

    // Ownership check: only an admin may call this endpoint (Task 2-e Item 5).
    // Real users must pay through Asaas, which confirms via the webhook.
    // Non-admin callers — even the invoice owner — are rejected.
    const caller = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!caller) {
      return error('Caller not found', 404)
    }
    const isAdmin = caller.role === 'admin'
    if (!isAdmin) {
      return error(
        'Apenas administradores podem marcar faturas como pagas manualmente. ' +
          'Para pagar sua fatura, use o gateway de pagamento Asaas (PIX / Boleto / Cartão).',
        403
      )
    }

    // Normalize the chosen payment method. Reject unknown values so we
    // never persist garbage to the Invoice.paymentMethod column.
    const method = normalizePaymentMethod(bodyPaymentMethod)
    if (bodyPaymentMethod && !method) {
      return error('Forma de pagamento inválida. Use: pix, boleto ou credit_card', 400)
    }

    const now = new Date()
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: now,
        // Only overwrite the payment method when a valid one was supplied.
        // Otherwise we leave the existing value (e.g. set earlier by an
        // Asaas webhook) untouched.
        ...(method ? { paymentMethod: method } : {}),
      },
    })

    // For plan-type invoices, also activate the user and (if the description
    // carries a plan slug) bump their plan. This un-blocks accounts that
    // were auto-blocked by /api/billing/check-overdue.
    const bucket = bucketInvoiceType(invoice.type)
    if (bucket === 'plan') {
      const desc = (invoice.description || '').toLowerCase()
      let newPlan: string | null = null
      if (desc.includes('blue5') || desc.includes('blue 5') || desc.includes('premium')) {
        newPlan = 'blue5'
      } else if (desc.includes('blue3') || desc.includes('blue 3')) {
        newPlan = 'blue3'
      }

      const userData: { isActive?: boolean; plan?: string } = { isActive: true }
      if (newPlan) userData.plan = newPlan

      const updatedUser = await prisma.user.update({
        where: { id: invoice.userId },
        data: userData,
        select: { id: true, userType: true },
      })

      // --- Plan-bonus voucher (Task 14-E) ---
      // Mirror the Asaas webhook: when a plan invoice is marked paid,
      // auto-generate a fresh voucher sized to the user's userType. Best-effort
      // — never fails the parent flow.
      try {
        const userType = updatedUser.userType || 'usuario'
        await generateVoucherForUser(updatedUser.id, userType, {
          type: 'plan_bonus',
        })

        try {
          await prisma.notification.create({
            data: {
              userId: updatedUser.id,
              title: 'Bônus de plano liberado! 🎁',
              message:
                'Você recebeu um novo voucher por assinar/atualizar seu plano. Confira na aba Vouchers!',
              type: 'voucher',
            },
          })
        } catch (notifErr) {
          console.warn('[billing/pay] could not create plan-bonus notification:', notifErr)
        }
      } catch (voucherErr) {
        console.error(
          '[billing/pay] NON-CRITICAL: failed to create plan-bonus voucher:',
          voucherErr
        )
      }

      // --- Monthly recurrence: generate next month's invoice ---
      // When a plan invoice is paid, automatically create the next month's
      // invoice (due in ~30 days). This ensures the user always has a pending
      // invoice to pay every month — the billing cycle never breaks.
      try {
        const nextDueDate = new Date(now)
        nextDueDate.setDate(nextDueDate.getDate() + 30)

        // Avoid duplicate: only create if no pending plan invoice exists
        // with a dueDate in the future for this user.
        const existingPending = await prisma.invoice.findFirst({
          where: {
            userId: invoice.userId,
            status: 'pending',
            type: invoice.type,
            dueDate: { gt: now },
          },
          select: { id: true },
        })

        if (!existingPending) {
          const nextInvoice = await prisma.invoice.create({
            data: {
              userId: invoice.userId,
              amount: invoice.amount,
              type: invoice.type,
              status: 'pending',
              dueDate: nextDueDate,
              description: invoice.description
                ? `${invoice.description} (renovação mensal)`
                : 'Renovação mensal de plano',
            },
          })

          // Notify the user about the new invoice
          try {
            await prisma.notification.create({
              data: {
                userId: invoice.userId,
                title: 'Nova fatura mensal gerada 📅',
                message: `Sua próxima fatura de renovação (${new Intl.NumberFormat(
                  'pt-BR',
                  { style: 'currency', currency: 'BRL' }
                ).format(invoice.amount / 100)}) vence em ${nextDueDate.toLocaleDateString(
                  'pt-BR'
                )}. Mantenha o pagamento em dia para evitar bloqueios.`,
                type: 'invoice',
              },
            })
          } catch (notifErr) {
            console.warn('[billing/pay] could not create renewal notification:', notifErr)
          }

          console.log(
            `[billing/pay] Created next monthly invoice ${nextInvoice.id} for user ${invoice.userId}, due ${nextDueDate.toISOString()}`
          )
        }
      } catch (renewErr) {
        console.error(
          '[billing/pay] NON-CRITICAL: failed to create next monthly invoice:',
          renewErr
        )
      }

      // ========================================================================
      // PRIORIDADE 2 — MOTOR DE CASHBACK (MATRIZ RESIDUAL)
      // Pagamento manual de fatura do plano também dispara Residual.
      // ========================================================================
      try {
        const { triggerResidualCashback } = await import('@/lib/cashback-engine')
        await triggerResidualCashback({
          payerId: invoice.userId,
          invoiceAmountCents: invoice.amount,
          invoiceId: invoice.id,
        })
      } catch (cbErr) {
        console.warn('[Cashback Motor] Residual distribution (manual pay) failed:', cbErr)
      }
    }

    return success({ invoice: updated })
  } catch (err) {
    console.error('POST /api/billing/pay/[invoiceId] error:', err)
    return error('Internal server error', 500)
  }
}

// Helper: read `userId` and `paymentMethod` from the request body without
// disturbing the downstream `request.json()` call (we clone first).
async function readBody(request: Request): Promise<{
  bodyUserId: string | null
  bodyPaymentMethod: string | null
}> {
  try {
    const ct = request.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      return { bodyUserId: null, bodyPaymentMethod: null }
    }
    const clone = request.clone()
    const body = await clone.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return { bodyUserId: null, bodyPaymentMethod: null }
    }
    const rec = body as Record<string, unknown>
    const bodyUserId =
      typeof rec.userId === 'string' ? (rec.userId as string) : null
    const bodyPaymentMethod =
      typeof rec.paymentMethod === 'string' ? (rec.paymentMethod as string) : null
    return { bodyUserId, bodyPaymentMethod }
  } catch {
    return { bodyUserId: null, bodyPaymentMethod: null }
  }
}
