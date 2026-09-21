import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import { invalidateKycCache } from '@/lib/kyc'

/**
 * POST /api/admin/kyc/[userId]/reject
 * Body: { reason: string }
 *
 * Admin rejects the user's KYC. Side effects:
 *   1. user.kycStatus = 'rejected', kycRejectedReason = reason,
 *      kycVerifiedById = adminId
 *   2. All the user's PENDING KycDocuments → status='rejected', rejectReason=reason,
 *      reviewedById=adminId, reviewedAt=now
 *      (Already-approved docs are left alone — admin only invalidates the new ones.)
 *   3. AuditLog entry (action='kyc_reject')
 *   4. Notification to the user telling them their KYC was rejected + reason
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

    let body: { reason?: string }
    try {
      body = await req.json()
    } catch {
      body = {}
    }
    const reason = (body.reason ?? '').trim()
    if (!reason) {
      return error('Informe o motivo da rejeição', 400)
    }
    if (reason.length > 1000) {
      return error('Motivo muito longo (máx. 1000 caracteres)', 400)
    }

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

    // 1 + 2. Update user + reject all their pending docs in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'rejected',
          kycRejectedReason: reason,
          kycVerifiedById: session.userId,
          // NOTE: we intentionally keep kycVerifiedAt as-is when it was set
          // (so admin can see "approved on X, then rejected on Y" history).
        },
      }),
      prisma.kycDocument.updateMany({
        where: { userId, status: 'pending' },
        data: {
          status: 'rejected',
          rejectReason: reason,
          reviewedById: session.userId,
          reviewedAt: now,
        },
      }),
    ])

    // Invalidate the KYC approval cache for this user so the new status
    // is reflected immediately on the next gated API call.
    invalidateKycCache(userId)

    // 3. Audit log
    try {
      const adminName = (session.user.name as string | undefined) ?? null
      await prisma.auditLog.create({
        data: {
          adminId: session.userId,
          adminName,
          action: 'kyc_reject',
          targetUserId: userId,
          targetEmail: target.email,
          details: `KYC rejeitado para ${target.name} (${target.email}). Motivo: ${reason}`,
        },
      })
    } catch (auditErr) {
      console.error('AuditLog create failed (kyc_reject):', auditErr)
    }

    // 4. Notification to user
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: 'Documentos rejeitados',
          message: `Seus documentos foram rejeitados: ${reason}. Reenvie os documentos na aba KYC.`,
          type: 'kyc_rejected',
        },
      })
    } catch (notifErr) {
      console.error('Notification create failed (kyc_reject):', notifErr)
    }

    return success({
      rejected: true,
      userId,
      reason,
      message: 'KYC rejeitado.',
    })
  } catch (err) {
    console.error('POST /api/admin/kyc/[userId]/reject error:', err)
    return error('Erro ao rejeitar KYC', 500)
  }
}
