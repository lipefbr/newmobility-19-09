import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// GET all withdrawal requests (admin view)
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const status = req.nextUrl.searchParams.get('status') || 'all'
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = { type: 'withdrawal' }
    if (status !== 'all') {
      where.status = status
    }

    // Run queries sequentially to avoid memory issues
    let withdrawals: any[] = []
    let total = 0
    let pendingCount = 0
    let approvedCount = 0
    let rejectedCount = 0
    let pendingAmount = 0
    let approvedAmount = 0

    try {
      withdrawals = await prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true, userId: true, type: true, amount: true, status: true,
          category: true, description: true, createdAt: true,
          user: { select: { name: true, email: true } },
        },
      })
    } catch { /* ignore */ }

    try { total = await prisma.transaction.count({ where }) } catch { /* ignore */ }
    try { pendingCount = await prisma.transaction.count({ where: { type: 'withdrawal', status: 'pending' } }) } catch { /* ignore */ }
    try { approvedCount = await prisma.transaction.count({ where: { type: 'withdrawal', status: 'approved' } }) } catch { /* ignore */ }
    try { rejectedCount = await prisma.transaction.count({ where: { type: 'withdrawal', status: 'rejected' } }) } catch { /* ignore */ }

    try {
      const pendingAgg = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'withdrawal', status: 'pending' } })
      pendingAmount = pendingAgg._sum.amount || 0
    } catch { /* ignore */ }

    try {
      const approvedAgg = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'withdrawal', status: { in: ['approved', 'paid'] } } })
      approvedAmount = approvedAgg._sum.amount || 0
    } catch { /* ignore */ }

    const formattedWithdrawals = withdrawals.map((w: any) => ({
      ...w,
      userName: w.user?.name || 'Usuário',
      userEmail: w.user?.email || '',
    }))

    return success({
      withdrawals: formattedWithdrawals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        pendingCount,
        approvedCount,
        rejectedCount,
        pendingAmount,
        approvedAmount,
      },
    })
  } catch (err) {
    console.error('Get admin withdrawals error:', err)
    return error('Failed to fetch withdrawals', 500)
  }
}
