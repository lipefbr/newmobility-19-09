import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/me — returns the authenticated admin profile + a flag
// confirming app-admin access. Used by /admingeral/login to validate after
// authenticating against /api/auth/login.

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const admin = await requireAppAdmin(userId)
    if (!admin) {
      return error('Unauthorized', 403)
    }

    // Count pending items for the dashboard badge
    const [pendingDrivers, pendingStores, pendingOrders] = await Promise.all([
      prisma.driverApplication.count({ where: { status: 'pending' } }).catch(() => 0),
      prisma.appStore.count({ where: { isVerified: false, isActive: true } }).catch(() => 0),
      prisma.appOrder.count({ where: { status: 'pending' } }).catch(() => 0),
    ])

    return success({
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        profileImage: admin.profileImage,
        role: admin.role,
        userType: admin.userType,
      },
      isAppAdmin: true,
      pendingCounts: {
        drivers: pendingDrivers,
        stores: pendingStores,
        orders: pendingOrders,
      },
    })
  } catch (err) {
    console.error('[/api/admingeral/me] error:', err)
    return error('Internal server error', 500)
  }
}
