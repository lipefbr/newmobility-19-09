import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/system-settings — CRUD for ALL configurable system values
// ----------------------------------------------------------------------------
// SETTINGS-1 — A comprehensive "System Settings" admin page where the admin
// can edit EVERYTHING in the system: matrix values (Entrada 4x5, Residual
// 4x7, Vendas 4x9), cashback percentages (entrada 35%, residual 45%,
// vendas 0.9%, direct referral 10%), plan prices (Blue3 R$ 999,90,
// Blue5 R$ 999,90), withdrawal limits (min/max/fee), points config,
// vouchers, metas, platform name/tagline, and any custom value the admin
// wants to add at runtime.
//
// Backed by the existing SystemConfig table (key/value/category). On the
// first GET, seeds the database with the full default catalog across 12
// categories. The seed is idempotent — only missing keys are inserted, so
// any value previously edited by the admin is preserved.
//
// CONFIG-EXPAND — added TalkMobi, Telemedicina, Marketplace, and Career
// categories, plus extras for saques/metas/planos/geral. Total seeded
// entries: 80 (52 original + 28 new). The POST endpoint now writes an
// AuditLog entry (action: 'system_settings.create') for every new
// config created via the admin UI. Validation + audit logging for
// PUT/DELETE lives in the [id]/route.ts file.
// ============================================================================

export interface SystemSettingItem {
  id: string
  key: string
  value: string
  description: string | null
  category: string
  updatedAt: string
}

type SeedEntry = { key: string; value: string; description?: string; category: string }

// Default catalog of configurable system values grouped by category. These
// mirror every value the admin may want to tweak without a deploy. The
// admin can also create new entries via POST (and delete them via DELETE).
//
// Categories:
//   - matrizes    : matrix structure (levels, width, base value, pct per level)
//   - cashback    : top-level cashback percentages (entrada/residual/vendas/direct)
//   - planos      : plan names, prices (in cents), cashback level counts
//   - saques      : withdrawal limits + fee + processing time
//   - pontos      : points-per-action configuration
//   - vouchers    : voucher welcome / signup bonus amounts
//   - metas       : daily/monthly goals + bonuses + notification/reset
//   - talkmobi    : TalkMobi plan pricing + activation rules
//   - telemedicina: Telemedicina service pricing + validity
//   - marketplace : marketplace product limits + commission
//   - career      : career pins claim limits + bonus frequency
//   - geral       : platform name, tagline, description, support email + platform-wide flags
//
// NOTE: the existing /api/admin/content-texts route already seeds the
// `geral`, `dashboard`, `menu`, and `planos` text labels (platform_name,
// menu_dashboard, plan_blue3_name, etc.). Those keys use underscores
// (snake_case). The keys below use the dot-style naming convention
// (matrix.entrada.pct_level_1, cashback.entrada_pct, plan.blue3.price_cents)
// so they don't collide with the content-texts keys. Both sets are visible
// in this UI; the admin can edit either one.
const DEFAULT_SYSTEM_SETTINGS: SeedEntry[] = [
  // -------- matrizes --------
  // Entrada 4x5 — base R$ 999,00, percentages per level
  { key: 'matrix.entrada.levels', value: '5', description: 'Número de níveis da Matriz de Entrada (4x5)', category: 'matrizes' },
  { key: 'matrix.entrada.width', value: '4', description: 'Largura da Matriz de Entrada (4 indicados diretos por nível)', category: 'matrizes' },
  { key: 'matrix.entrada.pct_level_1', value: '5', description: '% de comissão no nível 1 da Matriz de Entrada', category: 'matrizes' },
  { key: 'matrix.entrada.pct_level_2', value: '10', description: '% de comissão no nível 2 da Matriz de Entrada', category: 'matrizes' },
  { key: 'matrix.entrada.pct_level_3', value: '10', description: '% de comissão no nível 3 da Matriz de Entrada', category: 'matrizes' },
  { key: 'matrix.entrada.pct_level_4', value: '5', description: '% de comissão no nível 4 da Matriz de Entrada', category: 'matrizes' },
  { key: 'matrix.entrada.pct_level_5', value: '5', description: '% de comissão no nível 5 da Matriz de Entrada', category: 'matrizes' },
  { key: 'matrix.entrada.base_cents', value: '99900', description: 'Valor base da Matriz de Entrada em centavos (R$ 999,00)', category: 'matrizes' },

  // Residual 4x7 — base R$ 1.399,00, percentages per level
  { key: 'matrix.residual.levels', value: '7', description: 'Número de níveis da Matriz Residual (4x7)', category: 'matrizes' },
  { key: 'matrix.residual.width', value: '4', description: 'Largura da Matriz Residual', category: 'matrizes' },
  { key: 'matrix.residual.pct_level_1', value: '10', description: '% de comissão no nível 1 da Matriz Residual', category: 'matrizes' },
  { key: 'matrix.residual.pct_level_2', value: '9', description: '% de comissão no nível 2 da Matriz Residual', category: 'matrizes' },
  { key: 'matrix.residual.pct_level_3', value: '5', description: '% de comissão no nível 3 da Matriz Residual', category: 'matrizes' },
  { key: 'matrix.residual.pct_level_4', value: '5', description: '% de comissão no nível 4 da Matriz Residual', category: 'matrizes' },
  { key: 'matrix.residual.pct_level_5', value: '4', description: '% de comissão no nível 5 da Matriz Residual', category: 'matrizes' },
  { key: 'matrix.residual.pct_level_6', value: '3', description: '% de comissão no nível 6 da Matriz Residual', category: 'matrizes' },
  { key: 'matrix.residual.pct_level_7', value: '2', description: '% de comissão no nível 7 da Matriz Residual', category: 'matrizes' },
  { key: 'matrix.residual.base_cents', value: '139900', description: 'Valor base da Matriz Residual em centavos (R$ 1.399,00)', category: 'matrizes' },

  // Vendas 4x9 — base R$ 199,90, 0.10% per level
  { key: 'matrix.vendas.levels', value: '9', description: 'Número de níveis da Matriz de Vendas (4x9)', category: 'matrizes' },
  { key: 'matrix.vendas.width', value: '4', description: 'Largura da Matriz de Vendas', category: 'matrizes' },
  { key: 'matrix.vendas.pct_per_level', value: '0.1', description: '% de comissão por nível da Matriz de Vendas (0.10%)', category: 'matrizes' },
  { key: 'matrix.vendas.base_cents', value: '19990', description: 'Valor base da Matriz de Vendas em centavos (R$ 199,90)', category: 'matrizes' },
  // Tarefa 2 (19/09) — limites financeiros das 3 matrizes em R$ (centavos).
  // Substitui a antiga matrix.vendas.salesLimit (quantidade de vendas) por
  // limit_cents em R$. Editável via /api/admin/matrix-config.
  { key: 'matrix.entrada.limit_cents', value: '9650000', description: 'Limite da Matriz de Entrada em centavos (R$ 96.500,00)', category: 'matrizes' },
  { key: 'matrix.residual.limit_cents', value: '75000000', description: 'Limite da Matriz Residual em centavos (R$ 750.000,00)', category: 'matrizes' },
  { key: 'matrix.vendas.limit_cents', value: '0', description: 'Limite da Matriz de Vendas em centavos (0 = a definir pelo cliente)', category: 'matrizes' },

  // -------- cashback --------
  { key: 'cashback.entrada_pct', value: '35', description: '% de CashBack da Matriz de Entrada (35%)', category: 'cashback' },
  { key: 'cashback.residual_pct', value: '45', description: '% de CashBack da Matriz Residual (45%)', category: 'cashback' },
  { key: 'cashback.vendas_pct', value: '0.9', description: '% de CashBack da Matriz de Vendas (0.9%)', category: 'cashback' },
  { key: 'cashback.direct_referral_pct', value: '10', description: '% de bônus por indicação direta (10%)', category: 'cashback' },

  // -------- planos --------
  { key: 'plan.free.name', value: 'Gratuito', description: 'Nome do plano gratuito', category: 'planos' },
  { key: 'plan.free.price_cents', value: '0', description: 'Preço do plano gratuito em centavos', category: 'planos' },
  { key: 'plan.blue3.name', value: 'Blue 3', description: 'Nome do plano Blue 3', category: 'planos' },
  { key: 'plan.blue3.price_cents', value: '99990', description: 'Preço do plano Blue 3 em centavos (R$ 999,90)', category: 'planos' },
  { key: 'plan.blue3.cashback_levels_entrada', value: '3', description: 'Quantidade de níveis de CashBack de Entrada liberados para o plano Blue 3', category: 'planos' },
  { key: 'plan.blue5.name', value: 'Blue 5 Premium', description: 'Nome do plano Blue 5 Premium', category: 'planos' },
  { key: 'plan.blue5.price_cents', value: '99990', description: 'Preço do plano Blue 5 Premium em centavos (R$ 999,90)', category: 'planos' },
  { key: 'plan.blue5.cashback_levels_entrada', value: '5', description: 'Níveis de CashBack de Entrada liberados para o Blue 5', category: 'planos' },
  { key: 'plan.blue5.cashback_levels_residual', value: '7', description: 'Níveis de CashBack Residual liberados para o Blue 5', category: 'planos' },
  { key: 'plan.blue5.cashback_levels_vendas', value: '9', description: 'Níveis de CashBack de Vendas liberados para o Blue 5', category: 'planos' },
  { key: 'plan.mensalidade_cents', value: '99990', description: 'Mensalidade do plano Premium em centavos (R$ 999,90)', category: 'planos' },

  // -------- saques --------
  { key: 'saque.min_cents', value: '5000', description: 'Valor mínimo de saque em centavos (R$ 50,00)', category: 'saques' },
  { key: 'saque.max_cents', value: '500000', description: 'Valor máximo de saque em centavos (R$ 5.000,00)', category: 'saques' },
  { key: 'saque.fee_pct', value: '2', description: 'Taxa de saque em % (2%)', category: 'saques' },

  // -------- pontos --------
  { key: 'pontos.per_referral', value: '100', description: 'Pontos ganhos por cada indicação confirmada', category: 'pontos' },
  { key: 'pontos.per_purchase', value: '1', description: 'Pontos ganhos por cada R$1 em compras', category: 'pontos' },
  { key: 'pontos.per_cashback_claim', value: '50', description: 'Pontos ganhos por resgate de cashback', category: 'pontos' },
  { key: 'pontos.daily_login', value: '1', description: 'Pontos ganhos por login diário', category: 'pontos' },
  { key: 'pontos.per_star', value: '2', description: 'Multiplicador de pontos por estrela de carreira', category: 'pontos' },

  // -------- vouchers --------
  { key: 'voucher.welcome_bonus_cents', value: '1000', description: 'Bônus de boas-vindas em centavos (R$ 10,00)', category: 'vouchers' },
  { key: 'voucher.signup_bonus_cents', value: '1000', description: 'Bônus de cadastro em centavos (R$ 10,00)', category: 'vouchers' },

  // -------- metas --------
  { key: 'metas.daily_goal_rides', value: '18', description: 'Meta diária de corridas (18 corridas/dia)', category: 'metas' },
  { key: 'metas.monthly_goal_rides', value: '384', description: 'Meta mensal de corridas (384 corridas/mês)', category: 'metas' },
  { key: 'metas.daily_bonus_cents', value: '500', description: 'Bônus diário em centavos ao atingir a meta (R$ 5,00)', category: 'metas' },
  { key: 'metas.monthly_bonus_cents', value: '3000', description: 'Bônus mensal em centavos ao atingir a meta (R$ 30,00)', category: 'metas' },

  // -------- geral (extra platform-wide keys) --------
  // NOTE: platform_name / platform_tagline / platform_description already
  // exist in the content-texts seed (snake_case). We add the dot-style
  // variants here for the support email + a few extra platform-wide keys
  // so the admin has a single tab to edit everything platform-related.
  { key: 'platform.support_email', value: 'suporte@newmobility.com', description: 'E-mail de suporte da plataforma', category: 'geral' },
  { key: 'platform.maintenance_mode', value: 'false', description: 'Modo de manutenção da plataforma (true/false) — quando true, exibe aviso de manutenção', category: 'geral' },
  { key: 'platform.registration_enabled', value: 'true', description: 'Permitir novos cadastros de usuário (true/false)', category: 'geral' },
  { key: 'platform.min_password_length', value: '6', description: 'Tamanho mínimo de senha para cadastro/troca de senha', category: 'geral' },
  { key: 'platform.session_timeout_minutes', value: '60', description: 'Tempo de expiração da sessão em minutos (idle timeout)', category: 'geral' },
  { key: 'platform.max_login_attempts', value: '5', description: 'Número máximo de tentativas de login antes de bloquear temporariamente', category: 'geral' },

  // -------- talkmobi --------
  // TalkMobi plan pricing + activation rules (CONFIG-EXPAND)
  { key: 'talkmobi.min_price_cents', value: '2990', description: 'Preço mínimo do plano TalkMobi em centavos (R$ 29,90)', category: 'talkmobi' },
  { key: 'talkmobi.max_plans_per_user', value: '1', description: 'Número máximo de planos TalkMobi por usuário', category: 'talkmobi' },
  { key: 'talkmobi.auto_activate', value: 'false', description: 'Ativar plano automaticamente após pagamento (true/false)', category: 'talkmobi' },

  // -------- telemedicina --------
  // Telemedicina service pricing + validity (CONFIG-EXPAND)
  { key: 'telemedicina.price_cents', value: '4990', description: 'Preço da ativação da Telemedicina em centavos (R$ 49,90)', category: 'telemedicina' },
  { key: 'telemedicina.validity_days', value: '30', description: 'Validade (em dias) de cada ativação da Telemedicina', category: 'telemedicina' },
  { key: 'telemedicina.auto_activate', value: 'false', description: 'Ativar Telemedicina automaticamente após pagamento (true/false)', category: 'telemedicina' },

  // -------- marketplace --------
  // Marketplace product limits + commission (CONFIG-EXPAND)
  { key: 'marketplace.max_photos', value: '15', description: 'Número máximo de fotos por produto no marketplace', category: 'marketplace' },
  { key: 'marketplace.commission_pct', value: '5', description: 'Percentual de comissão da plataforma sobre vendas no marketplace (5%)', category: 'marketplace' },
  { key: 'marketplace.min_price_cents', value: '100', description: 'Preço mínimo permitido para um produto no marketplace (R$ 1,00)', category: 'marketplace' },
  { key: 'marketplace.max_price_cents', value: '10000000', description: 'Preço máximo permitido para um produto no marketplace (R$ 100.000,00)', category: 'marketplace' },

  // -------- career --------
  // Career pin claim limits + bonus frequency (CONFIG-EXPAND)
  { key: 'career.max_claims_per_month', value: '1', description: 'Número máximo de resgates de carreira (pin) por usuário por mês', category: 'career' },
  { key: 'career.points_expiry_days', value: '0', description: 'Dias para expiração de pontos de carreira (0 = nunca expira)', category: 'career' },
  { key: 'career.bonus_frequency', value: 'monthly', description: 'Frequência de pagamento do bônus de carreira (monthly/weekly/daily)', category: 'career' },

  // -------- features (22/09): toggle de funcionalidades do menu --------
  // Tarefa 2: admin pode ativar/desativar o menu Bet e Jogos
  { key: 'features.bet_enabled', value: 'true', description: 'Ativar/desativar menu de Apostas (Bet) — false esconde do sidebar e bloqueia acesso', category: 'geral' },
  { key: 'features.games_enabled', value: 'true', description: 'Ativar/desativar menu de Jogos — false esconde do sidebar e bloqueia acesso', category: 'geral' },

  // -------- saques (extras) --------
  // Withdrawal processing limits (CONFIG-EXPAND)
  { key: 'saque.processing_time_hours', value: '48', description: 'Tempo máximo de processamento de saque em horas (48h)', category: 'saques' },
  { key: 'saque.max_daily_withdrawals', value: '3', description: 'Número máximo de saques por usuário por dia', category: 'saques' },
  { key: 'saque.auto_approve_below_cents', value: '0', description: 'Aprovar automaticamente saques abaixo deste valor em centavos (0 = sem auto-aprovação)', category: 'saques' },
  // Tarefa 4 (21/09): saques acima deste valor vão para análise manual
  { key: 'saque.manual_review_above_cents', value: '100000', description: 'Saques acima deste valor (em centavos) vão para análise manual (R$ 1.000,00 padrão)', category: 'saques' },
  // Tarefa 2 (22/09): configurações adicionais de taxa de saque
  { key: 'saque.fee_free_days', value: '5,6,7,8', description: 'Dias do mês com saque gratuito (separados por vírgula). Ex: 5,6,7,8 = saque grátis dias 5-8', category: 'saques' },
  { key: 'saque.fee_cap_cents', value: '5000', description: 'Teto máximo de taxa de saque em centavos (R$ 50,00). 0 = sem teto', category: 'saques' },
  { key: 'saque.pix_fee_cents', value: '0', description: 'Taxa fixa por saque PIX em centavos (0 = grátis)', category: 'saques' },
  { key: 'saque.ted_fee_cents', value: '350', description: 'Taxa fixa por saque TED em centavos (R$ 3,50)', category: 'saques' },

  // -------- metas (extras) --------
  // Goal notification + reset behavior (CONFIG-EXPAND)
  { key: 'metas.notification_on_daily_complete', value: 'true', description: 'Enviar notificação ao usuário quando atingir a meta diária (true/false)', category: 'metas' },
  { key: 'metas.reset_period', value: 'daily', description: 'Período de reset das metas (daily/monthly)', category: 'metas' },

  // -------- planos (extras) --------
  // Plan upgrade rules + withdrawal limits per plan tier (CONFIG-EXPAND)
  { key: 'plan.blue3.cashback_levels_residual', value: '0', description: 'Níveis de CashBack Residual liberados para o plano Blue 3 (0 = não libera residual)', category: 'planos' },
  { key: 'plan.blue3.cashback_levels_vendas', value: '0', description: 'Níveis de CashBack de Vendas liberados para o plano Blue 3 (0 = não libera vendas)', category: 'planos' },
  { key: 'plan.upgrade_grace_period_days', value: '30', description: 'Carência em dias para pagamento após upgrade de plano', category: 'planos' },
  { key: 'plan.free.max_withdrawals', value: '0', description: 'Número máximo de saques por mês no plano gratuito (0 = não pode sacar)', category: 'planos' },
  { key: 'plan.paid.max_withdrawals', value: '10', description: 'Número máximo de saques por mês em planos pagos', category: 'planos' },
]

// Idempotent seed: inserts only the default system settings that don't
// already exist in the database. Uses a per-row create() loop wrapped in
// try/catch so a unique-key race (two admins loading the page at the same
// time) doesn't break the listing.
async function seedDefaults() {
  const existingKeys = new Set(
    (await prisma.systemConfig.findMany({ select: { key: true } })).map((c) => c.key)
  )
  const missing = DEFAULT_SYSTEM_SETTINGS.filter((d) => !existingKeys.has(d.key))
  if (missing.length === 0) return
  for (const m of missing) {
    try {
      await prisma.systemConfig.create({
        data: {
          key: m.key,
          value: m.value,
          description: m.description ?? null,
          category: m.category,
        },
      })
    } catch {
      // Ignore individual insert failures — the unique constraint on
      // SystemConfig.key is the final safety net.
    }
  }
}

// GET /api/admin/system-settings?userId=<adminId>&category=<optional>
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // Seed defaults on first load (idempotent).
    try {
      await seedDefaults()
    } catch (seedErr) {
      console.error('system-settings seed error:', seedErr)
      // Listing still works even if the seed fails (e.g. race condition).
    }

    const category = req.nextUrl.searchParams.get('category') || undefined

    const items = await prisma.systemConfig.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    const data: SystemSettingItem[] = items.map((c) => ({
      id: c.id,
      key: c.key,
      value: c.value,
      description: c.description,
      category: c.category,
      updatedAt: c.updatedAt.toISOString(),
    }))

    return success({ items: data })
  } catch (err) {
    console.error('Admin system-settings GET error:', err)
    return error('Failed to fetch system settings', 500)
  }
}

// POST /api/admin/system-settings
// Body: { userId, key, value, description?, category? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, key, value, description, category = 'geral' } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // Validations
    if (!key || typeof key !== 'string' || !key.trim()) {
      return error('Chave (key) é obrigatória', 400)
    }
    // Allow dots, underscores, letters, and digits so admins can use either
    // snake_case (menu_dashboard) or dotted (matrix.entrada.pct_level_1)
    // naming. Anything else is rejected to avoid surprises in URLs/JSON.
    if (!/^[a-z0-9_.]+$/i.test(key.trim())) {
      return error('Chave deve conter apenas letras, números, ponto e underline', 400)
    }
    if (value === undefined || value === null || typeof value !== 'string' || !value.trim()) {
      return error('Valor é obrigatório', 400)
    }

    const keyNorm = key.trim().toLowerCase()

    const existing = await prisma.systemConfig.findUnique({ where: { key: keyNorm } })
    if (existing) {
      return error(`Já existe uma configuração com a chave "${keyNorm}"`, 409)
    }

    const created = await prisma.systemConfig.create({
      data: {
        key: keyNorm,
        value: value.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        category: typeof category === 'string' && category.trim() ? category.trim() : 'geral',
      },
    })

    // CONFIG-EXPAND: Audit log the creation of a new SystemConfig entry so
    // there's a trail of who added what custom config. Failures are swallowed
    // so the user-facing response is never broken by an audit-log write error.
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'system_settings.create',
          entityType: 'SystemConfig',
          entityId: created.id,
          details: JSON.stringify({
            key: created.key,
            category: created.category,
            value: created.value,
            description: created.description,
          }),
        },
      })
    } catch (auditErr) {
      console.error('Failed to write system-settings create audit log:', auditErr)
    }

    return success(
      {
        message: 'Configuração criada com sucesso',
        item: {
          id: created.id,
          key: created.key,
          value: created.value,
          description: created.description,
          category: created.category,
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      201
    )
  } catch (err) {
    console.error('Admin system-settings POST error:', err)
    return error('Failed to create system setting', 500)
  }
}
