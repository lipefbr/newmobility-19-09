import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Map voucher type to the user balance field that should be credited.
// IMPORTANT (client spec §7): vouchers are "SOMENTE PARA USO - NÃO PODE SER SACADO",
// meaning they MUST NEVER credit the withdrawable balance (balanceWithdrawal).
// Only usage-restricted wallets are valid destinations for voucher redemptions.
//
// Task 2-e (Item 12): added `signup_bonus` and `plan_bonus` mappings. Both
// credit `balanceShopping` (Saldo Compras) — the welcome/plan-bonus voucher
// is intended for general in-app usage (marketplace / mobility / shopping)
// and shopping is the most permissive non-withdrawable wallet. Previously
// these two types returned null which caused a "Tipo de voucher inválido"
// error when a user tried to redeem the welcome voucher by code (the
// /api/vouchers/[id]/redeem endpoint already credits balanceShopping for
// every type, so this brings the two endpoints into agreement).
function getBalanceField(voucherType: string): string | null {
  switch (voucherType) {
    case 'mobility': return 'balanceMobility'
    case 'food': return 'balanceFood'
    case 'pharmacy': return 'balancePharmacy'
    case 'shopping': return 'balanceShopping'
    case 'gratification': return 'balanceGratification'
    case 'paymentInvoice': return 'balancePaymentInvoice'
    // Welcome / plan-bonus vouchers credit Saldo Compras (non-withdrawable
    // per spec §7) so the user can spend them in the marketplace / app.
    case 'signup_bonus': return 'balanceShopping'
    case 'plan_bonus': return 'balanceShopping'
    // 'withdrawal' and 'cashback' are intentionally NOT allowed — vouchers cannot
    // credit the withdrawable wallet.
    default:
      return null
  }
}

// POST /api/vouchers/redeem
// Body: { userId, code }
// Marks the voucher as used and credits the amount to the user's appropriate balance.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, code } = body

    if (!userId) return error('userId is required', 400)
    if (!code || typeof code !== 'string') return error('code is required', 400)

    const normalizedCode = code.trim().toUpperCase()

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return error('User not found', 404)

    const voucher = await prisma.voucher.findUnique({
      where: { code: normalizedCode },
    })

    if (!voucher) {
      return error('Voucher não encontrado. Verifique o código e tente novamente.', 404)
    }

    if (voucher.isUsed) {
      return error('Este voucher já foi utilizado.', 400)
    }

    if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
      return error('Este voucher está expirado.', 400)
    }

    const balanceField = getBalanceField(voucher.type)
    if (!balanceField) {
      return error(`Tipo de voucher inválido: ${voucher.type}`, 400)
    }

    // Mark voucher as used and credit the user's balance in a single transaction
    const [updatedVoucher, updatedUser] = await prisma.$transaction([
      prisma.voucher.update({
        where: { id: voucher.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          [balanceField]: { increment: voucher.amount },
        } as any,
      }),
    ])

    // Create a transaction record for audit purposes
    try {
      await prisma.transaction.create({
        data: {
          userId,
          type: 'voucher_redeem',
          category: voucher.type,
          amount: voucher.amount,
          status: 'approved',
          description: `Voucher resgatado: ${voucher.code}`,
        },
      })
    } catch (txErr) {
      // Don't fail the redeem if transaction log fails
      console.error('Failed to create voucher redeem transaction record:', txErr)
    }

    // Map balance field to a human-readable balance name for the client
    const balanceNameMap: Record<string, string> = {
      balanceWithdrawal: 'Saldo para Saque',
      balanceMobility: 'Saldo Mobilidade',
      balanceShopping: 'Saldo Compras',
      balanceFood: 'Saldo Refeição',
      balancePharmacy: 'Saldo Farmácia',
      balanceGratification: 'Saldo Gratificação',
      balancePaymentInvoice: 'Saldo Pagamento Fatura',
    }

    return success({
      voucher: {
        id: updatedVoucher.id,
        code: updatedVoucher.code,
        amount: updatedVoucher.amount,
        type: updatedVoucher.type,
        usedAt: updatedVoucher.usedAt,
      },
      creditedAmount: voucher.amount,
      balanceField,
      balanceName: balanceNameMap[balanceField] || 'Saldo',
      newBalance: (updatedUser as any)[balanceField],
      user: {
        balanceWithdrawal: updatedUser.balanceWithdrawal,
        balanceMobility: updatedUser.balanceMobility,
        balanceShopping: updatedUser.balanceShopping,
        balanceFood: updatedUser.balanceFood,
        balancePharmacy: updatedUser.balancePharmacy,
        balanceGratification: updatedUser.balanceGratification,
        balancePaymentInvoice: updatedUser.balancePaymentInvoice,
      },
    })
  } catch (err) {
    console.error('Voucher redeem error:', err)
    return error('Failed to redeem voucher', 500)
  }
}
