import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/user-types
// ----------------------------------------------------------------------------
// CRUD for the UserType table. Admin-only (requires User.role === 'admin').
//
// GET  ?userId=<adminId>     → list all user types (active + inactive)
// POST { userId, code, label, ... }  → create a new user type
//
// On first GET, seeds the 6 default types from the original hardcoded
// QUALIFICATION_OPTIONS list (motorista, passageiro, passageiro_60,
// passageiro_pcd, comercio, entregador) so existing deployments keep working.
// ============================================================================

const DEFAULT_USER_TYPES = [
  {
    code: 'motorista',
    label: 'Motorista',
    description: 'Condutor de veículo (carro/moto) que realiza corridas',
    sortOrder: 1,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","metas","indicacoes"]',
    color: '#3b82f6',
    icon: '🚗',
  },
  {
    code: 'cliente',
    label: 'Cliente',
    description: 'Usuário comum que utiliza os serviços da plataforma',
    sortOrder: 2,
    defaultEntradaLevel: 2,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#10b981',
    icon: '👤',
  },
  {
    code: 'lojista',
    label: 'Lojista',
    description: 'Lojista / comerciante parceiro (gerencia loja, produtos e pedidos no Portal do Lojista)',
    sortOrder: 3,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 5,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","store","cashback","career","indicacoes"]',
    color: '#ec4899',
    icon: '🏪',
  },
  {
    code: 'entregador',
    label: 'Entregador',
    description: 'Entregador de encomendas / food delivery',
    sortOrder: 4,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 3,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","delivery","cashback","career","metas","indicacoes"]',
    color: '#f97316',
    icon: '🛵',
  },
  {
    code: 'mototaxista',
    label: 'Mototaxista',
    description: 'Condutor de moto que realiza transporte de passageiros (moto-táxi)',
    sortOrder: 5,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","metas","indicacoes"]',
    color: '#06b6d4',
    icon: '🏍️',
  },
  {
    code: 'motofretista',
    label: 'Motofretista',
    description: 'Condutor de moto que realiza entrega de encomendas (moto-frete)',
    sortOrder: 6,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 3,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","delivery","cashback","career","metas","indicacoes"]',
    color: '#0ea5e9',
    icon: '📦',
  },
  {
    code: 'motorista_app',
    label: 'Motorista de App',
    description: 'Condutor de veículo cadastrado em aplicativos de transporte (Uber, 99, etc.)',
    sortOrder: 7,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","metas","indicacoes"]',
    color: '#6366f1',
    icon: '📱',
  },
  {
    code: 'taxista',
    label: 'Taxista',
    description: 'Condutor de táxi licenciado (ponto fixo ou via aplicativo)',
    sortOrder: 8,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","metas","indicacoes"]',
    color: '#eab308',
    icon: '🚕',
  },
  {
    code: 'caminhoneiro',
    label: 'Caminhoneiro',
    description: 'Condutor de caminhão para transporte de cargas (curta, média e longa distância)',
    sortOrder: 9,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 3,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","delivery","cashback","career","metas","indicacoes"]',
    color: '#84cc16',
    icon: '🚚',
  },
  {
    code: 'outros',
    label: 'Outros',
    description: 'Outro tipo de atuação não listado (campo livre para personalização futura)',
    sortOrder: 99,
    defaultEntradaLevel: 1,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","cashback","career","indicacoes"]',
    color: '#6b7280',
    icon: '⚙️',
  },
  // ---- Legacy codes (kept for backward compatibility) ----
  // These map to the new codes via qualificationLabel() so old users
  // still see a friendly label. We keep the UserType row so existing
  // deployments don't lose data, but new registrations use the new codes.
  {
    code: 'passageiro',
    label: 'Passageiro (legado)',
    description: 'Código legado — use "cliente" para novos cadastros',
    sortOrder: 90,
    defaultEntradaLevel: 2,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#10b981',
    icon: '👤',
  },
  {
    code: 'passageiro_60',
    label: 'Passageiro 60+ (legado)',
    description: 'Código legado — use "cliente" para novos cadastros',
    sortOrder: 91,
    defaultEntradaLevel: 2,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#f59e0b',
    icon: '🧓',
  },
  {
    code: 'passageiro_pcd',
    label: 'Passageiro PCD (legado)',
    description: 'Código legado — use "cliente" para novos cadastros',
    sortOrder: 92,
    defaultEntradaLevel: 2,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#8b5cf6',
    icon: '♿',
  },
  {
    code: 'comercio',
    label: 'Comércio (legado)',
    description: 'Código legado — use "lojista" para novos cadastros',
    sortOrder: 93,
    defaultEntradaLevel: 3,
    defaultResidualLevel: 0,
    defaultVendasLevel: 5,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","store","cashback","career","indicacoes"]',
    color: '#ec4899',
    icon: '🏪',
  },
]

// Idempotent seed: inserts any missing default UserType rows without
// touching existing ones. This is safe to run on every GET — it only
// creates rows that don't exist yet (so deployments that already have
// custom user types are not affected).
async function seedDefaultUserTypesIfMissing() {
  for (const t of DEFAULT_USER_TYPES) {
    const existing = await prisma.userType.findUnique({ where: { code: t.code } })
    if (!existing) {
      await prisma.userType.create({ data: t })
    }
  }
}

// Backward-compat alias — old name preserved for any caller that still
// references it. Just delegates to the new idempotent version.
async function seedDefaultUserTypesIfEmpty() {
  await seedDefaultUserTypesIfMissing()
}

async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, userType: true },
  })
  if (!admin || (admin.role !== 'admin' && admin.userType !== 'admin')) {
    return null
  }
  return admin
}

// GET — list all user types (admin view, includes inactive)
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    await seedDefaultUserTypesIfEmpty()

    const types = await prisma.userType.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return success({ types })
  } catch (err) {
    console.error('Admin user-types GET error:', err)
    return error('Failed to fetch user types', 500)
  }
}

// POST — create a new user type
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      code,
      label,
      description = null,
      isActive = true,
      sortOrder = 99,
      defaultEntradaLevel = 0,
      defaultResidualLevel = 0,
      defaultVendasLevel = 0,
      showDriverGoals = false,
      mobilePermissions = '[]',
      color = null,
      icon = null,
    } = body

    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    if (!code || !label) {
      return error('code e label são obrigatórios', 400)
    }

    // Validate mobilePermissions is valid JSON
    try {
      JSON.parse(mobilePermissions)
    } catch {
      return error('mobilePermissions deve ser um JSON array válido (ex: ["dashboard","wallet"])', 400)
    }

    const existing = await prisma.userType.findUnique({ where: { code } })
    if (existing) return error('Já existe um tipo de usuário com este código', 400)

    const created = await prisma.userType.create({
      data: {
        code,
        label,
        description: description || null,
        isActive: Boolean(isActive),
        sortOrder: Number(sortOrder) || 99,
        defaultEntradaLevel: Number(defaultEntradaLevel) || 0,
        defaultResidualLevel: Number(defaultResidualLevel) || 0,
        defaultVendasLevel: Number(defaultVendasLevel) || 0,
        showDriverGoals: Boolean(showDriverGoals),
        mobilePermissions,
        color: color || null,
        icon: icon || null,
      },
    })

    return success(created, 201)
  } catch (err) {
    console.error('Admin user-types POST error:', err)
    return error('Failed to create user type', 500)
  }
}
