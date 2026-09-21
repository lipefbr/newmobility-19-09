import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const ACTIVITY_TYPES: Record<string, { label: string; iconType: string; colorType: string }> = {
  cashback_entry: { label: 'CashBack Entrada', iconType: 'cashback', colorType: 'emerald' },
  cashback_residual: { label: 'CashBack Residual', iconType: 'cashback', colorType: 'teal' },
  cashback_sales: { label: 'CashBack Vendas', iconType: 'cashback', colorType: 'amber' },
  deposit: { label: 'Depósito', iconType: 'upgrade', colorType: 'emerald' },
  withdrawal: { label: 'Saque', iconType: 'withdrawal', colorType: 'purple' },
  gratification: { label: 'Gratificação', iconType: 'gratification', colorType: 'teal' },
  bonus: { label: 'Bônus', iconType: 'points', colorType: 'amber' },
  transfer_out: { label: 'Transferência Enviada', iconType: 'withdrawal', colorType: 'orange' },
  transfer_in: { label: 'Transferência Recebida', iconType: 'cashback', colorType: 'teal' },
  voucher: { label: 'Voucher', iconType: 'voucher', colorType: 'pink' },
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50)

    // Fetch recent transactions
    const transactions = await db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Fetch recent cashback entries
    const cashbackEntries = await db.cashbackEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const cashbackResidual = await db.cashbackResidual.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const cashbackVendas = await db.cashbackSales.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Fetch recent gratifications
    const gratifications = await db.gratification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Build unified activity list
    const activities: Array<{
      id: string
      type: string
      description: string
      amount?: number
      time: string
      iconType: string
      colorType: string
    }> = []

    // Add transactions
    for (const tx of transactions) {
      const typeInfo = ACTIVITY_TYPES[tx.type] || { label: tx.type, iconType: 'system', colorType: 'gray' }
      activities.push({
        id: tx.id,
        type: typeInfo.iconType,
        description: tx.description || typeInfo.label,
        amount: tx.amount,
        time: tx.createdAt.toISOString(),
        iconType: typeInfo.iconType,
        colorType: typeInfo.colorType,
      })
    }

    // Add cashback entries (if not already covered by transactions)
    for (const cb of cashbackEntries) {
      if (!transactions.find(tx => tx.description?.includes('Entrada') && tx.createdAt.getTime() === cb.createdAt.getTime())) {
        activities.push({
          id: `cb_e_${cb.id}`,
          type: 'cashback',
          description: `CashBack Entrada - Nível ${cb.level}`,
          amount: cb.amount,
          time: cb.createdAt.toISOString(),
          iconType: 'cashback',
          colorType: 'emerald',
        })
      }
    }

    for (const cb of cashbackResidual) {
      activities.push({
        id: `cb_r_${cb.id}`,
        type: 'cashback',
        description: `CashBack Residual - Nível ${cb.level}`,
        amount: cb.amount,
        time: cb.createdAt.toISOString(),
        iconType: 'cashback',
        colorType: 'teal',
      })
    }

    for (const cb of cashbackVendas) {
      activities.push({
        id: `cb_v_${cb.id}`,
        type: 'cashback',
        description: `CashBack Vendas - Nível ${cb.level}`,
        amount: cb.amount,
        time: cb.createdAt.toISOString(),
        iconType: 'cashback',
        colorType: 'amber',
      })
    }

    // Add gratifications
    for (const g of gratifications) {
      activities.push({
        id: `grat_${g.id}`,
        type: 'gratification',
        description: `Gratificação: ${g.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
        amount: g.amount,
        time: g.createdAt.toISOString(),
        iconType: 'gratification',
        colorType: 'teal',
      })
    }

    // Sort by time descending and take limit
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    const result = activities.slice(0, limit)

    return success({ activities: result, total: activities.length })
  } catch (err) {
    return error('Failed to fetch activity data', 500)
  }
}
