import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Default plans - used only for initial seeding (when DB is empty)
const DEFAULT_PLANS_SEED = [
  {
    id: 'free',
    code: 'free',
    name: 'Gratuito',
    priceCents: 0,
    description: 'Plano gratuito para cadastro e indicações.',
    features: ['Cadastro gratuito', 'Indicação de usuários'],
    matrixEntradaCode: 'entrada_4x5',
    matrixResidualCode: 'residual_4x7',
    matrixVendasCode: 'vendas_4x9',
    isActive: true,
    isDefault: true,
    sortOrder: 0,
  },
  {
    id: 'blue3',
    code: 'blue3',
    name: 'Blue 3',
    // Task 2-b: Blue 3 mensalidade is R$ 999,90 (same as Blue 5). Blue 3
    // ONLY liberates 3 níveis of Cashback Entrada — Residual and Vendas
    // are blocked. The description explicitly states this so users see
    // the difference between Blue 3 and Blue 5.
    priceCents: 99990,
    description: 'Libera 3 níveis do Cashback Entrada',
    features: [
      'Cashback Entrada (3 níveis da matriz 4x5)',
      'App Mobilidade',
      'App Refeição',
      'App Farmácia',
      'App Compras',
      'Gratificações disponíveis',
      'Plano de Carreira',
    ],
    matrixEntradaCode: 'entrada_4x5',
    matrixResidualCode: 'residual_4x7',
    matrixVendasCode: 'vendas_4x9',
    isActive: true,
    isDefault: true,
    sortOrder: 1,
  },
  {
    id: 'blue5',
    code: 'blue5',
    name: 'Blue 5 Premium',
    // Task 2-b: Blue 5 mensalidade is R$ 999,90. Blue 5 unlocks ALL
    // three cashback matrices (5 Entrada + 7 Residual + 9 Vendas).
    priceCents: 99990,
    description: 'Libera 5 níveis do Cashback Entrada + 7 níveis Residual + 9 níveis Vendas.',
    features: [
      'Tudo do plano Blue 3',
      'Cashback Entrada (5 níveis da matriz 4x5)',
      'Cashback Residual (7 níveis da matriz 4x7)',
      'Cashback Vendas (9 níveis da matriz 4x9)',
      'Gratificações exclusivas',
      'Prioridade no suporte',
      'Bônus de adesão aumentado',
      'App Pet',
      'Seguro telefone',
      'Telemedicina',
      'Assistência funerária',
    ],
    matrixEntradaCode: 'entrada_4x5',
    matrixResidualCode: 'residual_4x7',
    matrixVendasCode: 'vendas_4x9',
    isActive: true,
    isDefault: true,
    sortOrder: 2,
  },
]

async function seedDefaultPlansIfEmpty() {
  const count = await prisma.plan.count()
  if (count > 0) return

  // Resolve matrix type IDs by code
  const matrixTypes = await prisma.matrixType.findMany()
  const findMt = (code: string) => matrixTypes.find((m) => m.code === code)?.id || null

  for (const p of DEFAULT_PLANS_SEED) {
    await prisma.plan.create({
      data: {
        id: p.id,
        code: p.code,
        name: p.name,
        priceCents: p.priceCents,
        description: p.description,
        features: JSON.stringify(p.features),
        isActive: p.isActive,
        isDefault: p.isDefault,
        sortOrder: p.sortOrder,
        matrixEntradaId: findMt(p.matrixEntradaCode),
        matrixResidualId: findMt(p.matrixResidualCode),
        matrixVendasId: findMt(p.matrixVendasCode),
      },
    })
  }
}

// Helper to format plan for API response (with optional matrix info)
async function formatPlan(plan: any) {
  let matrixEntrada = '-'
  let matrixResidual = '-'
  let matrixVendas = '-'

  if (plan.matrixEntradaId) {
    const mt = await prisma.matrixType.findUnique({ where: { id: plan.matrixEntradaId } })
    if (mt) matrixEntrada = `${mt.width}x${mt.depth}`
  }
  if (plan.matrixResidualId) {
    const mt = await prisma.matrixType.findUnique({ where: { id: plan.matrixResidualId } })
    if (mt) matrixResidual = `${mt.width}x${mt.depth}`
  }
  if (plan.matrixVendasId) {
    const mt = await prisma.matrixType.findUnique({ where: { id: plan.matrixVendasId } })
    if (mt) matrixVendas = `${mt.width}x${mt.depth}`
  }

  let features: string[] = []
  try {
    features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || []
  } catch { features = [] }

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    price: plan.priceCents,
    description: plan.description || '',
    features,
    matrixEntrada,
    matrixResidual,
    matrixVendas,
    matrixEntradaId: plan.matrixEntradaId,
    matrixResidualId: plan.matrixResidualId,
    matrixVendasId: plan.matrixVendasId,
    isActive: plan.isActive,
    isDefault: plan.isDefault,
    sortOrder: plan.sortOrder,
  }
}

// GET all plans (admin view) - returns DB plans with user counts
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    // Seed defaults if no plans exist
    await seedDefaultPlansIfEmpty()

    const plans = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } })

    // Get user count per plan (by code stored on User.plan field)
    const userPlans = await prisma.user.findMany({ select: { plan: true } })
    const planCountMap: Record<string, number> = {}
    for (const u of userPlans) {
      planCountMap[u.plan] = (planCountMap[u.plan] || 0) + 1
    }

    const plansWithCount = await Promise.all(
      plans.map(async (p) => {
        const formatted = await formatPlan(p)
        return { ...formatted, userCount: planCountMap[p.code] || 0 }
      })
    )

    return success({ plans: plansWithCount })
  } catch (err) {
    console.error('Get plans error:', err)
    return error('Failed to fetch plans', 500)
  }
}

// POST create a new plan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      name,
      price,
      features,
      matrixEntradaId,
      matrixResidualId,
      matrixVendasId,
      description,
      isActive = true,
      sortOrder = 99,
    } = body

    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!name || price === undefined) return error('name and price are required', 400)

    // Generate plan ID and code from name
    const baseCode = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    let code = baseCode
    let id = baseCode

    // Ensure uniqueness
    let suffix = 1
    while (await prisma.plan.findUnique({ where: { code } })) {
      code = `${baseCode}_${suffix}`
      id = `${baseCode}_${suffix}`
      suffix++
    }
    // Ensure ID uniqueness too (with cuid fallback if needed)
    if (await prisma.plan.findUnique({ where: { id } })) {
      id = `${baseCode}_${Date.now()}`
    }

    const featuresArray = Array.isArray(features)
      ? features
      : typeof features === 'string'
        ? features.split(',').map((f: string) => f.trim()).filter(Boolean)
        : []

    const created = await prisma.plan.create({
      data: {
        id,
        code,
        name,
        priceCents: Number(price),
        description: description || '',
        features: JSON.stringify(featuresArray),
        isActive: Boolean(isActive),
        isDefault: false,
        sortOrder: Number(sortOrder),
        matrixEntradaId: matrixEntradaId || null,
        matrixResidualId: matrixResidualId || null,
        matrixVendasId: matrixVendasId || null,
      },
    })

    const formatted = await formatPlan(created)
    return success(formatted)
  } catch (err) {
    console.error('Create plan error:', err)
    return error('Failed to create plan', 500)
  }
}
