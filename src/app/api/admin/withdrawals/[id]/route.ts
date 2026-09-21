import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// PUT approve or reject a withdrawal
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, action, reason } = body

    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!action || !['approve', 'reject'].includes(action)) {
      return error('action must be "approve" or "reject"', 400)
    }

    // Find the withdrawal transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    })
    if (!transaction || transaction.type !== 'withdrawal') {
      return error('Withdrawal not found', 404)
    }

    if (transaction.status !== 'pending') {
      return error('Withdrawal is not pending', 400)
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const updated = await prisma.transaction.update({
      where: { id },
      data: { status: newStatus },
    })

    // If rejected, refund the user's balance
    if (action === 'reject') {
      try {
        await prisma.user.update({
          where: { id: transaction.userId },
          data: { balanceWithdrawal: { increment: transaction.amount } },
        })
      } catch {
        // Ignore refund errors
      }
    }

    return success({
      ...updated,
      action: newStatus,
      reason: reason || null,
    })
  } catch (err) {
    console.error('Update withdrawal error:', err)
    return error('Failed to update withdrawal', 500)
  }
}
