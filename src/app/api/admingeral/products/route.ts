import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/products — list + create products.

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const storeId = req.nextUrl.searchParams.get('storeId')
    const where: Record<string, unknown> = {}
    if (storeId) where.storeId = storeId
    const products = await prisma.appProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { store: { select: { name: true } } },
      take: 100,
    })
    return success({ products })
  } catch (err) {
    console.error('[/api/admingeral/products GET] error:', err)
    return error('Internal server error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const body = await req.json()
    const { storeId, name, description, priceCents, oldPriceCents, imageUrl, category, categoryCode, isAvailable, isFeatured, sortOrder, stock, calories, preparationTimeMin } = body
    if (!storeId || !name || priceCents === undefined) return error('storeId, name e priceCents são obrigatórios', 400)
    const created = await prisma.appProduct.create({
      data: {
        storeId, name, description: description || null, priceCents: Number(priceCents),
        oldPriceCents: oldPriceCents ? Number(oldPriceCents) : null,
        imageUrl: imageUrl || null, category: category || null, categoryCode: categoryCode || null,
        isAvailable: isAvailable !== false, isFeatured: Boolean(isFeatured),
        sortOrder: Number(sortOrder) || 99, stock: Number(stock) ?? -1,
        calories: calories ? Number(calories) : null, preparationTimeMin: preparationTimeMin ? Number(preparationTimeMin) : null,
      },
    })
    return success(created, 201)
  } catch (err) {
    console.error('[/api/admingeral/products POST] error:', err)
    return error('Internal server error', 500)
  }
}
