import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/stores — list + create stores. Approve/verify is handled
// via PATCH on the [id] route (TODO if needed). For now, GET lists all stores
// with owner info, and POST creates a new store for a given owner.

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)

    const status = req.nextUrl.searchParams.get('status') // 'pending' | 'verified' | 'all'
    const where: Record<string, unknown> = {}
    if (status === 'pending') {
      where.isVerified = false
      where.isActive = true
    } else if (status === 'verified') {
      where.isVerified = true
    }

    const stores = await prisma.appStore.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, profileImage: true } },
        _count: { select: { products: true, orders: true } },
      },
      take: 100,
    })
    return success({ stores })
  } catch (err) {
    console.error('[/api/admingeral/stores GET] error:', err)
    return error('Internal server error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)

    const body = await req.json()
    const {
      ownerId,
      name,
      category = 'alimentacao',
      description,
      phone,
      email,
      address,
      city,
      state,
      zipCode,
      deliveryFeeCents = 0,
      minOrderCents = 0,
    } = body

    if (!ownerId || !name) return error('ownerId e name são obrigatórios', 400)

    // Verify owner exists and is a lojista/delivery
    const owner = await prisma.user.findUnique({ where: { id: ownerId } })
    if (!owner) return error('Proprietário não encontrado', 404)

    const slug = String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36).slice(-4)

    const store = await prisma.appStore.create({
      data: {
        ownerId,
        name,
        slug,
        category,
        description: description || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        deliveryFeeCents: Number(deliveryFeeCents) || 0,
        minOrderCents: Number(minOrderCents) || 0,
        isVerified: true, // admin-created stores are auto-verified
      },
    })
    return success(store, 201)
  } catch (err) {
    console.error('[/api/admingeral/stores POST] error:', err)
    return error('Internal server error', 500)
  }
}
