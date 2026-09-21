import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { randomBytes } from 'crypto'

// Reward catalog: id -> { cost, type, amount, label, description }
const REWARDS_CATALOG: Record<string, {
  cost: number
  type: 'cashback_mobility' | 'cashback_food' | 'cashback_shopping' | 'voucher' | 'cashback_withdrawal' | 'stars'
  amount: number // in cents for cashback/voucher
  label: string
  description: string
}> = {
  cashback_10: {
    cost: 100,
    type: 'cashback_mobility',
    amount: 1000, // R$ 10.00
    label: 'Cashback Mobilidade R$ 10',
    description: 'R$ 10 de crédito na carteira Mobilidade',
  },
  cashback_25: {
    cost: 220,
    type: 'cashback_food',
    amount: 2500, // R$ 25.00
    label: 'Cashback Alimentação R$ 25',
    description: 'R$ 25 de crédito na carteira Alimentação',
  },
  cashback_50: {
    cost: 400,
    type: 'cashback_shopping',
    amount: 5000, // R$ 50.00
    label: 'Cashback Shopping R$ 50',
    description: 'R$ 50 de crédito na carteira Shopping',
  },
  cashback_100: {
    cost: 750,
    type: 'cashback_withdrawal',
    amount: 10000, // R$ 100.00
    label: 'Cashback Saque R$ 100',
    description: 'R$ 100 de crédito na carteira Saque',
  },
  voucher_15: {
    cost: 150,
    type: 'voucher',
    amount: 1500,
    label: 'Voucher Presente R$ 15',
    description: 'Voucher de R$ 15 para usar em qualquer loja parceira',
  },
  voucher_50: {
    cost: 450,
    type: 'voucher',
    amount: 5000,
    label: 'Voucher Presente R$ 50',
    description: 'Voucher de R$ 50 para usar em qualquer loja parceira',
  },
}

export async function GET() {
  // Return the catalog
  const catalog = Object.entries(REWARDS_CATALOG).map(([id, r]) => ({
    id,
    ...r,
  }))
  return success({ catalog })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, rewardId } = body as { userId: string; rewardId: string }

    if (!userId || !rewardId) {
      return error('userId e rewardId são obrigatórios')
    }

    const reward = REWARDS_CATALOG[rewardId]
    if (!reward) {
      return error('Recompensa inválida')
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        stars: true,
        balanceWithdrawal: true,
        balanceMobility: true,
        balanceShopping: true,
        balanceFood: true,
      },
    })

    if (!user) {
      return error('Usuário não encontrado', 404)
    }

    if (user.stars < reward.cost) {
      return error(`Estrelas insuficientes. Você tem ${user.stars} ⭐, necessário ${reward.cost} ⭐`, 400)
    }

    // Generate voucher code for voucher type
    const voucherCode = reward.type === 'voucher'
      ? 'NM' + randomBytes(6).toString('hex').toUpperCase()
      : null

    // Transaction: deduct stars
    await prisma.$transaction(async (tx) => {
      // 1. Deduct stars from user
      const updateData: any = { stars: user.stars - reward.cost }

      // 2. Credit the appropriate wallet for cashback types
      if (reward.type === 'cashback_mobility') {
        updateData.balanceMobility = user.balanceMobility + reward.amount
      } else if (reward.type === 'cashback_food') {
        updateData.balanceFood = user.balanceFood + reward.amount
      } else if (reward.type === 'cashback_shopping') {
        updateData.balanceShopping = user.balanceShopping + reward.amount
      } else if (reward.type === 'cashback_withdrawal') {
        updateData.balanceWithdrawal = user.balanceWithdrawal + reward.amount
      }

      await tx.user.update({
        where: { id: userId },
        data: updateData,
      })

      // 3. Create point transaction (negative, for redemption)
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: -reward.cost,
          type: 'reward_redeemed',
          description: `Resgate: ${reward.label}${voucherCode ? ` (Código: ${voucherCode})` : ''}`,
          referenceId: rewardId,
        },
      })

      // 4. For voucher type, create a Voucher record
      if (reward.type === 'voucher' && voucherCode) {
        await tx.voucher.create({
          data: {
            userId,
            code: voucherCode,
            amount: reward.amount,
            type: 'gift',
            isUsed: false,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          },
        })
      }

      // 5. Create notification
      await tx.notification.create({
        data: {
          userId,
          title: 'Recompensa Resgatada! 🎁',
          message: `Você resgatou: ${reward.label}${voucherCode ? ` — Código: ${voucherCode}` : ''}. ${reward.amount > 0 ? `Valor: R$ ${(reward.amount / 100).toFixed(2)}` : ''}`,
          type: 'reward',
        },
      })
    })

    // Fetch updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stars: true,
        balanceWithdrawal: true,
        balanceMobility: true,
        balanceShopping: true,
        balanceFood: true,
      },
    })

    return success({
      success: true,
      reward: reward.label,
      voucherCode,
      newStars: updatedUser?.stars ?? user.stars - reward.cost,
      newBalances: {
        balanceWithdrawal: updatedUser?.balanceWithdrawal ?? user.balanceWithdrawal,
        balanceMobility: updatedUser?.balanceMobility ?? user.balanceMobility,
        balanceShopping: updatedUser?.balanceShopping ?? user.balanceShopping,
        balanceFood: updatedUser?.balanceFood ?? user.balanceFood,
      },
    })
  } catch (err) {
    console.error('Games redeem error:', err)
    return error('Erro interno do servidor', 500)
  }
}
