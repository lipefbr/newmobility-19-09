import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * Public Plans API
 *
 * Single source of truth: the `Plan` table.
 *
 * Previously this endpoint returned a hardcoded list of plans, which meant
 * admin edits to plan prices (via /api/admin/plans) never reached the
 * user-facing My Plan page or the upgrade transaction. Now we read directly
 * from the `Plan` table so admin edits propagate instantly.
 *
 * We only return plans that are BOTH `isActive: true` AND `isDefault: true`
 * — `isDefault` flags the canonical user-facing upgrade tiers
 * (free / blue3 / blue5). Monthly add-on plans such as
 * `mensalidade_do_cashback_entrada` are `isDefault: false` and are not
 * upgrade targets, so they are excluded here.
 */

// Default plan seeds — used only when the Plan table is completely empty
// (e.g. fresh DB). Values mirror the canonical NewMobility mensalidade
// (R$ 999,90 for both Blue 3 and Blue 5 per Task 2-b) so behaviour is
// unchanged on first boot. Admin edits afterwards are persisted to the
// same rows and surfaced via this endpoint.
const DEFAULT_PLANS_SEED = [
  {
    id: 'free',
    code: 'free',
    name: 'Gratuito',
    priceCents: 0,
    description: 'Plano gratuito para cadastro e indicações.',
    features: ['Cadastro gratuito', 'Indicação de usuários'],
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
    isActive: true,
    isDefault: true,
    sortOrder: 2,
  },
]

// Seed default plans via upsert if the Plan table is empty.
// This guarantees the public /api/plans endpoint always returns at least
// the canonical free/blue3/blue5 plans, even if the admin has never
// visited the admin panel (where /api/admin/plans also seeds on first
// GET). Using upsert keeps this idempotent and safe to run on every
// request — if the rows already exist (with admin-edited prices), the
// update branch is a no-op.
async function seedDefaultPlansIfEmpty() {
  const count = await prisma.plan.count()
  if (count > 0) return

  // Resolve matrix type IDs by code so newly seeded plans match the
  // existing matrix configuration.
  const matrixTypes = await prisma.matrixType.findMany()
  const findMt = (code: string) => matrixTypes.find((m) => m.code === code)?.id || null

  const matrixCodeMap: Record<string, { entrada?: string; residual?: string; vendas?: string }> = {
    free: { entrada: 'entrada_4x5', residual: 'residual_4x7', vendas: 'vendas_4x9' },
    blue3: { entrada: 'entrada_4x5', residual: 'residual_4x7', vendas: 'vendas_4x9' },
    blue5: { entrada: 'entrada_4x5', residual: 'residual_4x7', vendas: 'vendas_4x9' },
  }

  for (const p of DEFAULT_PLANS_SEED) {
    const m = matrixCodeMap[p.code] || {}
    await prisma.plan.upsert({
      where: { code: p.code },
      create: {
        id: p.id,
        code: p.code,
        name: p.name,
        priceCents: p.priceCents,
        description: p.description,
        features: JSON.stringify(p.features),
        isActive: p.isActive,
        isDefault: p.isDefault,
        sortOrder: p.sortOrder,
        matrixEntradaId: findMt(m.entrada || ''),
        matrixResidualId: findMt(m.residual || ''),
        matrixVendasId: findMt(m.vendas || ''),
      },
      update: {}, // do not overwrite admin-edited rows
    })
  }
}

// Map a Plan row to the response shape consumed by the frontend.
// Includes both `price` (legacy alias for priceCents) and `priceCents`
// (explicit) for backward compatibility. `level` mirrors `sortOrder` so
// the frontend can compare plan hierarchy without extra lookups.
async function formatPlan(plan: {
  id: string
  code: string
  name: string
  priceCents: number
  description: string | null
  features: string
  isActive: boolean
  isDefault: boolean
  sortOrder: number
  matrixEntradaId: string | null
  matrixResidualId: string | null
  matrixVendasId: string | null
}) {
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
  } catch {
    features = []
  }

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    price: plan.priceCents, // legacy alias for priceCents (back-compat)
    priceCents: plan.priceCents,
    description: plan.description || '',
    features,
    level: plan.sortOrder, // hierarchy level (0=free, 1=blue3, 2=blue5)
    isActive: plan.isActive,
    isDefault: plan.isDefault,
    sortOrder: plan.sortOrder,
    matrixEntrada,
    matrixResidual,
    matrixVendas,
  }
}

export async function GET() {
  try {
    // Ensure the Plan table has at least the default plans (idempotent upsert)
    await seedDefaultPlansIfEmpty()

    // Only return user-facing upgrade tiers (isDefault: true) — monthly
    // add-on plans like `mensalidade_*` are isDefault: false and are not
    // upgrade targets, so they are excluded from this public listing.
    const plans = await prisma.plan.findMany({
      where: { isActive: true, isDefault: true },
      orderBy: { sortOrder: 'asc' },
    })

    const formatted = await Promise.all(plans.map(formatPlan))
    return success({ plans: formatted })
  } catch (err) {
    console.error('Get plans error:', err)
    return error('Failed to fetch plans', 500)
  }
}
