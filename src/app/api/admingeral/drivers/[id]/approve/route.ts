import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/drivers/[id]/approve — approve a driver application.
// Sets application status='approved' AND flips User.isDriver=true so they
// can log in to /motorista.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const application = await prisma.driverApplication.findUnique({ where: { id } })
    if (!application) return error('Inscrição não encontrada', 404)
    if (application.status === 'approved') return error('Inscrição já aprovada', 400)

    await prisma.$transaction([
      prisma.driverApplication.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedById: admin.id,
          reviewedAt: new Date(),
          adminNotes: body.adminNotes || null,
        },
      }),
      prisma.user.update({
        where: { id: application.userId },
        data: { isDriver: true, userType: 'motorista' },
      }),
    ])

    return success({ approved: true, userId: application.userId })
  } catch (err) {
    console.error('[/api/admingeral/drivers/[id]/approve] error:', err)
    return error('Internal server error', 500)
  }
}
