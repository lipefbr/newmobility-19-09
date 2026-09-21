import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * DELETE /api/kyc/[id]
 * Deletes a pending or rejected document owned by the current user.
 * Approved documents cannot be deleted (must contact admin).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req)
    if (!session) return error('Não autenticado', 401)

    const { id } = await params
    if (!id) return error('ID do documento é obrigatório', 400)

    const doc = await prisma.kycDocument.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, docType: true },
    })

    if (!doc) return error('Documento não encontrado', 404)
    if (doc.userId !== session.userId) {
      return error('Você não tem permissão para excluir este documento', 403)
    }
    if (doc.status === 'approved') {
      return error(
        'Documentos aprovados não podem ser excluídos. Contate o suporte.',
        400
      )
    }

    await prisma.kycDocument.delete({ where: { id } })

    return success({
      deleted: true,
      id,
      docType: doc.docType,
      message: 'Documento excluído.',
    })
  } catch (err) {
    console.error('DELETE /api/kyc/[id] error:', err)
    return error('Erro ao excluir documento KYC', 500)
  }
}
