import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import type { ContentTextItem } from './route'

// ============================================================================
// /api/admin/content-texts — CRUD for dynamic platform texts/labels
// ----------------------------------------------------------------------------
// Lets the admin edit ALL texts/labels (Cliente, Motorista, Lojista, App
// Mobile, etc.) without code changes or deploys. Backed by the SystemConfig
// table (filtered by category, "geral" by default).
//
// On the first GET, seeds the database with the default content texts grouped
// by category. The seed is idempotent — only missing keys are inserted.
// ============================================================================

export interface ContentTextItem {
  id: string
  key: string
  value: string
  description: string | null
  category: string
  updatedAt: string
}

type SeedEntry = { key: string; value: string; description?: string; category: string }

// Default content texts grouped by category. These mirror the most common
// labels that appear across the cliente/motorista/lojista/mobile interfaces.
// The admin can edit any of these values (or add new ones) at runtime.
const DEFAULT_CONTENT_TEXTS: SeedEntry[] = [
  // -------- geral --------
  { key: 'platform_name', value: 'NewMobility', description: 'Nome da plataforma exibido no header/rodapé', category: 'geral' },
  { key: 'platform_tagline', value: 'CashBack Multi-Nível', description: 'Slogan curto da plataforma', category: 'geral' },
  { key: 'platform_description', value: 'Conectando pessoas, transformando vidas', description: 'Descrição curta usada em landing pages', category: 'geral' },

  // -------- dashboard --------
  { key: 'dashboard_greeting_morning', value: 'Bom dia', description: 'Saudação exibida pela manhã no dashboard', category: 'dashboard' },
  { key: 'dashboard_greeting_afternoon', value: 'Boa tarde', description: 'Saudação exibida à tarde no dashboard', category: 'dashboard' },
  { key: 'dashboard_greeting_evening', value: 'Boa noite', description: 'Saudação exibida à noite no dashboard', category: 'dashboard' },
  { key: 'dashboard_referral_title', value: 'Seu Link de Indicação', description: 'Título do card de link de indicação', category: 'dashboard' },
  { key: 'dashboard_referral_subtitle', value: 'Convide amigos e ganhe CashBack', description: 'Subtítulo do card de indicação', category: 'dashboard' },

  // -------- menu (sidebar do cliente) --------
  { key: 'menu_dashboard', value: 'Início Dashboard', category: 'menu' },
  { key: 'menu_apps', value: 'Acesso aos Apps', category: 'menu' },
  { key: 'menu_talkmobi', value: 'TalkMobi', category: 'menu' },
  { key: 'menu_telemedicina', value: 'Telemedicina', category: 'menu' },
  { key: 'menu_bank', value: 'Acesso ao Banco', category: 'menu' },
  { key: 'menu_profile', value: 'Dados Pessoais', category: 'menu' },
  { key: 'menu_kyc', value: 'Verificação KYC', category: 'menu' },
  { key: 'menu_billing', value: 'Pagar Faturas', category: 'menu' },
  { key: 'menu_myplan', value: 'Meu Plano', category: 'menu' },
  { key: 'menu_purchases', value: 'Relatório de Compras', category: 'menu' },
  { key: 'menu_marketplace', value: 'Marketplace', category: 'menu' },
  { key: 'menu_services', value: 'Serviços', category: 'menu' },
  { key: 'menu_gratifications', value: 'Metas', category: 'menu' },
  { key: 'menu_points', value: 'Pontuações', category: 'menu' },
  { key: 'menu_career', value: 'Plano de Carreira', category: 'menu' },
  { key: 'menu_referrals', value: 'Meus Indicados', category: 'menu' },
  { key: 'menu_cashback', value: 'CashBack', category: 'menu' },
  { key: 'menu_financial', value: 'Financeiro', category: 'menu' },
  { key: 'menu_voucher', value: 'Voucher', category: 'menu' },
  { key: 'menu_simulator', value: 'Simulador', category: 'menu' },

  // -------- planos --------
  // Tarefa (19/09): removidas as chaves plan_free_name, plan_blue3_name,
  // plan_blue5_name — eram duplicatas de plan.free.name, plan.blue3.name,
  // plan.blue5.name que já existem no DEFAULT_SYSTEM_SETTINGS (endpoint
  // /api/admin/system-settings). Manter as duas causava confusão no admin
  // (via o mesmo valor em 2 lugares diferentes com chaves diferentes).
]

// Idempotent seed: inserts only the default content texts that don't already
// exist in the database. Used on the first GET to /api/admin/content-texts.
// Note: we use a loop with create() instead of createMany() because SQLite
// doesn't support skipDuplicates in createMany (Prisma throws "Unknown
// argument skipDuplicates"). The filter above already guarantees no
// duplicates, so individual creates are safe.
async function seedDefaults() {
  const existingKeys = new Set(
    (await prisma.systemConfig.findMany({ select: { key: true } })).map((c) => c.key)
  )
  const missing = DEFAULT_CONTENT_TEXTS.filter((d) => !existingKeys.has(d.key))
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
      // Ignore individual insert failures (e.g. race condition with another
      // admin loading the page at the same time). The key uniqueness
      // constraint is the final safety net.
    }
  }
}

// GET /api/admin/content-texts?userId=<adminId>&category=<optional>
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
      console.error('content-texts seed error:', seedErr)
      // Continue — listing still works even if seed fails (e.g. race condition).
    }

    const category = req.nextUrl.searchParams.get('category') || undefined

    const items = await prisma.systemConfig.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    const data: ContentTextItem[] = items.map((c) => ({
      id: c.id,
      key: c.key,
      value: c.value,
      description: c.description,
      category: c.category,
      updatedAt: c.updatedAt.toISOString(),
    }))

    return success({ items: data })
  } catch (err) {
    console.error('Admin content-texts GET error:', err)
    return error('Failed to fetch content texts', 500)
  }
}

// POST /api/admin/content-texts
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
    if (!/^[a-z0-9_]+$/i.test(key.trim())) {
      return error('Chave deve conter apenas letras, números e underline', 400)
    }
    if (value === undefined || value === null || typeof value !== 'string' || !value.trim()) {
      return error('Valor é obrigatório', 400)
    }

    const keyNorm = key.trim().toLowerCase()

    const existing = await prisma.systemConfig.findUnique({ where: { key: keyNorm } })
    if (existing) {
      return error(`Já existe um texto com a chave "${keyNorm}"`, 409)
    }

    const created = await prisma.systemConfig.create({
      data: {
        key: keyNorm,
        value: value.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        category: typeof category === 'string' && category.trim() ? category.trim() : 'geral',
      },
    })

    return success(
      {
        message: 'Texto criado com sucesso',
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
    console.error('Admin content-texts POST error:', err)
    return error('Failed to create content text', 500)
  }
}
