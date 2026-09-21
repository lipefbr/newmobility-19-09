import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/drivers — list driver applications.

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const status = req.nextUrl.searchParams.get('status') || 'pending'
    const where: Record<string, unknown> = {}
    if (status !== 'all') where.status = status
    const applications = await prisma.driverApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, phone: true, profileImage: true, cpf: true } } },
      take: 100,
    })
    return success({ applications })
  } catch (err) {
    console.error('[/api/admingeral/drivers GET] error:', err)
    return error('Internal server error', 500)
  }
}
