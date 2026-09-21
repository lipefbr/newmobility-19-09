import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, operations, description } = body
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return error('operations array is required', 400)
    }

    const walletFields = [
      'balanceWithdrawal', 'balanceMobility', 'balanceShopping',
      'balanceFood', 'balancePharmacy', 'balanceGratification'
    ] as const

    type WalletField = typeof walletFields[number]

    const results: Array<{ userId: string; success: boolean; message: string }> = []

    for (const op of operations) {
      const { targetUserId, wallet, amount, opDescription } = op

      if (!targetUserId || !wallet || amount === undefined) {
        results.push({ userId: targetUserId || 'unknown', success: false, message: 'Missing required fields' })
        continue
      }

      if (!walletFields.includes(wallet as WalletField)) {
        results.push({ userId: targetUserId, success: false, message: `Invalid wallet: ${wallet}` })
        continue
      }

      try {
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
        if (!targetUser) {
          results.push({ userId: targetUserId, success: false, message: 'User not found' })
          continue
        }

        const amountCents = Math.round(amount * 100)
        const currentBalance = (targetUser as any)[wallet] || 0

        if (amountCents < 0 && currentBalance + amountCents < 0) {
          results.push({ userId: targetUserId, success: false, message: 'Insufficient balance' })
          continue
        }

        await prisma.user.update({
          where: { id: targetUserId },
          data: { [wallet]: currentBalance + amountCents },
        })

        await prisma.transaction.create({
          data: {
            userId: targetUserId,
            type: amountCents >= 0 ? 'deposit' : 'withdrawal',
            amount: Math.abs(amountCents),
            status: 'approved',
            category: wallet.replace('balance', '').toLowerCase(),
            description: opDescription || description || `Batch admin operation: ${wallet}`,
          },
        })

        results.push({ userId: targetUserId, success: true, message: `Updated ${wallet} by ${amountCents >= 0 ? '+' : ''}${amountCents}` })
      } catch (err) {
        results.push({ userId: targetUserId, success: false, message: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    await prisma.systemConfig.upsert({
      where: { key: `batch_release_${Date.now()}` },
      update: {},
      create: {
        key: `batch_release_${Date.now()}`,
        value: JSON.stringify({
          adminId: userId,
          description: description || 'Batch wallet operation',
          totalOperations: operations.length,
          successCount,
          failCount,
          timestamp: new Date().toISOString(),
        }),
        description: 'Batch wallet release log',
      },
    })

    return success({
      results,
      total: operations.length,
      successCount,
      failCount,
      message: `${successCount} operations succeeded, ${failCount} failed`,
    })
  } catch (err) {
    return error('Failed to process batch release: ' + (err instanceof Error ? err.message : 'Unknown error'), 500)
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    let logs: any[] = []
    let total = 0

    try {
      logs = await prisma.systemConfig.findMany({
        where: { key: { startsWith: 'batch_release_' } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      })
    } catch { /* ignore */ }

    try {
      total = await prisma.systemConfig.count({ where: { key: { startsWith: 'batch_release_' } } })
    } catch { /* ignore */ }

    const history = logs.map(log => {
      try {
        return { id: log.id, ...JSON.parse(log.value), key: log.key, updatedAt: log.updatedAt }
      } catch {
        return { id: log.id, key: log.key, value: log.value, updatedAt: log.updatedAt }
      }
    })

    return success({ history, total, page, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    return error('Failed to fetch release history', 500)
  }
}
