import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'

const VALID_WALLETS = [
  'balanceWithdrawal',
  'balanceMobility',
  'balanceShopping',
  'balanceFood',
  'balancePharmacy',
  'balanceGratification',
  'balancePaymentInvoice',
] as const

type WalletKey = (typeof VALID_WALLETS)[number]

const walletCategoryMap: Record<WalletKey, string> = {
  balanceWithdrawal: 'withdrawal',
  balanceMobility: 'mobility',
  balanceShopping: 'shopping',
  balanceFood: 'food',
  balancePharmacy: 'pharmacy',
  balanceGratification: 'gratification',
  balancePaymentInvoice: 'paymentInvoice',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, wallet, amount, description } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!wallet || !VALID_WALLETS.includes(wallet)) {
      return error(`wallet must be one of: ${VALID_WALLETS.join(', ')}`, 400)
    }

    if (typeof amount !== 'number' || amount === 0) {
      return error('amount is required and must be a non-zero number', 400)
    }

    if (!description || typeof description !== 'string') {
      return error('description is required', 400)
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return error('User not found', 404)

    const walletKey = wallet as WalletKey
    const currentBalance = user[walletKey]
    const newBalance = currentBalance + amount

    // Prevent negative balance
    if (newBalance < 0) {
      return error('Insufficient balance for this operation', 400)
    }

    // Update user balance and create transaction in a single logical operation
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { [walletKey]: newBalance },
    })

    // Create corresponding transaction record
    await prisma.transaction.create({
      data: {
        userId: id,
        type: amount > 0 ? 'deposit' : 'withdrawal',
        amount: Math.abs(amount),
        status: 'approved',
        category: walletCategoryMap[walletKey],
        description: `[Admin] ${description}`,
      },
    })

    return success(sanitizeUser(updatedUser))
  } catch (err) {
    return error('Failed to modify wallet balance', 500)
  }
}
