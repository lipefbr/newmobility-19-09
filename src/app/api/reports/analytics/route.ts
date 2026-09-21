import { NextRequest } from 'next/server'
import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const period = req.nextUrl.searchParams.get('period') || '30d'
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)

    // Revenue trends (monthly)
    const transactions = await db.find(
      'Transaction',
      '"userId" = $1 AND "createdAt" >= $2 AND status = $3',
      [userId, startDate, 'paid'],
      'ORDER BY "createdAt" ASC'
    ) as any[]

    // Group by month for revenue trends
    const monthlyRevenue: Record<string, number> = {}
    const monthlyCashback: Record<string, { entrada: number; residual: number; vendas: number }> = {}

    transactions.forEach(t => {
      const date = new Date(t.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyRevenue[monthKey]) monthlyRevenue[monthKey] = 0
      monthlyRevenue[monthKey] += t.amount

      if (!monthlyCashback[monthKey]) monthlyCashback[monthKey] = { entrada: 0, residual: 0, vendas: 0 }
      if (t.type === 'cashback_entry') monthlyCashback[monthKey].entrada += t.amount
      if (t.type === 'cashback_residual') monthlyCashback[monthKey].residual += t.amount
      if (t.type === 'cashback_sales') monthlyCashback[monthKey].vendas += t.amount
    })

    const revenueTrends = Object.entries(monthlyRevenue).map(([month, amount]) => ({ month, amount }))
    const cashbackDistribution = Object.entries(monthlyCashback).map(([month, data]) => ({
      month,
      ...data,
      total: data.entrada + data.residual + data.vendas,
    }))

    // Network growth - get all downline recursively
    const user = await db.findOne('User', '"id" = $1', [userId])
    const getAllDownline = async (uid: string, depth = 10): Promise<string[]> => {
      if (depth <= 0) return []
      const direct = await db.find('User', '"referredById" = $1', [uid]) as any[]
      const ids = direct.map(d => d.id)
      const nested = await Promise.all(ids.map(id => getAllDownline(id, depth - 1)))
      return [...ids, ...nested.flat()]
    }
    const downlineIds = await getAllDownline(userId)

    // Network growth within period
    let networkGrowthData: { month: string; count: number }[] = []
    if (downlineIds.length > 0) {
      const networkMembers = await prisma.user.findMany({
        where: {
          id: { in: downlineIds },
          createdAt: { gte: startDate },
        },
        select: { createdAt: true },
      })

      const networkGrowth: Record<string, number> = {}
      networkMembers.forEach(m => {
        const monthKey = `${new Date(m.createdAt).getFullYear()}-${String(new Date(m.createdAt).getMonth() + 1).padStart(2, '0')}`
        networkGrowth[monthKey] = (networkGrowth[monthKey] || 0) + 1
      })
      networkGrowthData = Object.entries(networkGrowth).map(([month, count]) => ({ month, count }))
    }

    // Plan distribution
    const allIds = [userId, ...downlineIds]
    const planDistributionRaw = await prisma.user.groupBy({
      by: ['plan'],
      where: { id: { in: allIds } },
      _count: { plan: true },
    })
    const planDistribution = planDistributionRaw.map(p => ({ plan: p.plan, count: p._count.plan }))

    // Category spending
    const categorySpendingRaw = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId: userId,
        createdAt: { gte: startDate },
        status: 'paid',
      },
      _sum: { amount: true },
      _count: { id: true },
    })
    const categorySpending = categorySpendingRaw.map(c => ({
      category: c.category || 'other',
      amount: c._sum.amount || 0,
      count: c._count.id,
    }))

    return success({
      period,
      periodDays,
      revenueTrends,
      cashbackDistribution,
      networkGrowth: networkGrowthData,
      planDistribution,
      categorySpending,
      totalNetworkSize: downlineIds.length + 1,
      summary: {
        totalRevenue: transactions.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0),
        totalWithdrawals: transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + Math.abs(t.amount), 0),
        totalCashback: transactions.filter(t => t.type.startsWith('cashback')).reduce((s, t) => s + t.amount, 0),
        totalTransactions: transactions.length,
      },
    })
  } catch (err) {
    return error('Failed to fetch analytics', 500)
  }
}
