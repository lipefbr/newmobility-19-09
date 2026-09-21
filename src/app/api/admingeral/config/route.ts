import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/config — app-wide config stored in SystemConfig.
// Keys are prefixed with `app_` to avoid collision with MMN config.
//
// GET  ?userId=<admin>  → returns all app_* config keys as a JSON object
// PUT  { userId, config: { ... } } → upserts each key

const APP_CONFIG_PREFIX = 'app_'
const DEFAULT_CONFIG: Record<string, string> = {
  app_default_delivery_fee_cents: '0',
  app_default_min_order_cents: '0',
  app_default_cashback_percent: '5',
  app_food_cashback_percent: '8',
  app_shopping_cashback_percent: '5',
  app_market_cashback_percent: '3',
  app_pharmacy_cashback_percent: '6',
  app_mobilidade_cashback_percent: '4',
  app_default_estimated_delivery_min: '30',
  app_max_delivery_radius_km: '10',
  app_enable_motorista_app: 'true',
  app_enable_lojista_app: 'true',
  app_enable_mobile_app: 'true',
  app_support_phone: '',
  app_support_email: '',
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)

    const rows = await prisma.systemConfig.findMany({ where: { key: { startsWith: APP_CONFIG_PREFIX } } })
    const config: Record<string, string> = { ...DEFAULT_CONFIG }
    for (const row of rows) {
      config[row.key] = row.value
    }
    return success({ config })
  } catch (err) {
    console.error('[/api/admingeral/config GET] error:', err)
    return error('Internal server error', 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)

    const body = await req.json()
    const { config } = body as { config?: Record<string, string> }
    if (!config || typeof config !== 'object') {
      return error('config object is required', 400)
    }

    // Upsert each key
    const ops = Object.entries(config).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
    await prisma.$transaction(ops)
    return success({ saved: true, count: ops.length })
  } catch (err) {
    console.error('[/api/admingeral/config PUT] error:', err)
    return error('Internal server error', 500)
  }
}
