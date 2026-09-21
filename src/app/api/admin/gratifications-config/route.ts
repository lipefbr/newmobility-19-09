import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// BACK-7 + Task 2-c / Item 7 — Admin config for the "Metas" module.
//
// Stores TWO pieces of state:
//
//   1. `targetQualification` — overall module visibility. Controls who can
//      see the Metas menu item in the sidebar AND who can access the
//      gratifications page at all. Stored on the Gratification row whose
//      `type` is 'driver_goals_config' (one of:
//        'motorista'  → only motoristas see the Metas module
//        'entregador' → only entregadores see the Metas module
//        'ambos'      → motoristas AND entregadores see the Metas module (default)
//      ).
//
//   2. `benefitTargets` — per-benefit target qualification (Item 7.3:
//      "Benefício X para: ( ) Motorista ( ) Entregador ( ) Ambos").
//      Stored as a JSON string on the SystemConfig table under the key
//      'metas_benefit_targets'. Shape: { [benefitType]: 'motorista'|'entregador'|'ambos' }.
//      When a benefit is NOT in the map, the gratifications page falls back
//      to the overall `targetQualification` for that benefit.
//
// The public read endpoint (/api/gratifications-config) mirrors the same
// data without the admin-role check, so the sidebar / gratifications page
// can read it for any logged-in user.
//
// NOTE on the foreign key: the Gratification model has `userId` referencing
// User, so the config row must be owned by a real user. We use the requesting
// admin's userId when first creating the row; thereafter we look it up by
// `type` only (so any admin can read/update it regardless of who created it).
// The row's `amount` is 0 — it's a config record, not a real payout.
// ============================================================================

const CONFIG_TYPE = 'driver_goals_config'
const BENEFIT_TARGETS_KEY = 'metas_benefit_targets'
// Task 2-c / Item 7.3 — SystemConfig key storing a JSON array of qualification
// codes allowed to access the Metas module (e.g. ["motorista","entregador"]).
// Preferred over the legacy single-value `targetQualification`. An empty array
// (or missing key) falls back to the legacy targetQualification so the admin
// can still toggle just the legacy switch if they prefer.
const ALLOWED_QUALIFICATIONS_KEY = 'metas.allowedQualifications'
const VALID_TARGETS = ['motorista', 'entregador', 'ambos'] as const
type TargetQualification = (typeof VALID_TARGETS)[number]
type BenefitTargets = Record<string, TargetQualification>

const DEFAULT_TARGET: TargetQualification = 'ambos'
// Default allowed qualifications when the admin has not configured the new
// array-based key yet. Matches the original client-spec behaviour: Metas is
// visible to motorista AND entregador.
const DEFAULT_ALLOWED_QUALIFICATIONS: string[] = ['motorista', 'entregador']
// Qualification codes the admin can pick from in the form. Stored verbatim
// in the SystemConfig JSON array. 'ambos' is intentionally NOT in this list —
// it is a legacy single-value marker handled by the targetQualification switch.
const ALLOWED_QUALIFICATION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'motorista', label: 'Motorista' },
  { value: 'entregador', label: 'Entregador' },
]

function normalizeTarget(value: unknown): TargetQualification {
  return (VALID_TARGETS as readonly string[]).includes(value as string)
    ? (value as TargetQualification)
    : DEFAULT_TARGET
}

// Parse and normalise the `metas.allowedQualifications` JSON array stored in
// SystemConfig. Returns null when the key is absent/invalid so callers can
// fall back to the legacy targetQualification behaviour.
function parseAllowedQualifications(raw: string | null | undefined): string[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const cleaned: string[] = []
    for (const item of parsed) {
      if (typeof item === 'string') {
        const code = item.trim().toLowerCase()
        if (code && !cleaned.includes(code)) cleaned.push(code)
      }
    }
    return cleaned
  } catch {
    return null
  }
}

// Validate that every entry in the array is a known qualification code.
// Unknown codes are silently dropped — the admin form only exposes the
// allowed options, so this is just a defensive measure.
function sanitizeAllowedQualifications(arr: unknown): string[] {
  if (!Array.isArray(arr)) return []
  const known = new Set(ALLOWED_QUALIFICATION_OPTIONS.map((o) => o.value))
  const out: string[] = []
  for (const item of arr) {
    if (typeof item === 'string') {
      const code = item.trim().toLowerCase()
      if (known.has(code) && !out.includes(code)) out.push(code)
    }
  }
  return out
}

// Catalog of configurable benefits — mirrors the public endpoint's catalog
// so the admin UI can render one row per benefit with a Motorista/Entregador/
// Ambos selector. Keep in sync with /api/gratifications-config/route.ts and
// /api/gratifications/route.ts STATIC_FALLBACK_GRATIFICATIONS.
const BENEFIT_CATALOG: Array<{
  type: string
  name: string
  category: string
  amount: number
  description: string
}> = [
  {
    type: 'driver_daily_goal',
    name: 'Meta Diária Motorista',
    amount: 0,
    category: 'mobility',
    description: '18 corridas/dia — Motorista/Entregador ativo.',
  },
  {
    type: 'driver_monthly_goal',
    name: 'Meta Mensal Motorista',
    amount: 0,
    category: 'mobility',
    description: '384 corridas/mês — Motorista/Entregador ativo.',
  },
  {
    type: 'fuel_aid',
    name: 'Auxílio Combustível',
    amount: 260000,
    category: 'mobility',
    description: 'R$ 2.600/mês (R$100/dia × 26 dias).',
  },
  {
    type: 'car_wash',
    name: 'Reembolso Vale Ducha (Lava-Carro)',
    amount: 78000,
    category: 'mobility',
    description: 'R$ 780/mês (R$30/dia × 26 dias).',
  },
  {
    type: 'vacation_6mo',
    name: 'Férias 6 Meses',
    amount: 500000,
    category: 'vacation',
    description: 'R$ 5.000 + 10 dias de férias.',
  },
  {
    type: 'vacation_12mo',
    name: 'Férias 12 Meses',
    amount: 2000000,
    category: 'vacation',
    description: 'R$ 20.000 + 20 dias de férias.',
  },
  {
    type: 'cashback_bonus_prize',
    name: 'Prêmio CashBack Gratificação',
    amount: 1500000,
    category: 'prize',
    description: 'R$ 15.000 — ao fechar equipe com 1.364 usuários.',
  },
]

// GET /api/admin/gratifications-config?userId=<adminId>
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // 1. Overall module visibility — stored on the Gratification row.
    const row = await prisma.gratification.findFirst({
      where: { type: CONFIG_TYPE },
    })
    const targetQualification = normalizeTarget(row?.targetQualification)

    // 1b. Task 2-c / Item 7.3 — array-based `metas.allowedQualifications`.
    // Preferred over the legacy single-value targetQualification when present.
    let allowedQualifications: string[] = DEFAULT_ALLOWED_QUALIFICATIONS
    try {
      const cfg = await prisma.systemConfig.findUnique({
        where: { key: ALLOWED_QUALIFICATIONS_KEY },
      })
      const parsed = parseAllowedQualifications(cfg?.value)
      if (parsed && parsed.length > 0) {
        allowedQualifications = sanitizeAllowedQualifications(parsed)
      }
    } catch { /* ignore — keep default */ }

    // 2. Per-benefit targets — stored as JSON in SystemConfig.
    let benefitTargets: BenefitTargets = {}
    try {
      const cfg = await prisma.systemConfig.findUnique({
        where: { key: BENEFIT_TARGETS_KEY },
      })
      if (cfg?.value) {
        const parsed = JSON.parse(cfg.value)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const cleaned: BenefitTargets = {}
          for (const [k, v] of Object.entries(parsed)) {
            cleaned[k] = normalizeTarget(v)
          }
          benefitTargets = cleaned
        }
      }
    } catch { /* ignore — keep empty */ }

    return success({
      targetQualification,
      allowedQualifications,
      benefitTargets,
      benefits: BENEFIT_CATALOG,
      // Always also echo the allowed options so the admin UI can render them.
      options: VALID_TARGETS.map((v) => ({
        value: v,
        label:
          v === 'motorista'
            ? 'Motorista'
            : v === 'entregador'
              ? 'Entregador'
              : 'Ambos',
      })),
      // Qualification options for the array-based form (checkboxes).
      allowedQualificationOptions: ALLOWED_QUALIFICATION_OPTIONS,
    })
  } catch (err) {
    console.error('Admin gratifications-config GET error:', err)
    return error('Failed to fetch gratifications configuration', 500)
  }
}

// PUT /api/admin/gratifications-config
// Body: {
//   userId,
//   targetQualification?: 'motorista' | 'entregador' | 'ambos',
//   allowedQualifications?: string[],  // e.g. ["motorista","entregador"]
//   benefitTargets?: { [benefitType]: 'motorista' | 'entregador' | 'ambos' }
// }
// Any field may be omitted — only the provided fields are updated.
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, targetQualification, allowedQualifications, benefitTargets } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // 1. Update targetQualification (if provided).
    if (typeof targetQualification !== 'undefined') {
      const normalized = normalizeTarget(targetQualification)
      const existing = await prisma.gratification.findFirst({
        where: { type: CONFIG_TYPE },
      })
      if (existing) {
        await prisma.gratification.update({
          where: { id: existing.id },
          data: { targetQualification: normalized },
        })
      } else {
        await prisma.gratification.create({
          data: {
            type: CONFIG_TYPE,
            userId, // FK owner — only used at creation time.
            amount: 0,
            category: 'system_config',
            description:
              'Configuração de visibilidade do módulo Metas (alvo de qualificação).',
            targetQualification: normalized,
          },
        })
      }
    }

    // 1b. Task 2-c / Item 7.3 — update `metas.allowedQualifications` JSON array.
    // Stored as a JSON string in SystemConfig. The admin form sends an array
    // of qualification codes (e.g. ["motorista","entregador"]). Unknown codes
    // are dropped by `sanitizeAllowedQualifications`. An empty array is allowed
    // (effectively hides the module from everyone — useful for staging).
    if (typeof allowedQualifications !== 'undefined') {
      const cleaned = sanitizeAllowedQualifications(allowedQualifications)
      await prisma.systemConfig.upsert({
        where: { key: ALLOWED_QUALIFICATIONS_KEY },
        create: {
          key: ALLOWED_QUALIFICATIONS_KEY,
          value: JSON.stringify(cleaned),
          description:
            'Array of qualification codes allowed to access the Metas module (Task 2-c / Item 7.3).',
        },
        update: { value: JSON.stringify(cleaned) },
      })
    }

    // 2. Update benefitTargets (if provided) — stored as JSON in SystemConfig.
    if (typeof benefitTargets !== 'undefined') {
      if (benefitTargets === null || typeof benefitTargets !== 'object' || Array.isArray(benefitTargets)) {
        return error('benefitTargets must be an object', 400)
      }
      const cleaned: BenefitTargets = {}
      for (const [k, v] of Object.entries(benefitTargets)) {
        cleaned[k] = normalizeTarget(v)
      }
      await prisma.systemConfig.upsert({
        where: { key: BENEFIT_TARGETS_KEY },
        create: {
          key: BENEFIT_TARGETS_KEY,
          value: JSON.stringify(cleaned),
          description:
            'Per-benefit target qualification for the Metas module (Task 2-c / Item 7).',
        },
        update: { value: JSON.stringify(cleaned) },
      })
    }

    // Re-read the final state so the response reflects what was persisted.
    const row = await prisma.gratification.findFirst({
      where: { type: CONFIG_TYPE },
    })
    const finalTarget = normalizeTarget(row?.targetQualification)

    let finalAllowedQualifications: string[] = DEFAULT_ALLOWED_QUALIFICATIONS
    try {
      const cfg = await prisma.systemConfig.findUnique({
        where: { key: ALLOWED_QUALIFICATIONS_KEY },
      })
      const parsed = parseAllowedQualifications(cfg?.value)
      if (parsed && parsed.length > 0) {
        finalAllowedQualifications = sanitizeAllowedQualifications(parsed)
      }
    } catch { /* ignore */ }

    let finalBenefitTargets: BenefitTargets = {}
    try {
      const cfg = await prisma.systemConfig.findUnique({
        where: { key: BENEFIT_TARGETS_KEY },
      })
      if (cfg?.value) {
        const parsed = JSON.parse(cfg.value)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [k, v] of Object.entries(parsed)) {
            finalBenefitTargets[k] = normalizeTarget(v)
          }
        }
      }
    } catch { /* ignore */ }

    return success({
      message: 'Configuração de metas atualizada com sucesso',
      targetQualification: finalTarget,
      allowedQualifications: finalAllowedQualifications,
      benefitTargets: finalBenefitTargets,
    })
  } catch (err) {
    console.error('Admin gratifications-config PUT error:', err)
    return error('Failed to update gratifications configuration', 500)
  }
}
