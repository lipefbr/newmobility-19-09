import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Default partners to seed if the table is empty — inspired by the original
// newmobility.com.br/clube_descontos.php Power Cash page.
const DEFAULT_PARTNERS = [
  { name: 'Pet Shop Amigo Fiel', category: 'pet', discountText: '15% OFF em banho e tosa', cashbackPercent: 5, isFeatured: true, sortOrder: 1, description: 'Banho, tosa, vacinas e acessórios para seu pet com desconto exclusivo.' },
  { name: 'Supermercado Economia', category: 'food', discountText: '5% de cashback', cashbackPercent: 5, isFeatured: true, sortOrder: 2, description: 'Cashback em todas as compras do mês.' },
  { name: 'Farmácia Saúde Total', category: 'health', discountText: 'Até 20% OFF em medicamentos', cashbackPercent: 8, isFeatured: true, sortOrder: 3, description: 'Desconto em medicamentos e produtos de higiene.' },
  { name: 'Auto Center Veloz', category: 'auto', discountText: '10% OFF em troca de óleo', cashbackPercent: 4, sortOrder: 4, description: 'Mecânica, alinhamento e balanceamento com preço especial.' },
  { name: 'Restaurante Sabor & Arte', category: 'food', discountText: '12% OFF no almoço', cashbackPercent: 6, sortOrder: 5, description: 'Comida caseira com desconto no horário de almoço.' },
  { name: 'Beleza & Cia Salão', category: 'beauty', discountText: 'R$ 30 de cashback', cashbackPercent: 10, sortOrder: 6, description: 'Cabelo, unhas e estética com cashback na carteira.' },
  { name: 'Academia FitLife', category: 'health', discountText: 'Matrícula grátis + 10% OFF', cashbackPercent: 7, sortOrder: 7, description: 'Mensalidade com desconto e matrícula isenta.' },
  { name: 'Loja de Eletrônicos TechMax', category: 'services', discountText: 'Até 15% OFF', cashbackPercent: 6, sortOrder: 8, description: 'Smartphones, notebooks e acessórios com desconto.' },
  { name: 'Posto Combustível Green', category: 'auto', discountText: 'R$ 0,30 off por litro', cashbackPercent: 3, sortOrder: 9, description: 'Desconto no litro de combustível em postos credenciados.' },
  { name: 'Papelaria Mundo Criativo', category: 'services', discountText: '8% OFF em material escolar', cashbackPercent: 4, sortOrder: 10, description: 'Material escolar, escritório e artes.' },
  { name: 'Clínica Odontológica Sorriso', category: 'health', discountText: '20% OFF em limpeza', cashbackPercent: 9, isFeatured: true, sortOrder: 11, description: 'Consultas e tratamentos odontológicos com desconto.' },
  { name: 'Floricultura Jardim', category: 'services', discountText: '10% OFF em buquês', cashbackPercent: 5, sortOrder: 12, description: 'Flores, plantas e arranjos com preço especial.' },
]

async function seedDefaultsIfEmpty() {
  const count = await prisma.discountClubPartner.count()
  if (count > 0) return
  for (const p of DEFAULT_PARTNERS) {
    await prisma.discountClubPartner.create({
      data: {
        name: p.name,
        category: p.category,
        discountText: p.discountText,
        cashbackPercent: p.cashbackPercent,
        description: p.description,
        isFeatured: p.isFeatured ?? false,
        isActive: true,
        sortOrder: p.sortOrder,
      },
    })
  }
}

async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'admin') return null
  return user
}

// GET /api/discount-club?search=&category=&featured=&userId=
export async function GET(req: NextRequest) {
  try {
    await seedDefaultsIfEmpty()
    const sp = req.nextUrl.searchParams
    const search = sp.get('search')?.trim()
    const category = sp.get('category')
    const featured = sp.get('featured') === 'true'
    const adminUserId = sp.get('userId')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (category && category !== 'all') where.category = category
    if (featured) where.isFeatured = true
    const isAdmin = adminUserId ? !!(await requireAdmin(adminUserId)) : false
    if (!isAdmin) where.isActive = true

    const partners = await prisma.discountClubPartner.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return success({ partners })
  } catch (err) {
    console.error('Get discount club error:', err)
    return error('Failed to fetch discount club partners', 500)
  }
}

// POST — admin only — create a new partner
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, name, logoUrl, category, discountText, cashbackPercent, description, websiteUrl, phone, isFeatured, isActive, sortOrder } = body
    if (!(await requireAdmin(userId))) return error('Unauthorized', 403)

    if (!name || !name.trim()) return error('name is required', 400)
    if (!category || !category.trim()) return error('category is required', 400)

    const created = await prisma.discountClubPartner.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl?.trim() || null,
        category: category.trim(),
        discountText: discountText?.trim() || null,
        cashbackPercent: Math.max(0, Math.min(100, Number(cashbackPercent) || 0)),
        description: description?.trim() || null,
        websiteUrl: websiteUrl?.trim() || null,
        phone: phone?.trim() || null,
        isFeatured: !!isFeatured,
        isActive: isActive !== false,
        sortOrder: Number(sortOrder) || 0,
      },
    })
    return success(created)
  } catch (err) {
    console.error('Create discount club partner error:', err)
    return error('Failed to create partner', 500)
  }
}
