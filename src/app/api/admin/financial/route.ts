import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') {
      return error('Unauthorized', 403)
    }

    // Run queries sequentially to avoid memory issues
    let totalRevenue = 0
    let totalPlatformBalance = 0
    let pendingWithdrawals = 0
    let approvedWithdrawals = 0
    let totalCashback = 0
    let totalInCirculation = 0
    let recentTransactions: { id: string; userId: string; userName: string; userEmail: string; type: string; amount: number; status: string; category: string; description: string; createdAt: string | Date }[] = []
    let monthlyRevenue: { month: string; revenue: number }[] = []
    let categoryBreakdown: { category: string; amount: number }[] = []

    try {
      const revenueAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: { in: ['deposit', 'plan_payment'] }, status: { in: ['paid', 'approved'] } },
      })
      totalRevenue = revenueAgg._sum.amount || 0
    } catch { /* ignore */ }

    try {
      const platformBalanceAgg = await prisma.user.aggregate({ _sum: { balanceWithdrawal: true } })
      totalPlatformBalance = platformBalanceAgg._sum.balanceWithdrawal || 0
    } catch { /* ignore */ }

    try {
      const pendingWithdrawalsAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'withdrawal', status: 'pending' },
      })
      // Tarefa (22/09): saques são armazenados como valor negativo no DB.
      // Convertemos para absoluto para que o card mostre um valor positivo.
      pendingWithdrawals = Math.abs(pendingWithdrawalsAgg._sum.amount || 0)
    } catch { /* ignore */ }

    try {
      const approvedWithdrawalsAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'withdrawal', status: { in: ['approved', 'paid'] } },
      })
      approvedWithdrawals = Math.abs(approvedWithdrawalsAgg._sum.amount || 0)
    } catch { /* ignore */ }

    // Tarefa (22/09): também soma company_withdrawal (saque do lucro da empresa)
    try {
      const companyWithdrawalsAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'company_withdrawal', status: 'approved' },
      })
      approvedWithdrawals += Math.abs(companyWithdrawalsAgg._sum.amount || 0)
    } catch { /* ignore */ }

    try {
      const totalCashbackAgg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: { in: ['cashback_entry', 'cashback_residual', 'cashback_sales'] }, status: { in: ['paid', 'approved'] } },
      })
      totalCashback = totalCashbackAgg._sum.amount || 0
    } catch { /* ignore */ }

    try {
      const circulationAgg = await prisma.user.aggregate({
        _sum: {
          balanceWithdrawal: true,
          balanceMobility: true,
          balanceShopping: true,
          balanceFood: true,
          balancePharmacy: true,
          balanceGratification: true,
          balancePaymentInvoice: true,
        },
      })
      const circ = circulationAgg._sum
      totalInCirculation =
        (circ.balanceWithdrawal || 0) +
        (circ.balanceMobility || 0) +
        (circ.balanceShopping || 0) +
        (circ.balanceFood || 0) +
        (circ.balancePharmacy || 0) +
        (circ.balanceGratification || 0) +
        (circ.balancePaymentInvoice || 0)
    } catch { /* ignore */ }

    try {
      const recentTransactionsRaw = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { name: true, email: true } },
        },
      })

      recentTransactions = recentTransactionsRaw.map((t: any) => ({
        id: t.id,
        userId: t.userId,
        userName: t.user?.name || 'Usuário',
        userEmail: t.user?.email || '',
        type: t.type,
        amount: t.amount,
        status: t.status,
        category: t.category || '',
        description: t.description || '',
        createdAt: t.createdAt,
      }))
    } catch { /* ignore */ }

    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const monthlyTx = await prisma.transaction.findMany({
        where: {
          type: { in: ['deposit', 'plan_payment'] },
          status: { in: ['paid', 'approved'] },
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true, amount: true },
        orderBy: { createdAt: 'desc' },
      })

      const monthMap: Record<string, number> = {}
      for (const tx of monthlyTx) {
        const month = tx.createdAt.toISOString().slice(0, 7)
        monthMap[month] = (monthMap[month] || 0) + tx.amount
      }
      monthlyRevenue = Object.entries(monthMap)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => b.month.localeCompare(a.month))
    } catch { /* ignore */ }

    try {
      const categoryTx = await prisma.transaction.findMany({
        where: { status: { in: ['paid', 'approved'] } },
        select: { category: true, amount: true },
      })

      const catMap: Record<string, number> = {}
      for (const tx of categoryTx) {
        const cat = tx.category || 'other'
        catMap[cat] = (catMap[cat] || 0) + tx.amount
      }
      categoryBreakdown = Object.entries(catMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
    } catch { /* ignore */ }

    return success({
      overview: {
        totalRevenue,
        totalPlatformBalance,
        pendingWithdrawals,
        approvedWithdrawals,
        totalCashback,
        totalInCirculation,
      },
      recentTransactions,
      monthlyRevenue,
      categoryBreakdown,
    })
  } catch (err) {
    console.error('Admin financial GET error:', err)
    return error('Failed to fetch financial data', 500)
  }
}
