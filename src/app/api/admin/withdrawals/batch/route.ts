import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// POST - Batch approve or reject pending withdrawals
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, withdrawalIds, action } = body

    if (!userId) return error('userId is required', 400)
    if (!withdrawalIds || !Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return error('withdrawalIds array is required', 400)
    }
    if (!['approve', 'reject'].includes(action)) {
      return error('action must be "approve" or "reject"', 400)
    }

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Process each withdrawal
    const results: Array<{ id: string; success: boolean; error?: string }> = []

    for (const withdrawalId of withdrawalIds) {
      try {
        // Get the withdrawal transaction
        const withdrawal = await prisma.transaction.findFirst({
          where: { id: withdrawalId, type: 'withdrawal', status: 'pending' },
        })

        if (!withdrawal) {
          results.push({ id: withdrawalId, success: false, error: 'Not found or not pending' })
          continue
        }

        // Update the transaction status
        await prisma.transaction.update({
          where: { id: withdrawalId },
          data: { status: newStatus },
        })

        // If rejected, refund the amount to user's balance
        if (action === 'reject') {
          const wUserId = withdrawal.userId
          const wAmount = Number(withdrawal.amount || 0)

          if (wUserId && wAmount > 0) {
            await prisma.user.update({
              where: { id: wUserId },
              data: { balanceWithdrawal: { increment: wAmount } },
            })
          }
        }

        results.push({ id: withdrawalId, success: true })
      } catch (err) {
        results.push({ id: withdrawalId, success: false, error: 'Processing failed' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return success({
      processed: successCount,
      failed: failCount,
      results,
      action: newStatus,
    })
  } catch (err) {
    console.error('Admin batch withdrawals POST error:', err)
    return error('Failed to batch process withdrawals', 500)
  }
}
