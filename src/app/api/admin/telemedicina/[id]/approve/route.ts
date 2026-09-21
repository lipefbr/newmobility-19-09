import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * Admin: approve a Telemedicina activation request.
 *
 *   POST /api/admin/telemedicina/[id]/approve
 *   body: { adminId, activationLink?, adminNotes? }
 *
 * Sets the request status to 'approved', stores the activation link (URL,
 * credential, or instruction the admin wants the user to see), and creates
 * a Notification so the user is alerted in their backoffice.
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

    const activationLink = body?.activationLink ? String(body.activationLink) : null
    const adminNotes = body?.adminNotes ? String(body.adminNotes) : null

    const updated = await prisma.telemedicinaRequest.update({
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
    // Telemedicina section the next time they open the page.
    try {
      await prisma.notification.create({
        data: {
          userId: existing.userId,
          type: 'system',
          title: 'Telemedicina ativada! 🎉',
          message: activationLink
            ? `Seu acesso à Telemedicina foi aprovado. Acesse: ${activationLink}`
            : 'Seu acesso à Telemedicina foi aprovado! Abra a página TalkMobi + Telemedicina para ver as instruções.',
          isRead: false,
        },
      })
    } catch (nErr) {
      console.error('Failed to create approval notification (non-fatal):', nErr)
    }

    return success({ request: serialize(updated), message: 'Pedido aprovado e usuário notificado.' })
  } catch (err) {
    console.error('Admin Telemedicina approve error:', err)
    return error('Failed to approve Telemedicina request', 500)
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
