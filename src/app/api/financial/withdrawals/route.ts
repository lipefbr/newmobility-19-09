import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const withdrawals = await db.find(
      'Transaction',
      '"userId" = $1 AND "type" = $2',
      [userId, 'withdrawal'],
      'ORDER BY "createdAt" DESC LIMIT 50'
    )

    const withdrawalsWithTimeline = (withdrawals as any[]).map(w => {
      const createdAt = new Date(w.createdAt)
      const processingDays = w.status === 'pending' ? 1 : w.status === 'approved' ? 2 : 0
      const estimatedDate = new Date(createdAt.getTime() + processingDays * 24 * 60 * 60 * 1000)

      let steps: { status: string; label: string; completed: boolean; date: string | null }[] = []

      if (w.status === 'pending') {
        steps = [
          { status: 'pending', label: 'Solicitado', completed: true, date: new Date(w.createdAt).toISOString() },
          { status: 'processing', label: 'Processando', completed: false, date: null },
          { status: 'completed', label: 'Concluído', completed: false, date: null },
        ]
      } else if (w.status === 'approved' || w.status === 'paid') {
        steps = [
          { status: 'pending', label: 'Solicitado', completed: true, date: new Date(w.createdAt).toISOString() },
          { status: 'processing', label: 'Processando', completed: true, date: new Date(w.updatedAt).toISOString() },
          { status: 'completed', label: 'Concluído', completed: w.status === 'paid', date: w.status === 'paid' ? new Date(w.updatedAt).toISOString() : null },
        ]
      } else {
        steps = [
          { status: 'pending', label: 'Solicitado', completed: true, date: new Date(w.createdAt).toISOString() },
          { status: 'rejected', label: 'Rejeitado', completed: true, date: new Date(w.updatedAt).toISOString() },
        ]
      }

      const fee = Math.round(w.amount * 0.02)

      return {
        ...w,
        fee,
        netAmount: w.amount - fee,
        estimatedDate: estimatedDate.toISOString(),
        steps,
        processingTime: w.status === 'paid' ? '1-3 dias úteis' : 'Pendente',
      }
    })

    // Get limits from SystemConfig
    let minWithdrawal = 5000 // R$ 50 default
    let maxWithdrawal = 500000 // R$ 5000 default
    let withdrawalFee = 2 // 2% default

    try {
      const minConfig = await db.findOne('SystemConfig', '"key" = $1', ['min_withdrawal'])
      const maxConfig = await db.findOne('SystemConfig', '"key" = $1', ['max_withdrawal'])
      const feeConfig = await db.findOne('SystemConfig', '"key" = $1', ['withdrawal_fee_pct'])
      if (minConfig) minWithdrawal = parseInt((minConfig as any).value)
      if (maxConfig) maxWithdrawal = parseInt((maxConfig as any).value)
      if (feeConfig) withdrawalFee = parseFloat((feeConfig as any).value)
    } catch { /* use defaults */ }

    return success({
      withdrawals: withdrawalsWithTimeline,
      limits: { minWithdrawal, maxWithdrawal, withdrawalFee },
    })
  } catch (err) {
    return error('Failed to fetch withdrawals', 500)
  }
}
