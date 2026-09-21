import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import { invalidateKycCache } from '@/lib/kyc'

/**
 * POST /api/admin/kyc/[userId]/approve
 *
 * Admin approves the user's KYC. Side effects:
 *   1. user.kycStatus = 'approved', kycVerifiedAt = now, kycVerifiedById = adminId,
 *      kycRejectedReason = null
 *   2. All the user's KycDocuments → status='approved', rejectReason=null,
 *      reviewedById=adminId, reviewedAt=now
 *   3. AuditLog entry (action='kyc_approve')
 *   4. Notification to the user telling them their KYC is approved
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSession(req)
    if (!session) return error('Não autenticado', 401)
    if (session.role !== 'admin') return error('Acesso restrito a administradores', 403)

    const { userId } = await params
    if (!userId) return error('userId é obrigatório', 400)

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        kycStatus: true,
        kycDocuments: { select: { id: true, docType: true, status: true } },
      },
    })

    if (!target) return error('Usuário não encontrado', 404)

    const now = new Date()

    // 1 + 2. Update user + all their documents in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'approved',
          kycVerifiedAt: now,
          kycVerifiedById: session.userId,
          kycRejectedReason: null,
        },
      }),
      prisma.kycDocument.updateMany({
        where: { userId },
        data: {
          status: 'approved',
          rejectReason: null,
          reviewedById: session.userId,
          reviewedAt: now,
        },
      }),
    ])

    // Invalidate the KYC approval cache for this user so the new status
    // is reflected immediately on the next gated API call (withdrawals,
    // transfers, plan upgrades, gratification claims).
    invalidateKycCache(userId)

    // 3. Audit log
    try {
      const adminName = (session.user.name as string | undefined) ?? null
      await prisma.auditLog.create({
        data: {
          adminId: session.userId,
          adminName,
          action: 'kyc_approve',
          targetUserId: userId,
          targetEmail: target.email,
          details: `KYC aprovado para ${target.name} (${target.email}). ${target.kycDocuments.length} documento(s) marcado(s) como aprovado(s).`,
        },
      })
    } catch (auditErr) {
      console.error('AuditLog create failed (kyc_approve):', auditErr)
    }

    // 4. Notification to user
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: 'Documentos verificados ✓',
          message:
            'Seus documentos foram aprovados! Saques, cashback e evolução de plano estão liberados.',
          type: 'kyc_approved',
        },
      })
    } catch (notifErr) {
      console.error('Notification create failed (kyc_approve):', notifErr)
    }

    return success({
      approved: true,
      userId,
      message: 'KYC aprovado com sucesso.',
    })
  } catch (err) {
    console.error('POST /api/admin/kyc/[userId]/approve error:', err)
    return error('Erro ao aprovar KYC', 500)
  }
}
