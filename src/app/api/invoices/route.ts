import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    const invoices = await db.find(
      'Invoice',
      '"userId" = $1',
      [userId],
      'ORDER BY "createdAt" DESC'
    )

    return success({ invoices })
  } catch (err) {
    console.error('Invoices error:', err)
    return error('Internal server error', 500)
  }
}

/**
 * POST /api/invoices — create a new Invoice for the given user.
 *
 * Body: { userId, amount, type, dueDate, description? }
 *  - amount: number (BRL cents, e.g. 9990 for R$99,90)
 *  - type: string (e.g. 'plan_subscription', 'plan_blue3', 'monthly_fee',
 *          'residual_entry', 'upgrade', 'boleto', etc.)
 *  - dueDate: ISO string | YYYY-MM-DD
 *  - description?: string (optional human-readable label shown in the UI)
 *
 * Returns the created Invoice row including its `id`, used by the
 * AsaasPaymentDialog as the `invoiceId` prop when opening the payment modal.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as any))
    const { userId, amount, type, dueDate, description } = body || {}

    if (!userId || amount === undefined || amount === null || !type || !dueDate) {
      return error('userId, amount, type and dueDate are required')
    }

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return error('amount must be a non-negative number')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    const parsedDue = new Date(dueDate)
    if (isNaN(parsedDue.getTime())) {
      return error('dueDate must be a valid date')
    }

    const invoice = await db.insert('Invoice', {
      userId,
      amount: Math.round(numericAmount),
      type: String(type),
      status: 'pending',
      dueDate: parsedDue,
      description: description ? String(description) : null,
    })

    return success({ invoice }, 201)
  } catch (err) {
    console.error('Create invoice error:', err)
    return error('Internal server error', 500)
  }
}
