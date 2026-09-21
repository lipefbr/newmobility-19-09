import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, reason } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const transaction = await prisma.transaction.findUnique({ where: { id } })
    if (!transaction) return error('Transaction not found', 404)

    if (transaction.type !== 'withdrawal') {
      return error('Transaction is not a withdrawal', 400)
    }

    if (transaction.status === 'rejected') {
      return error('Withdrawal is already rejected', 400)
    }

    if (transaction.status === 'paid') {
      return error('Cannot reject a paid withdrawal', 400)
    }

    // Update transaction status to rejected
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'rejected',
        description: reason
          ? `${transaction.description || ''} [Rejeitado: ${reason}]`.trim()
          : `${transaction.description || ''} [Rejeitado]`.trim(),
      },
    })

    // Refund the amount back to user's balanceWithdrawal
    await prisma.user.update({
      where: { id: transaction.userId },
      data: {
        balanceWithdrawal: {
          increment: transaction.amount,
        },
      },
    })

    // Create a transaction record for the refund
    await prisma.transaction.create({
      data: {
        userId: transaction.userId,
        type: 'deposit',
        amount: transaction.amount,
        status: 'approved',
        category: 'withdrawal',
        description: `[Admin] Reembolso de saque rejeitado${reason ? `: ${reason}` : ''}`,
      },
    })

    return success(updatedTransaction)
  } catch (err) {
    return error('Failed to reject withdrawal', 500)
  }
}
