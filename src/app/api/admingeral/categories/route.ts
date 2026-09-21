import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/categories — CRUD for AppCategory.
// GET  ?userId=<admin>          → list all categories
// POST { userId, code, label, ... } → create category

const DEFAULT_CATEGORIES = [
  { code: 'shopping', label: 'Shopping', icon: 'ShoppingBag', color: '#155EEF', sortOrder: 1 },
  { code: 'alimentacao', label: 'Alimentação', icon: 'UtensilsCrossed', color: '#F59E0B', sortOrder: 2 },
  { code: 'mercado', label: 'Mercado', icon: 'Cart', color: '#22C55E', sortOrder: 3 },
  { code: 'medidrop', label: 'MediDrop', icon: 'Pill', color: '#8B5CF6', sortOrder: 4 },
  { code: 'reserva', label: 'Reserva', icon: 'Calendar', color: '#EC4899', sortOrder: 5 },
  { code: 'assistencia', label: 'Assistência', icon: 'Wrench', color: '#06B6D4', sortOrder: 6 },
  { code: 'enviar', label: 'Enviar', icon: 'Send', color: '#F97316', sortOrder: 7 },
  { code: 'mobilidade', label: 'Mobilidade', icon: 'Car', color: '#3B82F6', sortOrder: 8 },
]

async function seedDefaultCategoriesIfEmpty() {
  const count = await prisma.appCategory.count().catch(() => 0)
  if (count > 0) return
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.appCategory.create({ data: c }).catch(() => {})
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)

    await seedDefaultCategoriesIfEmpty()
    const categories = await prisma.appCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      include: { _count: { select: { stores: true, products: true } } },
    })
    return success({ categories })
  } catch (err) {
    console.error('[/api/admingeral/categories GET] error:', err)
    return error('Internal server error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)

    const body = await req.json()
    const { code, label, description, icon, color, sortOrder, isActive } = body
    if (!code || !label) return error('code e label são obrigatórios', 400)

    const existing = await prisma.appCategory.findUnique({ where: { code } }).catch(() => null)
    if (existing) return error('Já existe uma categoria com este código', 400)

    const created = await prisma.appCategory.create({
      data: {
        code: String(code).toLowerCase().replace(/[^a-z0-9_]/g, ''),
        label,
        description: description || null,
        icon: icon || null,
        color: color || null,
        sortOrder: Number(sortOrder) || 99,
        isActive: isActive !== false,
      },
    })
    return success(created, 201)
  } catch (err) {
    console.error('[/api/admingeral/categories POST] error:', err)
    return error('Internal server error', 500)
  }
}
