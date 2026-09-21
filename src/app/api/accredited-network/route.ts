import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Default accredited network items — inspired by newmobility.com.br/rede_credenciada.php
// which lists gas stations (postos) by city/state with their brand (Shell, Ipiranga, BR, Gulf, Ale).
const DEFAULT_ITEMS = [
  // São Paulo
  { name: 'Posto Full (Mal. Tito)', category: 'posto', brand: 'Shell', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Duque Voluntários', category: 'posto', brand: 'BR', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,15 off por litro', cashbackPercent: 1 },
  { name: 'Posto Batalha', category: 'posto', brand: 'Shell', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Comaris', category: 'posto', brand: 'BR', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,15 off por litro', cashbackPercent: 1 },
  { name: 'Posto Sete Estrelas (Av. 1)', category: 'posto', brand: 'Shell', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Atalaia (Av. Santo Amaro)', category: 'posto', brand: 'Shell', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Celta (Av. João Dias)', category: 'posto', brand: 'Shell', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Juljor (Cebolão)', category: 'posto', brand: 'Gulf', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,18 off por litro', cashbackPercent: 1 },
  { name: 'Posto Portal Santa Maria (Guarapiranga)', category: 'posto', brand: 'Ipiranga', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Ísola (Av. Atlântica)', category: 'posto', brand: 'Shell', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Sucesso (Metrô Jabaquara)', category: 'posto', brand: 'BR', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,15 off por litro', cashbackPercent: 1 },
  { name: 'Posto Bela Cintra (Consolação)', category: 'posto', brand: 'Shell', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Rebouças', category: 'posto', brand: 'Ipiranga', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Blue (Tietê)', category: 'posto', brand: 'Gulf', city: 'São Paulo', state: 'SP', discountText: 'R$ 0,18 off por litro', cashbackPercent: 1 },
  // Guarulhos / ABC
  { name: 'Posto Aero (Av. Guarulhos)', category: 'posto', brand: 'Ipiranga', city: 'Guarulhos', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Mestre (Vila Galvão)', category: 'posto', brand: 'Shell', city: 'Guarulhos', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Automan (Estação Utinga)', category: 'posto', brand: 'BR', city: 'Santo André', state: 'SP', discountText: 'R$ 0,15 off por litro', cashbackPercent: 1 },
  { name: 'Posto Fita Azul (Rudge Ramos)', category: 'posto', brand: 'Ipiranga', city: 'São Bernardo do Campo', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Oliveira & Lima', category: 'posto', brand: 'Shell', city: 'Osasco', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  // Campinas / Interior
  { name: 'Posto Jardim Paulicéia', category: 'posto', brand: 'Ipiranga', city: 'Campinas', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Campos Elíseos', category: 'posto', brand: 'Ipiranga', city: 'Campinas', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Bonfim', category: 'posto', brand: 'Ipiranga', city: 'Campinas', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Trianon', category: 'posto', brand: 'BR', city: 'Catanduva', state: 'SP', discountText: 'R$ 0,15 off por litro', cashbackPercent: 1 },
  { name: 'Posto PetroNuno', category: 'posto', brand: 'Ipiranga', city: 'Bauru', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Portal (Olé Brasil)', category: 'posto', brand: 'Ipiranga', city: 'Ribeirão Preto', state: 'SP', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  // Rio de Janeiro
  { name: 'Posto Megão (Recreio)', category: 'posto', brand: 'Shell', city: 'Rio de Janeiro', state: 'RJ', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Nordeste (Abelardo Bueno)', category: 'posto', brand: 'BR', city: 'Rio de Janeiro', state: 'RJ', discountText: 'R$ 0,15 off por litro', cashbackPercent: 1 },
  { name: 'Posto Sete da Lira (Santíssimo)', category: 'posto', brand: 'Shell', city: 'Rio de Janeiro', state: 'RJ', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Irajá (Pavuna)', category: 'posto', brand: 'BR', city: 'Rio de Janeiro', state: 'RJ', discountText: 'R$ 0,15 off por litro', cashbackPercent: 1 },
  { name: 'Posto dos Afonsos (Valqueire)', category: 'posto', brand: 'BR', city: 'Rio de Janeiro', state: 'RJ', discountText: 'R$ 0,15 off por litro', cashbackPercent: 1 },
  { name: 'Posto Cachamorra', category: 'posto', brand: 'Shell', city: 'Rio de Janeiro', state: 'RJ', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Nova Ipanema', category: 'posto', brand: 'Shell', city: 'Rio de Janeiro', state: 'RJ', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Satélite (Dutra)', category: 'posto', brand: 'Ipiranga', city: 'São João de Meriti', state: 'RJ', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  // Minas Gerais
  { name: 'Posto BH Center', category: 'posto', brand: 'Ipiranga', city: 'Belo Horizonte', state: 'MG', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Savassi Express', category: 'posto', brand: 'Shell', city: 'Belo Horizonte', state: 'MG', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  { name: 'Posto Contagem Sul', category: 'posto', brand: 'BR', city: 'Contagem', state: 'MG', discountText: 'R$ 0,15 off por litro', cashbackPercent: 1 },
  { name: 'Posto Uberlândia Norte', category: 'posto', brand: 'Ipiranga', city: 'Uberlândia', state: 'MG', discountText: 'R$ 0,20 off por litro', cashbackPercent: 1 },
  // Farmácias credenciadas
  { name: 'Drogaria Raia - Centro', category: 'farmacia', brand: 'Raia', city: 'São Paulo', state: 'SP', discountText: 'Até 25% OFF em medicamentos', cashbackPercent: 5 },
  { name: 'Drogasil - Av. Paulista', category: 'farmacia', brand: 'Drogasil', city: 'São Paulo', state: 'SP', discountText: 'Até 20% OFF', cashbackPercent: 4 },
  { name: 'Pague Menos - Centro', category: 'farmacia', brand: 'Pague Menos', city: 'Rio de Janeiro', state: 'RJ', discountText: 'Até 22% OFF', cashbackPercent: 4 },
  { name: 'São João - Savassi', category: 'farmacia', brand: 'São João', city: 'Belo Horizonte', state: 'MG', discountText: 'Até 18% OFF', cashbackPercent: 4 },
  // Supermercados
  { name: 'Supermercado Pão de Açúcar - Jardins', category: 'mercado', brand: 'Pão de Açúcar', city: 'São Paulo', state: 'SP', discountText: '5% de cashback', cashbackPercent: 5 },
  { name: 'Extra Hipermercado - Tijuca', category: 'mercado', brand: 'Extra', city: 'Rio de Janeiro', state: 'RJ', discountText: '4% de cashback', cashbackPercent: 4 },
  { name: 'Assaí Atacadista - Contagem', category: 'mercado', brand: 'Assaí', city: 'Contagem', state: 'MG', discountText: '3% de cashback', cashbackPercent: 3 },
  // Restaurantes
  { name: 'Restaurante Madero - JK', category: 'restaurante', brand: 'Madero', city: 'São Paulo', state: 'SP', discountText: '10% OFF', cashbackPercent: 5 },
  { name: 'Outback - Barra da Tijuca', category: 'restaurante', brand: 'Outback', city: 'Rio de Janeiro', state: 'RJ', discountText: '10% OFF', cashbackPercent: 5 },
]

async function seedDefaultsIfEmpty() {
  const count = await prisma.accreditedNetworkItem.count()
  if (count > 0) return
  for (let i = 0; i < DEFAULT_ITEMS.length; i++) {
    const it = DEFAULT_ITEMS[i]
    await prisma.accreditedNetworkItem.create({
      data: {
        name: it.name,
        category: it.category,
        brand: it.brand,
        city: it.city,
        state: it.state,
        discountText: it.discountText,
        cashbackPercent: it.cashbackPercent,
        isActive: true,
        sortOrder: i + 1,
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

// GET /api/accredited-network?search=&state=&category=&brand=&userId=
export async function GET(req: NextRequest) {
  try {
    await seedDefaultsIfEmpty()
    const sp = req.nextUrl.searchParams
    const search = sp.get('search')?.trim()
    const state = sp.get('state')
    const category = sp.get('category')
    const brand = sp.get('brand')
    const adminUserId = sp.get('userId')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (state && state !== 'all') where.state = state
    if (category && category !== 'all') where.category = category
    if (brand && brand !== 'all') where.brand = brand
    const isAdmin = adminUserId ? !!(await requireAdmin(adminUserId)) : false
    if (!isAdmin) where.isActive = true

    const [items, states, categories, brands] = await Promise.all([
      prisma.accreditedNetworkItem.findMany({
        where,
        orderBy: [{ state: 'asc' }, { city: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.accreditedNetworkItem.findMany({ where: isAdmin ? {} : { isActive: true }, select: { state: true }, distinct: ['state'], orderBy: { state: 'asc' } }),
      prisma.accreditedNetworkItem.findMany({ where: isAdmin ? {} : { isActive: true }, select: { category: true }, distinct: ['category'], orderBy: { category: 'asc' } }),
      prisma.accreditedNetworkItem.findMany({ where: isAdmin ? { brand: { not: null } } : { isActive: true, brand: { not: null } }, select: { brand: true }, distinct: ['brand'], orderBy: { brand: 'asc' } }),
    ])

    return success({
      items,
      states: states.map(s => s.state),
      categories: categories.map(c => c.category),
      brands: brands.map(b => b.brand).filter(Boolean),
    })
  } catch (err) {
    console.error('Get accredited network error:', err)
    return error('Failed to fetch accredited network', 500)
  }
}

// POST — admin only — create new accredited item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, name, category, brand, city, state, address, phone, discountText, cashbackPercent, isActive, sortOrder } = body
    if (!(await requireAdmin(userId))) return error('Unauthorized', 403)

    if (!name || !name.trim()) return error('name is required', 400)
    if (!city || !city.trim()) return error('city is required', 400)
    if (!state || !state.trim()) return error('state is required', 400)

    const created = await prisma.accreditedNetworkItem.create({
      data: {
        name: name.trim(),
        category: (category || 'posto').trim(),
        brand: brand?.trim() || null,
        city: city.trim(),
        state: state.trim().toUpperCase(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        discountText: discountText?.trim() || null,
        cashbackPercent: Math.max(0, Math.min(100, Number(cashbackPercent) || 0)),
        isActive: isActive !== false,
        sortOrder: Number(sortOrder) || 0,
      },
    })
    return success(created)
  } catch (err) {
    console.error('Create accredited item error:', err)
    return error('Failed to create accredited item', 500)
  }
}
