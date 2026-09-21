import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/orders — list all orders across stores, with filters.

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const status = req.nextUrl.searchParams.get('status')
    const storeId = req.nextUrl.searchParams.get('storeId')
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (storeId) where.storeId = storeId
    const orders = await prisma.appOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { name: true, logoUrl: true } },
        customer: { select: { name: true, email: true } },
        items: true,
      },
      take: 100,
    })
    return success({ orders })
  } catch (err) {
    console.error('[/api/admingeral/orders GET] error:', err)
    return error('Internal server error', 500)
  }
}
