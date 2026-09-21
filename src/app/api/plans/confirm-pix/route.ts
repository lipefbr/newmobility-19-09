import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * Confirms a PIX payment for a plan upgrade.
 * In production, this would be called by a webhook from the bank/PSP.
 * For demo purposes, the user can manually trigger it after "paying" the PIX.
 *
 * Body: { userId, invoiceId }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, invoiceId } = body

    if (!userId || !invoiceId) {
      return error('userId and invoiceId are required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    const invoice = await db.findOne('Invoice', '"id" = $1 AND "userId" = $2', [invoiceId, userId])
    if (!invoice) {
      return error('Fatura não encontrada', 404)
    }

    if (invoice.status === 'paid') {
      return error('Esta fatura já foi paga', 400)
    }

    // Mark invoice as paid
    await db.update('Invoice', '"id" = $1', {
      status: 'paid',
      paidAt: new Date(),
    }, [invoiceId])

    // Determine plan from invoice type. Normalize premium5 → blue5 (DB code).
    let plan = invoice.type?.replace('plan_', '') || 'blue3'
    if (plan === 'premium5') plan = 'blue5'

    // Apply the plan upgrade
    await db.update('User', '"id" = $1', {
      plan,
      isActive: true,
      // Set subscription status to active with next due date 30 days from now
    }, [userId])

    // Display name (Premium 5 for the blue5/premium5 tier, Blue 3 otherwise)
    const planDisplayName = plan === 'blue5' ? 'Premium 5' : plan === 'blue3' ? 'Blue 3' : plan

    // Create approved transaction
    await db.insert('Transaction', {
      userId,
      type: 'deposit',
      amount: invoice.amount,
      status: 'approved',
      category: 'plan_upgrade',
      description: `Pagamento confirmado - Upgrade para ${planDisplayName} via PIX`,
    })

    // Update other pending plan_upgrade transactions for this user to approved
    const pendingTxs = await db.find(
      'Transaction',
      '"userId" = $1 AND "status" = $2 AND "category" = $3',
      [userId, 'pending', 'plan_upgrade']
    )
    for (const tx of pendingTxs) {
      await db.update('Transaction', '"id" = $1', {
        status: 'approved',
        description: `Pagamento confirmado - Upgrade para ${planDisplayName} via PIX`,
      }, [tx.id])
    }

    // Send notification for the confirmed PIX payment (Blue 3 → Premium 5
    // unlocks levels 4-5; Blue 3 standalone just activates the plan).
    if (plan === 'blue5') {
      await db.insert('Notification', {
        userId,
        title: `Upgrade para ${planDisplayName} realizado!`,
        message: `Seu pagamento PIX foi confirmado e seu plano foi atualizado para ${planDisplayName}. Os níveis 4 e 5 da matriz Entrada foram desbloqueados — agora você pode receber comissões dos níveis 1 a 5.`,
        type: 'plan_upgrade',
      })
    }

    const updatedUser = await db.findOne('User', '"id" = $1', [userId])

    return success({
      invoice: { ...invoice, status: 'paid', paidAt: new Date() },
      user: updatedUser,
      plan,
      planAlias: plan === 'blue5' ? 'premium5' : plan,
      paid: true,
    })
  } catch (err) {
    console.error('Confirm PIX payment error:', err)
    return error('Internal server error', 500)
  }
}
