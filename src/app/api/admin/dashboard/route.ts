import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const adminUserId = req.nextUrl.searchParams.get('userId')
    if (!adminUserId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Core stats - run sequentially to avoid SQLite issues
    let totalUsers = 0
    let activeUsers = 0
    let newUsersToday = 0
    let totalRevenue = 0
    let pendingWithdrawals = 0
    let pendingWithdrawalsCount = 0
    let totalCashbackDistributed = 0

    try { totalUsers = await prisma.user.count() } catch { /* ignore */ }
    try { activeUsers = await prisma.user.count({ where: { isActive: true } }) } catch { /* ignore */ }
    try { newUsersToday = await prisma.user.count({ where: { createdAt: { gte: todayStart } } }) } catch { /* ignore */ }

    try {
      const revenueAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'paid', type: { in: ['deposit', 'cashback_entry', 'cashback_residual', 'cashback_sales', 'gratification', 'bonus'] } },
      })
      totalRevenue = revenueAgg._sum.amount || 0
    } catch { /* ignore */ }

    try {
      const pendingWdAgg = await prisma.transaction.aggregate({
        _sum: { amount: true }, _count: true,
        where: { type: 'withdrawal', status: 'pending' },
      })
      pendingWithdrawals = pendingWdAgg._sum.amount || 0
      pendingWithdrawalsCount = pendingWdAgg._count || 0
    } catch { /* ignore */ }

    try {
      const cashbackAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: { in: ['cashback_entry', 'cashback_residual', 'cashback_sales'] }, status: 'approved' },
      })
      totalCashbackDistributed = cashbackAgg._sum.amount || 0
    } catch { /* ignore */ }

    // Plan distribution
    let planDistribution: { plan: string; count: number }[] = []
    try {
      const allUsers = await prisma.user.findMany({ select: { plan: true } })
      const planMap: Record<string, number> = {}
      for (const u of allUsers) {
        planMap[u.plan] = (planMap[u.plan] || 0) + 1
      }
      planDistribution = Object.entries(planMap).map(([plan, count]) => ({ plan, count }))
    } catch { /* ignore */ }

    // Recent transactions
    let recentTransactions: any[] = []
    try {
      recentTransactions = await prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
    } catch { /* ignore */ }

    // Top earners
    let topEarners: any[] = []
    try {
      topEarners = await prisma.user.findMany({
        take: 10,
        orderBy: { balanceWithdrawal: 'desc' },
        select: { id: true, name: true, email: true, plan: true, balanceWithdrawal: true, careerPoints: true },
      })
    } catch { /* ignore */ }

    // Monthly growth
    let thisMonthUsers = 0
    let lastMonthUsers = 0
    try { thisMonthUsers = await prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }) } catch { /* ignore */ }
    try { lastMonthUsers = await prisma.user.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }) } catch { /* ignore */ }

    const monthlyGrowth = lastMonthUsers > 0
      ? Number((((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100).toFixed(1))
      : 100

    // Monthly growth data (last 6 months)
    const monthlyGrowthData = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      let monthUsers = 0
      let monthRevenue = 0
      try { monthUsers = await prisma.user.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }) } catch { /* ignore */ }
      try {
        const monthRevAgg = await prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { status: 'paid', createdAt: { gte: monthStart, lt: monthEnd }, type: { in: ['deposit', 'bonus'] } },
        })
        monthRevenue = monthRevAgg._sum.amount || 0
      } catch { /* ignore */ }
      monthlyGrowthData.push({
        month: monthStart.toISOString().slice(0, 7),
        newUsers: monthUsers,
        revenue: monthRevenue,
      })
    }

    // Pending withdrawals list
    let pendingWithdrawalsList: any[] = []
    try {
      pendingWithdrawalsList = await prisma.transaction.findMany({
        where: { type: 'withdrawal', status: 'pending' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
    } catch { /* ignore */ }

    return success({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      newUsersToday,
      totalRevenue,
      pendingWithdrawals,
      pendingWithdrawalsCount,
      totalCashbackDistributed,
      planDistribution,
      recentTransactions,
      topEarners,
      monthlyGrowth,
      monthlyGrowthData,
      pendingWithdrawalsList,
    })
  } catch (err) {
    console.error('Admin dashboard GET error:', err)
    return error('Failed to fetch dashboard data', 500)
  }
}
