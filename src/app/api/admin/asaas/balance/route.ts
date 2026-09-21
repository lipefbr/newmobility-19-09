import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import {
  getAsaasConfig,
  getAccountBalance,
  AsaasApiError,
} from '@/lib/asaas'

/**
 * GET /api/admin/asaas/balance?userId=<admin_user_id>
 * Admin-only. Returns the live Asaas account balance. If Asaas is not
 * configured, returns `{ configured: false }`.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId é obrigatório', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const config = await getAsaasConfig()
    if (!config) {
      return success({ configured: false })
    }

    let balance
    try {
      balance = await getAccountBalance()
    } catch (e) {
      if (e instanceof AsaasApiError) {
        return error(e.message, e.status || 500)
      }
      throw e
    }

    return success({
      configured: true,
      environment: config.environment,
      balance: {
        balance: balance.balance,
        transferableBalance: balance.transferableBalance ?? 0,
        blockedBalance: balance.blockedBalance ?? 0,
        pendingBalance: balance.pendingBalance ?? 0,
        upcomingBalance: balance.upcomingBalance ?? 0,
      },
    })
  } catch (err) {
    console.error('[Asaas admin balance GET] error:', err)
    return error('Internal server error', 500)
  }
}
