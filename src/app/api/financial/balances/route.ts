import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        balanceWithdrawal: true,
        balanceMobility: true,
        balanceShopping: true,
        balanceFood: true,
        balancePharmacy: true,
        balanceGratification: true,
        balancePaymentInvoice: true,
        balanceFree: true,
        balancePending: true,
      },
    })

    if (!user) {
      return error('User not found', 404)
    }

    return success({
      withdrawal: user.balanceWithdrawal,
      mobility: user.balanceMobility,
      shopping: user.balanceShopping,
      food: user.balanceFood,
      pharmacy: user.balancePharmacy,
      gratification: user.balanceGratification,
      // "Saldo Pagamento Fatura" — dedicated wallet for paying monthly invoices (client spec §18)
      paymentInvoice: user.balancePaymentInvoice,
      free: user.balanceFree,
      // "Saldo para Faturas" is backed by the balancePending column to avoid schema changes
      bills: user.balancePending,
      total:
        user.balanceWithdrawal +
        user.balanceMobility +
        user.balanceShopping +
        user.balanceFood +
        user.balancePharmacy +
        user.balanceGratification,
    })
  } catch (err) {
    console.error('Balances error:', err)
    return error('Internal server error', 500)
  }
}
