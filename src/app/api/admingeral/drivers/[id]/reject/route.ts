import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/drivers/[id]/reject — reject a driver application.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const application = await prisma.driverApplication.findUnique({ where: { id } })
    if (!application) return error('Inscrição não encontrada', 404)

    const updated = await prisma.driverApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedById: admin.id,
        reviewedAt: new Date(),
        rejectedReason: body.reason || null,
        adminNotes: body.adminNotes || null,
      },
    })
    return success(updated)
  } catch (err) {
    console.error('[/api/admingeral/drivers/[id]/reject] error:', err)
    return error('Internal server error', 500)
  }
}
