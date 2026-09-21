import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { isKycApproved } from '@/lib/kyc'
import {
  createTransfer,
  centsToAsaasValue,
  sanitizeCpfCnpj,
  AsaasApiError,
} from '@/lib/asaas'

const MIN_WITHDRAWAL_CENTS = 5000 // R$ 50,00 minimum (per spec)

/**
 * Lê uma config do SystemConfig (com fallback).
 */
async function getConfig(key: string, fallback: string): Promise<string> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } })
    return row?.value ?? fallback
  } catch { return fallback }
}

/**
 * POST /api/asaas/withdrawal
 *
 * Tarefa 2 (21/09): se o valor for abaixo de saque.auto_approve_below_cents
 * e o Asaas estiver conectado, o saque é aprovado automaticamente e a
 * transferência é criada no Asaas imediatamente.
 *
 * Tarefa 4 (21/09): se o valor for acima de saque.manual_review_above_cents,
 * o saque fica com status 'under_review' para análise manual do admin.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      amountCents,
      paymentMethod,
      pixKey,
      bankCode,
      bankAgency,
      bankAccount,
      bankType,
    } = body as {
      userId?: string
      amountCents?: number
      paymentMethod?: 'pix' | 'bank_transfer'
      pixKey?: string
      bankCode?: string
      bankAgency?: string
      bankAccount?: string
      bankType?: string
    }

    if (!userId) return error('userId é obrigatório', 400)

    const amount = Math.floor(Number(amountCents))
    if (!Number.isFinite(amount) || amount <= 0) {
      return error('amountCents inválido', 400)
    }
    if (amount < MIN_WITHDRAWAL_CENTS) {
      return error(
        `Valor mínimo para saque é R$ ${(MIN_WITHDRAWAL_CENTS / 100)
          .toFixed(2)
          .replace('.', ',')}`,
        400
      )
    }

    const method = paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'pix'

    // Validate destination
    if (method === 'pix') {
      if (!pixKey || String(pixKey).trim().length < 3) {
        return error('pixKey é obrigatório para saque via PIX', 400)
      }
    } else {
      if (!bankCode || !bankAgency || !bankAccount) {
        return error(
          'bankCode, bankAgency e bankAccount são obrigatórios para saque via TED',
          400
        )
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return error('Usuário não encontrado', 404)

    // KYC gate: block withdrawals if user's KYC is not approved (admins bypass).
    if (user.role !== 'admin' && user.userType !== 'admin' && user.userType !== 'ADMIN') {
      const kycOk = await isKycApproved(user.id)
      if (!kycOk) {
        return error(
          'KYC não aprovado. Complete sua verificação de documentos na aba KYC para liberar saques.',
          403
        )
      }
    }

    if (user.balanceWithdrawal < amount) {
      return error(
        `Saldo para saque insuficiente. Disponível: ${user.balanceWithdrawal} cents, necessário: ${amount} cents.`,
        400
      )
    }

    // Hold the funds immediately (decrement balanceWithdrawal). The funds are
    // returned to the user if the admin rejects the request or the Asaas
    // transfer fails.
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { balanceWithdrawal: { decrement: amount } },
    })

    // Tarefa 2+4 (21/09): lê configs de auto-approve e manual review
    const autoApproveBelowCents = parseInt(await getConfig('saque.auto_approve_below_cents', '0')) || 0
    const manualReviewAboveCents = parseInt(await getConfig('saque.manual_review_above_cents', '100000')) || 100000

    // Determina o status inicial do saque
    let initialStatus = 'pending'
    let requiresManualReview = false

    // Tarefa 4: se acima do limite de análise, marca como under_review
    if (amount > manualReviewAboveCents) {
      initialStatus = 'under_review'
      requiresManualReview = true
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId: user.id,
        amount,
        status: initialStatus,
        paymentMethod: method,
        pixKey: method === 'pix' ? String(pixKey).trim() : null,
        bankCode: method === 'bank_transfer' ? bankCode : null,
        bankAgency: method === 'bank_transfer' ? bankAgency : null,
        bankAccount: method === 'bank_transfer' ? bankAccount : null,
        bankType: method === 'bank_transfer' ? bankType || 'CHECKING' : null,
        rejectedReason: requiresManualReview ? `Saque acima de R$ ${(manualReviewAboveCents / 100).toFixed(2)} — aguardando análise manual` : null,
      },
    })

    // Tarefa 2: se abaixo do limite de auto-approve E não requer análise manual,
    // tenta aprovar automaticamente criando a transferência no Asaas
    let autoApproved = false
    let asaasTransferId: string | null = null
    let message = 'Solicitação de saque registrada. Aguardando aprovação do administrador.'

    if (!requiresManualReview && autoApproveBelowCents > 0 && amount <= autoApproveBelowCents) {
      try {
        // Tenta criar transferência no Asaas automaticamente
        const asaasAmount = centsToAsaasValue(amount)
        const cpf = sanitizeCpfCnpj(user.cpf)

        let transferData: any = {
          value: asaasAmount,
          description: `Saque #${withdrawal.id.substring(0, 8)} — ${user.name}`,
        }

        if (method === 'pix' && String(pixKey).trim()) {
          transferData.transferType = 'PIX'
          transferData.pixAddressKey = String(pixKey).trim()
          transferData.pixKey_Type = String(pixKey).trim().length === 11 ? 'CPF' : 'EMAIL'
        } else {
          transferData.transferType = 'TED'
          transferData.bankAccount = {
            bankCode: bankCode,
            agency: bankAgency,
            account: bankAccount,
            accountType: (bankType?.includes('poupan') ? 'SAVINGS' : 'CHECKING'),
            name: user.name,
            cpfCnpj: cpf,
          }
        }

        const asaasResult = await createTransfer(transferData)
        const asaasStatus = asaasResult?.status || 'PENDING'
        const isPaid = asaasStatus === 'DONE' || asaasStatus === 'BANK_CONFIRMED'

        await prisma.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            status: isPaid ? 'paid' : 'approved',
            asaasTransferId: asaasResult?.id || null,
            asaasStatus,
            paidAt: isPaid ? new Date() : null,
            processedAt: new Date(),
            rejectedReason: null,
          },
        })

        autoApproved = true
        asaasTransferId = asaasResult?.id || null
        message = 'Saque aprovado automaticamente e transferência Asaas criada!'
      } catch (asaasErr: any) {
        // Se falhar o auto-approve, deixa como pending para aprovação manual
        console.error('[Asaas withdrawal auto-approve] error:', asaasErr.message)
        await prisma.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            status: 'pending',
            rejectedReason: `Auto-approve falhou: ${asaasErr.message}. Aguardando aprovação manual.`,
          },
        })
        message = 'Saque registrado. Auto-aprovação falhou — aguardando aprovação manual do administrador.'
      }
    }

    // Tarefa 4: se requer análise manual, mensagem diferente
    if (requiresManualReview) {
      message = `Saque de R$ ${(amount / 100).toFixed(2)} está em análise. Valores acima de R$ ${(manualReviewAboveCents / 100).toFixed(2)} requerem aprovação manual do administrador.`
    }

    return success(
      {
        withdrawal,
        newBalanceWithdrawal: updatedUser.balanceWithdrawal,
        autoApproved,
        asaasTransferId,
        requiresManualReview,
        message,
      },
      201
    )
  } catch (err) {
    console.error('[Asaas withdrawal POST] error:', err)
    return error('Internal server error', 500)
  }
}
