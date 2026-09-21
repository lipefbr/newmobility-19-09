import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import {
  createTransfer,
  centsToAsaasValue,
  sanitizeCpfCnpj,
  AsaasApiError,
} from '@/lib/asaas'

/**
 * Normalize our stored bankType string to the Asaas enum.
 * Accepts: 'CHECKING'/'SAVINGS' (already correct), 'conta_corrente',
 * 'corrente', 'conta_poupanca', 'poupanca', etc. Defaults to CHECKING.
 */
function normalizeAccountType(raw?: string | null): 'CHECKING' | 'SAVINGS' {
  if (!raw) return 'CHECKING'
  const s = raw.trim().toLowerCase()
  if (s.includes('poupan') || s === 'savings') return 'SAVINGS'
  return 'CHECKING'
}

/**
 * POST /api/admin/asaas/withdrawals/[id]/approve
 * Body: { adminUserId }
 *
 * Initiates an Asaas transfer (PIX or TED) for an admin-approved withdrawal
 * request. On Asaas failure the user is refunded (balanceWithdrawal is
 * incremented back by the held amount).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { adminUserId } = body as { adminUserId?: string }

    if (!adminUserId) return error('adminUserId é obrigatório', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const wr = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!wr) return error('Solicitação de saque não encontrada', 404)
    if (wr.status !== 'pending') {
      return error('Solicitação já processada', 400)
    }

    const value = centsToAsaasValue(wr.amount)

    // Build the Asaas transfer request
    let transferInput: Parameters<typeof createTransfer>[0]
    if (wr.paymentMethod === 'pix') {
      if (!wr.pixKey) {
        return error('Saque PIX sem chave PIX cadastrada', 400)
      }
      transferInput = {
        pixAddressKey: wr.pixKey,
        value,
        description: 'Saque NewMobility',
        externalReference: wr.id,
      }
    } else {
      // bank_transfer (TED)
      if (!wr.bankCode || !wr.bankAgency || !wr.bankAccount) {
        return error('Dados bancários incompletos para TED', 400)
      }
      const cpfCnpj = sanitizeCpfCnpj(wr.user.cpf)
      if (!cpfCnpj) {
        return error('Usuário sem CPF/CNPJ — impossível iniciar TED', 400)
      }
      transferInput = {
        bankAccount: {
          bankCode: wr.bankCode,
          accountName: wr.user.name,
          ownerName: wr.user.name,
          cpfCnpj,
          agency: wr.bankAgency,
          accountNumber: wr.bankAccount,
          accountType: normalizeAccountType(wr.bankType),
        },
        value,
        description: 'Saque NewMobility',
        externalReference: wr.id,
      }
    }

    // Call Asaas
    let transfer
    try {
      transfer = await createTransfer(transferInput)
    } catch (e) {
      const msg =
        e instanceof AsaasApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Unknown Asaas transfer error'

      // Refund the user and mark the withdrawal as failed
      await prisma.$transaction([
        prisma.user.update({
          where: { id: wr.userId },
          data: { balanceWithdrawal: { increment: wr.amount } },
        }),
        prisma.withdrawalRequest.update({
          where: { id: wr.id },
          data: {
            status: 'failed',
            rejectedReason: msg.substring(0, 500),
            processedById: adminUserId,
            processedAt: new Date(),
          },
        }),
      ])

      return error(`Falha na transferência Asaas: ${msg}`, 502)
    }

    // Map Asaas transfer status → our withdrawal status
    const isPaid =
      transfer.status === 'DONE' || transfer.status === 'BANK_CONFIRMED'
    const newStatus = isPaid ? 'paid' : 'approved'

    const updated = await prisma.withdrawalRequest.update({
      where: { id: wr.id },
      data: {
        status: newStatus,
        asaasTransferId: transfer.id,
        asaasStatus: transfer.status,
        processedById: adminUserId,
        processedAt: new Date(),
        paidAt: isPaid ? new Date() : null,
      },
    })

    return success({
      withdrawal: updated,
      transfer,
      message: isPaid
        ? 'Transferência concluída com sucesso.'
        : 'Transferência iniciada na Asaas. Aguardando confirmação do banco.',
    })
  } catch (err) {
    console.error('[Asaas admin withdrawals approve] error:', err)
    return error('Internal server error', 500)
  }
}
