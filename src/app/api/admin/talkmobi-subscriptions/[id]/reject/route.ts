import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * Admin: reject a TalkMobi subscription request.
 *
 *   POST /api/admin/talkmobi-subscriptions/[id]/reject
 *   body: { adminId, adminNotes }
 *
 * Sets the request status to 'rejected' with the admin's reason, and notifies
 * the user in-app so they can correct and resubmit if they wish.
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

    const existing = await prisma.talkMobiSubscription.findUnique({ where: { id } })
    if (!existing) return error('Pedido não encontrado', 404)

    const adminNotes = body?.adminNotes ? String(body.adminNotes) : null

    const updated = await prisma.talkMobiSubscription.update({
      where: { id },
      data: {
        status: 'rejected',
        adminNotes,
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
          title: 'Pedido de assinatura TalkMobi recusado',
          message: `Infelizmente seu pedido para o plano ${existing.planName} (${existing.dataAmount}) não pôde ser processado no momento.${
            adminNotes ? ` Motivo: ${adminNotes}` : ''
          } Você pode revisar os dados e enviar um novo pedido.`,
          isRead: false,
        },
      })
    } catch (nErr) {
      console.error('Failed to create rejection notification (non-fatal):', nErr)
    }

    return success({ request: serialize(updated), message: 'Pedido recusado e usuário notificado.' })
  } catch (err) {
    console.error('Admin TalkMobi subscription reject error:', err)
    return error('Failed to reject TalkMobi subscription', 500)
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
