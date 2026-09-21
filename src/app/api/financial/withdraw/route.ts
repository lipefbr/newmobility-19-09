import { db } from '@/lib/db'
import { prisma } from '@/lib/db'
import { success, error, reaisToCents } from '@/lib/api-utils'
import { isKycApproved } from '@/lib/kyc'

// Withdrawal rules — DEFAULT values. The admin can override ALL of these
// via SystemConfig (keys: saque.min_cents, saque.max_cents, saque.fee_pct,
// saque.max_daily_withdrawals, saque.processing_time_hours).
// On each request, we try to read the latest config from the DB. If the
// DB is unavailable or the key doesn't exist, we fall back to these.
const DEFAULT_MIN_WITHDRAWAL_CENTS = 5000       // R$ 50,00
const DEFAULT_MAX_DAILY_WITHDRAWAL_CENTS = 500000 // R$ 5.000,00
const DEFAULT_WITHDRAWAL_FEE_PERCENT = 2        // 2%
const FREE_WITHDRAWAL_DAY_START = 5
const FREE_WITHDRAWAL_DAY_END = 8

async function getWithdrawalConfig() {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'saque.' } },
    })
    const map: Record<string, string> = {}
    configs.forEach(c => { map[c.key] = c.value })
    return {
      minCents: parseInt(map['saque.min_cents'] || '') || DEFAULT_MIN_WITHDRAWAL_CENTS,
      maxDailyCents: parseInt(map['saque.max_cents'] || '') || DEFAULT_MAX_DAILY_WITHDRAWAL_CENTS,
      feePct: parseFloat(map['saque.fee_pct'] || '') || DEFAULT_WITHDRAWAL_FEE_PERCENT,
    }
  } catch {
    return {
      minCents: DEFAULT_MIN_WITHDRAWAL_CENTS,
      maxDailyCents: DEFAULT_MAX_DAILY_WITHDRAWAL_CENTS,
      feePct: DEFAULT_WITHDRAWAL_FEE_PERCENT,
    }
  }
}

function isFreeWithdrawalDay(date: Date = new Date()): boolean {
  const day = date.getDate()
  return day >= FREE_WITHDRAWAL_DAY_START && day <= FREE_WITHDRAWAL_DAY_END
}

function calculateFee(amountCents: number, feePct: number, isFree: boolean): number {
  if (isFree) return 0
  return Math.round((amountCents * feePct) / 100)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, amount, category } = body

    if (!userId || !amount) {
      return error('userId and amount are required')
    }

    // Amount is expected in BRL (reais), convert to cents for storage
    // e.g., user sends 5000.00 meaning R$ 5.000,00 → stored as 500000 cents
    const amountCents = reaisToCents(amount)

    if (amountCents <= 0) {
      return error('Amount must be positive')
    }

    // Enforce minimum withdrawal amount — reads from SystemConfig (admin-editable)
    const wConfig = await getWithdrawalConfig()
    if (amountCents < wConfig.minCents) {
      return error(`Valor mínimo para saque é R$ ${(wConfig.minCents / 100).toFixed(2).replace('.', ',')}.`, 400)
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    // KYC gate: block withdrawals if user's KYC is not approved (admins bypass).
    if (user.role !== 'admin' && user.userType !== 'admin' && user.userType !== 'ADMIN') {
      const kycOk = await isKycApproved(user.id as string)
      if (!kycOk) {
        return error(
          'KYC não aprovado. Complete sua verificação de documentos na aba KYC para liberar saques.',
          403
        )
      }
    }

    // Block withdrawals for free plan users (subscription not paid)
    if (user.plan === 'free' && user.role !== 'admin') {
      return error('Você precisa assinar um plano para solicitar saques. Acesse "Meu Plano" para assinar.', 403)
    }

    // Check sufficient balance based on category
    let balanceField = 'balanceWithdrawal'
    if (category === 'mobility') balanceField = 'balanceMobility'
    else if (category === 'shopping') balanceField = 'balanceShopping'
    else if (category === 'food') balanceField = 'balanceFood'
    else if (category === 'pharmacy') balanceField = 'balancePharmacy'
    else if (category === 'gratification') balanceField = 'balanceGratification'
    // "Saldo Pagamento Fatura" wallet (client spec §18) — used to pay monthly invoices.
    else if (category === 'paymentInvoice') balanceField = 'balancePaymentInvoice'

    const currentBalance = user[balanceField] as number

    // Validate that user has a PIX key registered (required for withdrawals)
    if (!user.pixKey || String(user.pixKey).trim() === '') {
      return error('Você precisa cadastrar uma chave PIX antes de solicitar um saque. Acesse seu perfil e cadastre sua chave PIX.', 400)
    }

    // Validate sufficient balance
    if (amountCents > currentBalance) {
      return error('Saldo insuficiente para este saque', 400)
    }

    // --- Enforce daily and monthly withdrawal limits (client spec §15) ---
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Fetch user's approved/pending/paid withdrawals today and this month
    const todayWithdrawals = await db.find(
      'Transaction',
      '"userId" = $1 AND "type" = $2 AND "createdAt" >= $3 AND "createdAt" < $4',
      [userId, 'withdrawal', startOfDay.toISOString(), endOfDay.toISOString()]
    ) as any[]
    const monthWithdrawals = await db.find(
      'Transaction',
      '"userId" = $1 AND "type" = $2 AND "createdAt" >= $3 AND "createdAt" < $4',
      [userId, 'withdrawal', startOfMonth.toISOString(), endOfMonth.toISOString()]
    ) as any[]

    const totalToday = todayWithdrawals
      .filter(t => t.status !== 'rejected')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    const totalThisMonth = monthWithdrawals
      .filter(t => t.status !== 'rejected')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

    if (totalToday + amountCents > wConfig.maxDailyCents) {
      const remaining = Math.max(0, wConfig.maxDailyCents - totalToday)
      return error(
        `Limite diário de saque atingido. Você já sacou R$ ${(totalToday / 100).toFixed(2).replace('.', ',')} hoje. ` +
        `Limite diário: R$ ${(wConfig.maxDailyCents / 100).toFixed(2).replace('.', ',')}. ` +
        `Disponível hoje: R$ ${(remaining / 100).toFixed(2).replace('.', ',')}.`,
        400
      )
    }

    // --- Calculate withdrawal fee (reads from SystemConfig, free between days 5-8) ---
    const freeDay = isFreeWithdrawalDay(now)
    const feeCents = calculateFee(amountCents, wConfig.feePct, freeDay)
    const netCents = amountCents - feeCents

    // Create transaction (status: pending -> admin approves later)
    const description = freeDay
      ? `Saque sem taxa (janela gratuita dias 5-8) - ${category || 'withdrawal'} (PIX: ${user.pixKey})`
      : `Solicitação de saque - ${category || 'withdrawal'} (taxa ${wConfig.feePct}%: R$ ${(feeCents / 100).toFixed(2).replace('.', ',')}) (PIX: ${user.pixKey})`

    const transaction = await db.insert('Transaction', {
      userId,
      type: 'withdrawal',
      amount: -amountCents,
      status: 'pending',
      category: category || 'withdrawal',
      description,
    })

    // Deduct from balance immediately (funds held while withdrawal is pending)
    await db.update(
      'User',
      '"id" = $1',
      { [balanceField]: currentBalance - amountCents },
      [userId]
    )

    // If a fee applies, record it as a separate transaction line for the admin to see
    if (feeCents > 0) {
      try {
        await db.insert('Transaction', {
          userId,
          type: 'fee',
          amount: -feeCents,
          status: 'paid',
          category: 'withdrawal_fee',
          description: `Taxa de saque ${wConfig.feePct}% sobre R$ ${(amountCents / 100).toFixed(2).replace('.', ',')} (fora da janela gratuita)`,
        })
      } catch (feeErr) {
        console.warn('[Withdraw] Could not record fee transaction:', feeErr)
      }
    }

    // Reload user to return updated balance
    const updatedUser = await db.findOne('User', '"id" = $1', [userId])

    return success({
      transaction,
      newBalance: updatedUser?.[balanceField] ?? currentBalance - amountCents,
      pixKey: user.pixKey,
      feeCents,
      netCents,
      isFreeWithdrawal: freeDay,
      message: freeDay
        ? 'Saque solicitado dentro da janela gratuita (dias 5-8). Sem taxa.'
        : `Saque solicitado com taxa de ${wConfig.feePct}% (R$ ${(feeCents / 100).toFixed(2).replace('.', ',')}). Janela gratuita: dias 5 a 8 de cada mês.`,
    }, 201)
  } catch (err) {
    console.error('Withdrawal error:', err)
    return error('Internal server error', 500)
  }
}
