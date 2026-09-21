import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/dashboard — aggregated stats for the /admingeral home screen.
// Returns counts for each app surface (clientes, motoristas, lojistas, stores,
// orders, products, banners, categories) + today/week revenue + pending items.

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 3600 * 1000)

    // User counts by type (run in parallel, each guarded)
    const [
      totalClientes,
      totalMotoristas,
      totalLojistas,
      totalEntregadores,
      totalStores,
      activeStores,
      pendingStoreApprovals,
      totalProducts,
      totalOrders,
      pendingOrders,
      todayOrders,
      weekOrders,
      totalBanners,
      activeBanners,
      totalCategories,
      activeCategories,
      pendingDrivers,
      approvedDrivers,
    ] = await Promise.all([
      prisma.user.count({ where: { userType: { in: ['usuario', 'cliente'] } } }).catch(() => 0),
      prisma.user.count({ where: { isDriver: true } }).catch(() => 0),
      prisma.user.count({ where: { userType: 'lojista' } }).catch(() => 0),
      prisma.user.count({ where: { isDelivery: true } }).catch(() => 0),
      prisma.appStore.count().catch(() => 0),
      prisma.appStore.count({ where: { isActive: true } }).catch(() => 0),
      prisma.appStore.count({ where: { isVerified: false, isActive: true } }).catch(() => 0),
      prisma.appProduct.count().catch(() => 0),
      prisma.appOrder.count().catch(() => 0),
      prisma.appOrder.count({ where: { status: 'pending' } }).catch(() => 0),
      prisma.appOrder.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
      prisma.appOrder.count({ where: { createdAt: { gte: weekStart } } }).catch(() => 0),
      prisma.mobileBanner.count().catch(() => 0),
      prisma.mobileBanner.count({ where: { isActive: true } }).catch(() => 0),
      prisma.appCategory.count().catch(() => 0),
      prisma.appCategory.count({ where: { isActive: true } }).catch(() => 0),
      prisma.driverApplication.count({ where: { status: 'pending' } }).catch(() => 0),
      prisma.driverApplication.count({ where: { status: 'approved' } }).catch(() => 0),
    ])

    // Revenue aggregation (today + week)
    let todayRevenueCents = 0
    let weekRevenueCents = 0
    try {
      const todayAgg = await prisma.appOrder.aggregate({
        _sum: { totalCents: true },
        where: { createdAt: { gte: todayStart }, status: { in: ['entregue', 'entrega'] } },
      })
      todayRevenueCents = todayAgg._sum.totalCents || 0
    } catch { /* ignore */ }
    try {
      const weekAgg = await prisma.appOrder.aggregate({
        _sum: { totalCents: true },
        where: { createdAt: { gte: weekStart }, status: { in: ['entregue', 'entrega'] } },
      })
      weekRevenueCents = weekAgg._sum.totalCents || 0
    } catch { /* ignore */ }

    // Recent orders (last 5)
    let recentOrders: unknown[] = []
    try {
      recentOrders = await prisma.appOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { name: true, logoUrl: true } },
          customer: { select: { name: true } },
        },
      })
    } catch { /* ignore */ }

    return success({
      users: {
        clientes: totalClientes,
        motoristas: totalMotoristas,
        lojistas: totalLojistas,
        entregadores: totalEntregadores,
      },
      stores: {
        total: totalStores,
        active: activeStores,
        pendingApprovals: pendingStoreApprovals,
      },
      products: { total: totalProducts },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        today: todayOrders,
        week: weekOrders,
      },
      revenue: {
        todayCents: todayRevenueCents,
        weekCents: weekRevenueCents,
      },
      banners: {
        total: totalBanners,
        active: activeBanners,
      },
      categories: {
        total: totalCategories,
        active: activeCategories,
      },
      drivers: {
        pending: pendingDrivers,
        approved: approvedDrivers,
      },
      recentOrders,
    })
  } catch (err) {
    console.error('[/api/admingeral/dashboard] error:', err)
    return error('Internal server error', 500)
  }
}
