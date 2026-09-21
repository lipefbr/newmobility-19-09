import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * Admin: approve a TalkMobi subscription request.
 *
 *   POST /api/admin/talkmobi-subscriptions/[id]/approve
 *   body: { adminId, activationLink?, adminNotes? }
 *
 * Sets the request status to 'approved', stores the activation link (SIM ICCID,
 * eSIM QR URL, or activation instructions the admin wants the user to see), and
 * creates a Notification so the user is alerted in their backoffice.
 *
 * NOTE: We intentionally do NOT debit the user's wallet here. The original
 * /api/talkmobi/purchase flow (instant purchase) is preserved for users who
 * want immediate digital activation. This subscription-request flow is for
 * cases where the admin needs to manually provision a SIM chip / line, so
 * billing happens out-of-band (e.g. charged to the user's carrier invoice).
 * If the admin wants to grant the cashback/points immediately, they can do
 * so via the existing manual cashback / manual points tools in the admin panel.
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

    const activationLink = body?.activationLink ? String(body.activationLink) : null
    const adminNotes = body?.adminNotes ? String(body.adminNotes) : null

    const updated = await prisma.talkMobiSubscription.update({
      where: { id },
      data: {
        status: 'approved',
        activationLink,
        adminNotes,
        approvedById: auth.admin.id,
        approvedAt: new Date(),
        rejectedAt: null,
      },
    })

    // Notify the user in-app — they will see the activation link in their
    // TalkMobi page the next time they open it.
    try {
      await prisma.notification.create({
        data: {
          userId: existing.userId,
          type: 'system',
          title: 'Assinatura TalkMobi aprovada! 🎉',
          message: activationLink
            ? `Seu plano ${existing.planName} (${existing.dataAmount}) foi ativado. Instruções de acesso: ${activationLink}`
            : `Seu plano ${existing.planName} (${existing.dataAmount}) foi aprovado! Abra a página TalkMobi + Telemedicina para ver os detalhes.`,
          isRead: false,
        },
      })
    } catch (nErr) {
      console.error('Failed to create approval notification (non-fatal):', nErr)
    }

    return success({ request: serialize(updated), message: 'Pedido aprovado e usuário notificado.' })
  } catch (err) {
    console.error('Admin TalkMobi subscription approve error:', err)
    return error('Failed to approve TalkMobi subscription', 500)
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
