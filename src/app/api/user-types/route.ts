import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/user-types  (public — no admin auth required)
// ----------------------------------------------------------------------------
// Returns the list of ACTIVE user types for use in registration / profile
// forms. Seeds defaults on first call so a fresh deployment has the original
// 6 types (motorista, passageiro, passageiro_60, passageiro_pcd, comercio,
// entregador) available immediately.
//
// Query params:
//   includeMobile=1  → also returns mobilePermissions as a parsed array
//                      (used by the /mobile/* skeleton to gate features)
// ============================================================================

const DEFAULT_USER_TYPES = [
  {
    code: 'motorista',
    label: 'Motorista',
    description: 'Condutor de veículo (carro/moto) que realiza corridas',
    sortOrder: 1,
    defaultEntradaLevel: 0,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","metas","indicacoes"]',
    color: '#3b82f6',
    icon: '🚗',
  },
  {
    code: 'passageiro',
    label: 'Passageiro',
    description: 'Usuário comum que solicita corridas',
    sortOrder: 2,
    defaultEntradaLevel: 0,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#10b981',
    icon: '👤',
  },
  {
    code: 'passageiro_60',
    label: 'Passageiro 60+',
    description: 'Passageiro com 60 anos ou mais (benefícios especiais)',
    sortOrder: 3,
    defaultEntradaLevel: 0,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#f59e0b',
    icon: '🧓',
  },
  {
    code: 'passageiro_pcd',
    label: 'Passageiro com Mobilidade Reduzida',
    description: 'Passageiro PCD com necessidades especiais de acessibilidade',
    sortOrder: 4,
    defaultEntradaLevel: 0,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","ride_request","cashback","career","indicacoes"]',
    color: '#8b5cf6',
    icon: '♿',
  },
  {
    code: 'comercio',
    label: 'Comércio',
    description: 'Lojista / comerciante parceiro (recebe cashback de vendas)',
    sortOrder: 5,
    defaultEntradaLevel: 0,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: '["dashboard","wallet","store","cashback","career","indicacoes"]',
    color: '#ec4899',
    icon: '🏪',
  },
  {
    code: 'entregador',
    label: 'Entregador',
    description: 'Entregador de encomendas / food delivery',
    sortOrder: 6,
    defaultEntradaLevel: 0,
    defaultResidualLevel: 0,
    defaultVendasLevel: 0,
    showDriverGoals: true,
    mobilePermissions: '["dashboard","wallet","delivery","cashback","career","metas","indicacoes"]',
    color: '#f97316',
    icon: '🛵',
  },
]

async function seedDefaultsIfEmpty() {
  const count = await prisma.userType.count()
  if (count > 0) return
  for (const t of DEFAULT_USER_TYPES) {
    await prisma.userType.create({ data: t })
  }
}

export async function GET(req: NextRequest) {
  try {
    await seedDefaultsIfEmpty()
    const includeMobile = req.nextUrl.searchParams.get('includeMobile') === '1'

    const types = await prisma.userType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    const out = types.map((t) => {
      const base = {
        id: t.id,
        code: t.code,
        label: t.label,
        description: t.description,
        sortOrder: t.sortOrder,
        defaultEntradaLevel: t.defaultEntradaLevel,
        defaultResidualLevel: t.defaultResidualLevel,
        defaultVendasLevel: t.defaultVendasLevel,
        showDriverGoals: t.showDriverGoals,
        color: t.color,
        icon: t.icon,
      }
      if (includeMobile) {
        let perms: string[] = []
        try {
          perms = JSON.parse(t.mobilePermissions || '[]')
        } catch {
          perms = []
        }
        return { ...base, mobilePermissions: perms }
      }
      return base
    })

    return success({ types: out })
  } catch (err) {
    console.error('user-types GET error:', err)
    return error('Failed to fetch user types', 500)
  }
}
