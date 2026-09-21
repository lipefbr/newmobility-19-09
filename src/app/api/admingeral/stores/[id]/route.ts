import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/stores/[id] — get/update/delete a single store.

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const { id } = await params
    const store = await prisma.appStore.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        products: { take: 50, orderBy: { sortOrder: 'asc' } },
        _count: { select: { orders: true } },
      },
    })
    if (!store) return error('Loja não encontrada', 404)
    return success(store)
  } catch (err) {
    console.error('[/api/admingeral/stores/[id] GET] error:', err)
    return error('Internal server error', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const { id } = await params
    const body = await req.json()
    const allowed: Record<string, unknown> = {}
    for (const k of ['isVerified', 'isFeatured', 'isActive', 'isOpen', 'name', 'description', 'category', 'deliveryFeeCents', 'minOrderCents', 'estimatedDeliveryMin', 'phone', 'email', 'address', 'city', 'state', 'zipCode', 'rating']) {
      if (k in body) allowed[k] = body[k]
    }
    const updated = await prisma.appStore.update({ where: { id }, data: allowed })
    return success(updated)
  } catch (err) {
    console.error('[/api/admingeral/stores/[id] PATCH] error:', err)
    return error('Internal server error', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const { id } = await params
    await prisma.appStore.delete({ where: { id } })
    return success({ deleted: true })
  } catch (err) {
    console.error('[/api/admingeral/stores/[id] DELETE] error:', err)
    return error('Internal server error', 500)
  }
}
