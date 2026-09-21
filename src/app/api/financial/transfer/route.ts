import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error, reaisToCents, centsToReais } from '@/lib/api-utils'
import { isKycApproved } from '@/lib/kyc'

// Map the public balance keys (used by the UI) to the underlying User model columns.
// Note: `bills` is backed by `balancePending` to avoid a DB schema migration; the UI
// labels it as "Saldo para Faturas". `paymentInvoice` is backed by the dedicated
// `balancePaymentInvoice` column (client spec §18 — "Saldo Pagamento Fatura").
const BALANCE_FIELDS: Record<string, string> = {
  mobility: 'balanceMobility',
  shopping: 'balanceShopping',
  food: 'balanceFood',
  pharmacy: 'balancePharmacy',
  gratification: 'balanceGratification',
  withdrawal: 'balanceWithdrawal',
  paymentInvoice: 'balancePaymentInvoice',
  bills: 'balancePending',
  free: 'balanceFree',
}

// Transfers TO `withdrawal` (Saldo para Saque) are NOT allowed - users must use the
// dedicated withdraw flow to move money out of that wallet. The destination list below
// lists every valid destination key.
const VALID_DESTINATIONS = new Set([
  'mobility',
  'shopping',
  'food',
  'pharmacy',
  'gratification',
  'paymentInvoice',
  'bills',
  'free',
])

// Transfers FROM `withdrawal` to any other wallet are free (0% fee). All other transfers
// incur a 5% conversion fee.
const TRANSFER_FEES: Record<string, number> = {
  'withdrawal->mobility': 0,
  'withdrawal->shopping': 0,
  'withdrawal->food': 0,
  'withdrawal->pharmacy': 0,
  'withdrawal->gratification': 0,
  'withdrawal->paymentInvoice': 0,
  'withdrawal->bills': 0,
  'withdrawal->free': 0,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, source, destination, amount } = body

    if (!userId || !source || !destination || amount === undefined) {
      return error('userId, source, destination e amount são obrigatórios')
    }

    if (source === destination) {
      return error('Origem e destino não podem ser iguais')
    }

    // Block any transfer TO `withdrawal` - users must use the withdraw flow for that.
    if (destination === 'withdrawal') {
      return error('Não é permitido transferir para o Saldo para Saque. Use o fluxo de saque.')
    }

    if (!VALID_DESTINATIONS.has(destination)) {
      return error('Tipo de saldo de destino inválido')
    }

    const sourceField = BALANCE_FIELDS[source]
    const destField = BALANCE_FIELDS[destination]

    if (!sourceField || !destField) {
      return error('Tipo de saldo inválido')
    }

    const amountCents = reaisToCents(Number(amount))
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return error('Valor deve ser positivo')
    }

    // KYC gate: block transfers if user's KYC is not approved (admins bypass
    // inside isKycApproved). Done before the transaction so we don't open a
    // DB transaction unnecessarily when the user is blocked.
    const kycOk = await isKycApproved(userId)
    if (!kycOk) {
      return error(
        'KYC não aprovado. Complete sua verificação de documentos na aba KYC para liberar transferências.',
        403
      )
    }

    // Run the read + write inside a transaction so we always see consistent balances
    // and the update is atomic.
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          [sourceField]: true,
          [destField]: true,
        },
      })

      if (!user) {
        throw new Error('USER_NOT_FOUND')
      }

      const sourceBalance = (user as any)[sourceField] as number
      if (sourceBalance < amountCents) {
        throw new Error('SALDO_INSUFICIENTE')
      }

      const feeKey = `${source}->${destination}`
      const feePercent = TRANSFER_FEES[feeKey] ?? 5
      const feeCents = Math.round((amountCents * feePercent) / 100)
      const netAmount = amountCents - feeCents

      if (netAmount <= 0) {
        throw new Error('VALOR_INSUFICIENTE')
      }

      const destBalance = (user as any)[destField] as number

      await tx.user.update({
        where: { id: userId },
        data: {
          [sourceField]: sourceBalance - amountCents,
          [destField]: destBalance + netAmount,
        },
      })

      await tx.transaction.create({
        data: {
          userId,
          type: 'transfer_out',
          amount: -amountCents,
          status: 'paid',
          category: source,
          description: `Transferência de ${source} para ${destination}`,
        },
      })

      await tx.transaction.create({
        data: {
          userId,
          type: 'transfer_in',
          amount: netAmount,
          status: 'paid',
          category: destination,
          description: `Transferência recebida de ${source} (taxa: ${feePercent}%)`,
        },
      })

      return { feePercent, feeCents, netAmount }
    })

    return success({
      message: 'Transferência realizada com sucesso',
      source,
      destination,
      grossAmount: centsToReais(amountCents),
      fee: centsToReais(result.feeCents),
      feePercent: result.feePercent,
      netAmount: centsToReais(result.netAmount),
    })
  } catch (err: any) {
    if (err?.message === 'USER_NOT_FOUND') {
      return error('Usuário não encontrado', 404)
    }
    if (err?.message === 'SALDO_INSUFICIENTE') {
      return error('Saldo insuficiente')
    }
    if (err?.message === 'VALOR_INSUFICIENTE') {
      return error('Valor insuficiente para cobrir a taxa')
    }
    return error(err?.message || 'Erro interno do servidor', 500)
  }
}
