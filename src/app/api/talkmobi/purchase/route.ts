import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// POST /api/talkmobi/purchase
// Body: { userId, planId, wallet? }
// wallet: which balance to debit — 'withdrawal' (default) | 'mobility'
// Deducts the plan price from the chosen wallet, credits cashback to mobility wallet,
// awards reward points (career + personal), creates audit transactions and a notification.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, planId, wallet = 'withdrawal' } = body

    if (!userId) return error('userId is required', 400)
    if (!planId) return error('planId is required', 400)
    if (!['withdrawal', 'mobility'].includes(wallet)) return error('wallet must be withdrawal or mobility', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return error('User not found', 404)

    // Block purchases for free plan users (must pay their own subscription first)
    if (user.plan === 'free' && user.role !== 'admin') {
      return error('Você precisa assinar um plano para comprar recargas TalkMobi. Acesse "Meu Plano" para assinar.', 403)
    }

    const plan = await prisma.talkMobiPlan.findUnique({ where: { id: planId } })
    if (!plan || !plan.isActive) return error('Plano não encontrado ou inativo', 404)

    const price = plan.priceCents
    const walletField = wallet === 'mobility' ? 'balanceMobility' : 'balanceWithdrawal'
    const available = (user as unknown as Record<string, number>)[walletField] || 0
    if (available < price) {
      const walletLabel = wallet === 'mobility' ? 'Carteira Mobilidade' : 'Saldo Saque'
      return error(`Saldo insuficiente na ${walletLabel}. Você tem ${(available / 100).toFixed(2).replace('.', ',')} e o plano custa ${(price / 100).toFixed(2).replace('.', ',')}.`, 400)
    }

    // Debit price from chosen wallet
    const updateData: Record<string, number> = {}
    updateData[walletField] = available - price

    // Credit cashback to mobility wallet (cashbackCents)
    if (plan.cashbackCents > 0) {
      updateData.balanceMobility = (user.balanceMobility || 0) + plan.cashbackCents
    }
    // Award reward points
    if (plan.rewardPoints > 0) {
      updateData.careerPoints = (user.careerPoints || 0) + plan.rewardPoints
      updateData.personalPoints = (user.personalPoints || 0) + plan.rewardPoints
    }

    await prisma.user.update({ where: { id: userId }, data: updateData })

    // Audit: debit transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'talkmobi_purchase',
        amount: -price,
        status: 'approved',
        category: wallet === 'mobility' ? 'mobility' : 'withdrawal',
        description: `Recarga TalkMobi — ${plan.name} (${plan.dataAmount})`,
      },
    })

    // Audit: cashback credit transaction
    if (plan.cashbackCents > 0) {
      await prisma.transaction.create({
        data: {
          userId,
          type: 'cashback_sales',
          amount: plan.cashbackCents,
          status: 'approved',
          category: 'mobility',
          description: `CashBack TalkMobi — ${plan.name}`,
        },
      })
    }

    // Reward points transaction
    if (plan.rewardPoints > 0) {
      await prisma.pointTransaction.create({
        data: {
          userId,
          amount: plan.rewardPoints,
          type: 'reward',
          description: `Pontos TalkMobi — ${plan.name}`,
        },
      })
    }

    // Notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Recarga TalkMobi confirmada!',
        message: `Seu plano ${plan.name} (${plan.dataAmount}) foi ativado.${plan.cashbackCents > 0 ? ` Você recebeu R$ ${(plan.cashbackCents / 100).toFixed(2).replace('.', ',')} de cashback.` : ''}${plan.rewardPoints > 0 ? ` +${plan.rewardPoints} pontos de recompensa.` : ''}`,
        type: 'system',
      },
    })

    const newBalanceWithdrawal = walletField === 'balanceWithdrawal' ? updateData.balanceWithdrawal : user.balanceWithdrawal
    const newBalanceMobility = updateData.balanceMobility ?? user.balanceMobility

    return success({
      ok: true,
      plan: { id: plan.id, name: plan.name, dataAmount: plan.dataAmount, priceCents: plan.priceCents },
      debitedFrom: walletField,
      price,
      cashback: plan.cashbackCents,
      rewardPoints: plan.rewardPoints,
      newBalanceWithdrawal,
      newBalanceMobility,
    })
  } catch (err) {
    console.error('TalkMobi purchase error:', err)
    return error('Failed to process TalkMobi purchase', 500)
  }
}
