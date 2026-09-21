import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/financial/company-withdrawal
// ----------------------------------------------------------------------------
// Tarefa (22/09): Permite que o admin/geral dono da plataforma saque o lucro
// da empresa diretamente do saldo da plataforma.
//
// POST body: { userId, amountCents, purpose }
//
// Cria uma Transaction type='company_withdrawal' com a finalidade informada.
// Não debita de nenhum usuário — é um saque administrativo que reduz o
// saldo total da plataforma (registrado como despesa administrativa).
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, amountCents, purpose } = body

    if (!userId) return error('userId é obrigatório', 400)
    if (!amountCents || amountCents <= 0) return error('amountCents deve ser positivo', 400)
    if (!purpose || typeof purpose !== 'string' || purpose.trim().length < 3) {
      return error('purpose é obrigatório (mínimo 3 caracteres)', 400)
    }

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized — apenas admin', 403)

    const amount = Math.floor(Number(amountCents))

    // Cria a transação de saque administrativo
    const transaction = await prisma.transaction.create({
      data: {
        userId: admin.id,
        type: 'company_withdrawal',
        amount: -amount, // valor negativo (saída de dinheiro da plataforma)
        status: 'approved',
        description: `Saque do lucro da empresa — ${purpose.trim()}`,
      },
    })

    return success({
      transaction,
      message: 'Saque do lucro da empresa realizado com sucesso',
      amountCents: amount,
      purpose: purpose.trim(),
    }, 201)
  } catch (err) {
    console.error('Company withdrawal error:', err)
    return error('Erro ao realizar saque do lucro da empresa', 500)
  }
}
