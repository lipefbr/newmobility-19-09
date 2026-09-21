import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// Task 2-c / Item 7 — Public read endpoint for the "Metas" module visibility
// config. NO ADMIN ROLE REQUIRED — the sidebar and the gratifications-page
// both call this to decide whether to render the Metas menu / page content.
//
// Returns:
//   {
//     targetQualification: 'motorista' | 'entregador' | 'ambos',  // overall module visibility
//     benefitTargets: { [benefitType]: 'motorista' | 'entregador' | 'ambos' },  // per-benefit
//     benefits: [{ type, name, category, amount, description }]    // catalog of configurable benefits
//   }
//
// Storage:
//   - targetQualification: stored on the Gratification row whose `type` is
//     'driver_goals_config' (set by the admin via /api/admin/gratifications-config).
//   - benefitTargets: stored as a JSON string on the SystemConfig table under
//     the key 'metas_benefit_targets'. Missing key → empty object (every
//     benefit falls back to targetQualification).
//
// Fail-open policy: on any error, we return the default 'ambos' so the
// module remains visible to motorista+entregador (matching the original
// client-spec behaviour).
// ============================================================================

const CONFIG_TYPE = 'driver_goals_config'
const BENEFIT_TARGETS_KEY = 'metas_benefit_targets'
// Task 2-c / Item 7.3 — SystemConfig key storing a JSON array of qualification
// codes allowed to access the Metas module (e.g. ["motorista","entregador"]).
// Preferred over the legacy single-value `targetQualification` (which is one
// of 'motorista' | 'entregador' | 'ambos'). An empty/missing array falls back
// to the legacy behaviour so existing deployments keep working.
const ALLOWED_QUALIFICATIONS_KEY = 'metas.allowedQualifications'
const VALID_TARGETS = ['motorista', 'entregador', 'ambos'] as const
type TargetQualification = (typeof VALID_TARGETS)[number]
type BenefitTargets = Record<string, TargetQualification>

const DEFAULT_TARGET: TargetQualification = 'ambos'
// Default allowed qualifications when the admin has not configured the new
// array-based key yet. Matches the original client-spec behaviour: Metas is
// visible to motorista AND entregador.
const DEFAULT_ALLOWED_QUALIFICATIONS: string[] = ['motorista', 'entregador']

function normalizeTarget(value: unknown): TargetQualification {
  return (VALID_TARGETS as readonly string[]).includes(value as string)
    ? (value as TargetQualification)
    : DEFAULT_TARGET
}

// Parse and normalise the `metas.allowedQualifications` JSON array stored in
// SystemConfig. Accepts any JSON value but only keeps strings matching the
// known qualification codes. Returns null when the key is absent or invalid
// so callers can fall back to the legacy targetQualification.
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

// Catalog of benefit types the admin can configure per-benefit. Mirrors the
// STATIC_FALLBACK_GRATIFICATIONS in /api/gratifications/route.ts so the admin
// UI has a stable list of benefit types to toggle.
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
    description: 'R$ 2.600/mês (R$100/dia × 26 dias). Qualificação: ao fechar o 5º nível.',
  },
  {
    type: 'car_wash',
    name: 'Reembolso Vale Ducha (Lava-Carro)',
    amount: 78000,
    category: 'mobility',
    description: 'R$ 780/mês (R$30/dia × 26 dias). Qualificação: ao fechar o 5º nível.',
  },
  {
    type: 'vacation_6mo',
    name: 'Férias 6 Meses',
    amount: 500000,
    category: 'vacation',
    description: 'R$ 5.000 + 10 dias de férias. Único aos 6 meses de cadastro ativo.',
  },
  {
    type: 'vacation_12mo',
    name: 'Férias 12 Meses',
    amount: 2000000,
    category: 'vacation',
    description: 'R$ 20.000 + 20 dias de férias. Único aos 12 meses de cadastro ativo.',
  },
  {
    type: 'cashback_bonus_prize',
    name: 'Prêmio CashBack Gratificação',
    amount: 1500000,
    category: 'prize',
    description: 'R$ 15.000 — Único ao fechar equipe com 1.364 usuários.',
  },
]

export async function GET() {
  try {
    // 1. Overall module visibility (targetQualification) — stored on the
    //    Gratification row with type='driver_goals_config'. Default 'ambos'.
    let targetQualification: TargetQualification = DEFAULT_TARGET
    try {
      const configRow = await db.findOne(
        'Gratification',
        '"type" = $1',
        [CONFIG_TYPE]
      ) as any
      if (configRow?.targetQualification) {
        targetQualification = normalizeTarget(configRow.targetQualification)
      }
    } catch { /* ignore — keep default */ }

    // 1b. Task 2-c / Item 7.3 — array-based `metas.allowedQualifications`
    //     stored in SystemConfig. Preferred over the legacy single-value
    //     targetQualification when present. Falls back to the legacy value
    //     when the key is absent/invalid.
    let allowedQualifications: string[] | null = null
    try {
      const row = await db.findOne(
        'SystemConfig',
        '"key" = $1',
        [ALLOWED_QUALIFICATIONS_KEY]
      ) as any
      allowedQualifications = parseAllowedQualifications(row?.value)
    } catch { /* ignore — keep null (use legacy fallback) */ }

    // 2. Per-benefit targets — stored as JSON in SystemConfig.
    let benefitTargets: BenefitTargets = {}
    try {
      const row = await db.findOne(
        'SystemConfig',
        '"key" = $1',
        [BENEFIT_TARGETS_KEY]
      ) as any
      if (row?.value) {
        const parsed = JSON.parse(row.value)
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
      // When the admin has not configured the array-based key yet, expose the
      // default ['motorista','entregador'] so the sidebar/page can rely on a
      // single field. Callers may also check `allowedQualifications === null`
      // (rare — only when the SystemConfig fetch fails) to fall back to the
      // legacy targetQualification logic.
      allowedQualifications:
        allowedQualifications && allowedQualifications.length > 0
          ? allowedQualifications
          : DEFAULT_ALLOWED_QUALIFICATIONS,
      benefitTargets,
      benefits: BENEFIT_CATALOG,
    })
  } catch (err) {
    console.error('Public gratifications-config GET error:', err)
    // Fail-open: return defaults so the module remains visible.
    return success({
      targetQualification: DEFAULT_TARGET,
      allowedQualifications: DEFAULT_ALLOWED_QUALIFICATIONS,
      benefitTargets: {},
      benefits: BENEFIT_CATALOG,
    })
  }
}

// Re-exported for type-sharing with the admin route.
export {
  CONFIG_TYPE,
  BENEFIT_TARGETS_KEY,
  ALLOWED_QUALIFICATIONS_KEY,
  VALID_TARGETS,
  DEFAULT_TARGET,
  DEFAULT_ALLOWED_QUALIFICATIONS,
  normalizeTarget,
  parseAllowedQualifications,
  BENEFIT_CATALOG,
}
