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

// POST /api/admin/users/[id]/release-balance body { userId, wallet, amount, description }
// Admin manual credit ("release balance") to a specific user wallet.
// amount is in CENTS, must be positive.
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

    if (typeof amount !== 'number' || amount <= 0) {
      return error('amount must be a positive number (in cents)', 400)
    }

    if (!description || typeof description !== 'string') {
      return error('description is required', 400)
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return error('User not found', 404)

    const walletKey = wallet as WalletKey
    const fullDescription = `[Admin Liberação] ${description}`

    const updatedUser = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { [walletKey]: { increment: amount } },
      }),
      prisma.transaction.create({
        data: {
          userId: id,
          type: 'deposit',
          amount,
          status: 'approved',
          category: walletCategoryMap[walletKey],
          description: fullDescription,
        },
      }),
    ])

    return success(sanitizeUser(updatedUser[0] as Record<string, unknown>))
  } catch (err) {
    console.error('Admin release-balance POST error:', err)
    return error('Failed to release balance', 500)
  }
}
