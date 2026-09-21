import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import {
  createTransfer,
  centsToAsaasValue,
  sanitizeCpfCnpj,
  AsaasApiError,
} from '@/lib/asaas'

// ============================================================================
// /api/admin/asaas/withdrawals/batch
// ----------------------------------------------------------------------------
// Tarefa 1 (21/09): Aprovação em LOTE de saques Asaas.
// Body: { adminUserId, withdrawalIds: string[], action: 'approve' | 'reject', reason?: string }
//
// Para cada withdrawalRequestId:
//   - approve: chama createTransfer() no Asaas (PIX ou TED)
//   - reject: devolve saldo e marca 'rejected'
//
// Retorna: { processed, failed, results: [{ id, success, error?, asaasTransferId? }] }
// ============================================================================

function normalizeAccountType(raw?: string | null): 'CHECKING' | 'SAVINGS' {
  if (!raw) return 'CHECKING'
  const s = raw.trim().toLowerCase()
  if (s.includes('poupan') || s === 'savings') return 'SAVINGS'
  return 'CHECKING'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { adminUserId, withdrawalIds, action, reason } = body

    if (!adminUserId) return error('adminUserId é obrigatório', 400)
    if (!Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return error('withdrawalIds deve ser um array não vazio', 400)
    }
    if (!['approve', 'reject'].includes(action)) {
      return error('action deve ser "approve" ou "reject"', 400)
    }

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const results: Array<{ id: string; success: boolean; error?: string; asaasTransferId?: string }> = []
    let processed = 0
    let failed = 0

    for (const wrId of withdrawalIds) {
      try {
        const wr = await prisma.withdrawalRequest.findUnique({
          where: { id: wrId },
          include: { user: { select: { id: true, name: true, cpf: true, pixKey: true, pixEnabled: true, bankCode: true, bankAgency: true, bankAccount: true, bankType: true, balanceWithdrawal: true } } },
        })

        if (!wr) {
          results.push({ id: wrId, success: false, error: 'Solicitação não encontrada' })
          failed++
          continue
        }

        if (wr.status !== 'pending') {
          results.push({ id: wrId, success: false, error: `Status atual: ${wr.status} (esperado: pending)` })
          failed++
          continue
        }

        if (action === 'reject') {
          // Rejeitar: devolve saldo e marca rejected
          await prisma.user.update({
            where: { id: wr.userId },
            data: { balanceWithdrawal: { increment: wr.amount } },
          })
          await prisma.withdrawalRequest.update({
            where: { id: wrId },
            data: {
              status: 'rejected',
              rejectedReason: reason || 'Rejeitado em lote pelo admin',
              processedAt: new Date(),
            },
          })
          results.push({ id: wrId, success: true })
          processed++
          continue
        }

        // action === 'approve' — criar transferência no Asaas
        const user = wr.user as any
        const amount = centsToAsaasValue(wr.amount)
        const cpf = sanitizeCpfCnpj(user.cpf)

        let transferData: any = {
          value: amount,
          description: `Saque #${wr.id.substring(0, 8)} — ${user.name}`,
        }

        if (wr.paymentMethod === 'pix' && user.pixKey) {
          transferData.transferType = 'PIX'
          transferData.pixAddressKey = user.pixKey
          transferData.pixKey_Type = user.pixKey.length === 14 ? 'CPF' : user.pixKey.length === 11 ? 'CPF' : 'EMAIL'
        } else if (wr.paymentMethod === 'bank_transfer' || user.bankCode) {
          transferData.transferType = 'TED'
          transferData.bankAccount = {
            bankCode: user.bankCode,
            agency: user.bankAgency,
            account: user.bankAccount,
            accountType: normalizeAccountType(user.bankType),
            name: user.name,
            cpfCnpj: cpf,
          }
        } else {
          throw new Error('Usuário sem PIX ou dados bancários')
        }

        try {
          const asaasResult = await createTransfer(transferData)
          const asaasStatus = asaasResult?.status || 'PENDING'
          const isPaid = asaasStatus === 'DONE' || asaasStatus === 'BANK_CONFIRMED'

          await prisma.withdrawalRequest.update({
            where: { id: wrId },
            data: {
              status: isPaid ? 'paid' : 'approved',
              asaasTransferId: asaasResult?.id || null,
              asaasStatus,
              paidAt: isPaid ? new Date() : null,
              processedAt: new Date(),
            },
          })
          results.push({ id: wrId, success: true, asaasTransferId: asaasResult?.id })
          processed++
        } catch (asaasErr: any) {
          // Erro no Asaas — não reembolsa (deixa pending para retry manual)
          console.error(`[Batch approve] Asaas error for ${wrId}:`, asaasErr.message)
          await prisma.withdrawalRequest.update({
            where: { id: wrId },
            data: {
              status: 'failed',
              rejectedReason: `Erro Asaas: ${asaasErr.message}`,
            },
          })
          results.push({ id: wrId, success: false, error: asaasErr.message })
          failed++
        }

        // Pequeno delay para evitar rate-limit do Asaas
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err: any) {
        console.error(`[Batch approve] Error for ${wrId}:`, err.message)
        results.push({ id: wrId, success: false, error: err.message })
        failed++
      }
    }

    return success({ processed, failed, results, action })
  } catch (err) {
    console.error('Batch withdrawals error:', err)
    return error('Failed to process batch withdrawals', 500)
  }
}
