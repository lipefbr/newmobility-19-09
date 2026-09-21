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
    const { userId, status } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!status || !['approved', 'paid'].includes(status)) {
      return error('status must be "approved" or "paid"', 400)
    }

    const transaction = await prisma.transaction.findUnique({ where: { id } })
    if (!transaction) return error('Transaction not found', 404)

    if (transaction.type !== 'withdrawal') {
      return error('Transaction is not a withdrawal', 400)
    }

    if (transaction.status !== 'pending' && transaction.status !== 'approved') {
      return error(`Cannot approve withdrawal with status "${transaction.status}"`, 400)
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: { status },
    })

    return success(updatedTransaction)
  } catch (err) {
    return error('Failed to approve withdrawal', 500)
  }
}
