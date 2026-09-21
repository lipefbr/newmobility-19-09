import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * Admin: reject a Telemedicina activation request.
 *
 *   POST /api/admin/telemedicina/[id]/reject
 *   body: { adminId, adminNotes }
 *
 * Sets the request status to 'rejected' with the admin's reason, and
 * notifies the user in-app so they can correct and resubmit if appropriate.
 */

async function requireAdmin(userId: string | null | undefined) {
  if (!userId) return { ok: false as const, response: error('adminId is required', 400) }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'admin') {
    return { ok: false as const, response: error('Unauthorized', 403) }
  }
  return { ok: true as const, admin: user }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id) return error('id is required', 400)

    const body = await req.json()
    const auth = await requireAdmin(body?.adminId)
    if (!auth.ok) return auth.response

    const existing = await prisma.telemedicinaRequest.findUnique({ where: { id } })
    if (!existing) return error('Pedido não encontrado', 404)

    const adminNotes = body?.adminNotes ? String(body.adminNotes) : null

    const updated = await prisma.telemedicinaRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        adminNotes,
        approvedById: auth.admin.id,
        rejectedAt: new Date(),
        approvedAt: null,
        activationLink: null,
      },
    })

    try {
      await prisma.notification.create({
        data: {
          userId: existing.userId,
          type: 'system',
          title: 'Atualização sobre Telemedicina',
          message: adminNotes
            ? `Seu pedido de Telemedicina não foi aprovado. Motivo: ${adminNotes}`
            : 'Seu pedido de Telemedicina não foi aprovado. Entre em contato com o suporte para mais detalhes.',
          isRead: false,
        },
      })
    } catch (nErr) {
      console.error('Failed to create rejection notification (non-fatal):', nErr)
    }

    return success({ request: serialize(updated), message: 'Pedido rejeitado e usuário notificado.' })
  } catch (err) {
    console.error('Admin Telemedicina reject error:', err)
    return error('Failed to reject Telemedicina request', 500)
  }
}

function serialize(r: any) {
  return {
    id: r.id,
    userId: r.userId,
    status: r.status,
    adminNotes: r.adminNotes ?? null,
    activationLink: r.activationLink ?? null,
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    rejectedAt: r.rejectedAt ? r.rejectedAt.toISOString() : null,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
  }
}
