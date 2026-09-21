import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// GET recent activity feed for admin dashboard
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')

    // Recent user registrations
    const recentRegistrations = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, name: true, email: true, plan: true, isActive: true, createdAt: true },
    })

    // Recent plan purchases (transactions of type plan_payment)
    const recentPlanPurchases = await prisma.transaction.findMany({
      where: { type: 'plan_payment' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, userId: true, amount: true, status: true, createdAt: true, description: true,
        user: { select: { name: true, email: true, plan: true } },
      },
    })

    // Recent withdrawals
    const recentWithdrawals = await prisma.transaction.findMany({
      where: { type: 'withdrawal' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, userId: true, amount: true, status: true, createdAt: true,
        user: { select: { name: true, email: true } },
      },
    })

    // System health check
    let dbHealthy = false
    let lastSeedDate: string | null = null
    try {
      await prisma.user.count()
      dbHealthy = true
    } catch { dbHealthy = false }

    try {
      const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } })
      lastSeedDate = firstUser?.createdAt?.toISOString() || null
    } catch { /* ignore */ }

    // Total user count
    const userCount = await prisma.user.count()
    const activeCount = await prisma.user.count({ where: { isActive: true } })

    // Pending withdrawals
    const pendingWithdrawalsCount = await prisma.transaction.count({ where: { type: 'withdrawal', status: 'pending' } })
    const pendingWithdrawalsAgg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'withdrawal', status: 'pending' },
    })

    // Combine into a unified activity feed, sorted by date
    const activities: Array<{
      id: string
      type: 'registration' | 'plan_purchase' | 'withdrawal'
      title: string
      description: string
      userName: string
      userEmail: string
      amount?: number
      status?: string
      createdAt: string
      icon: string
    }> = []

    for (const u of recentRegistrations) {
      activities.push({
        id: `reg_${u.id}`,
        type: 'registration',
        title: 'Novo Cadastro',
        description: `${u.name} se cadastrou no plano ${u.plan || 'free'}`,
        userName: u.name || 'Usuário',
        userEmail: u.email || '',
        createdAt: u.createdAt.toISOString(),
        icon: 'user-plus',
      })
    }

    for (const p of recentPlanPurchases) {
      activities.push({
        id: `plan_${p.id}`,
        type: 'plan_purchase',
        title: 'Compra de Plano',
        description: `${p.user?.name || 'Usuário'} adquiriu plano ${p.user?.plan || ''}`,
        userName: p.user?.name || 'Usuário',
        userEmail: p.user?.email || '',
        amount: Number(p.amount || 0),
        status: p.status || undefined,
        createdAt: p.createdAt.toISOString(),
        icon: 'credit-card',
      })
    }

    for (const w of recentWithdrawals) {
      activities.push({
        id: `wd_${w.id}`,
        type: 'withdrawal',
        title: 'Solicitação de Saque',
        description: `${w.user?.name || 'Usuário'} solicitou saque`,
        userName: w.user?.name || 'Usuário',
        userEmail: w.user?.email || '',
        amount: Number(w.amount || 0),
        status: w.status || undefined,
        createdAt: w.createdAt.toISOString(),
        icon: 'wallet',
      })
    }

    // Sort by date descending
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return success({
      activities: activities.slice(0, limit),
      systemHealth: {
        databaseConnected: dbHealthy,
        lastSeedDate,
        totalUsers: userCount,
        activeUsers: activeCount,
        pendingWithdrawals: pendingWithdrawalsCount,
        pendingWithdrawalAmount: pendingWithdrawalsAgg._sum.amount || 0,
      },
    })
  } catch (err) {
    console.error('Admin activity GET error:', err)
    return error('Failed to fetch activity data', 500)
  }
}
