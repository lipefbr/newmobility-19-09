import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Default configs to seed if missing
const DEFAULT_CONFIGS = [
  { key: 'platform_name', value: 'NewMobility', description: 'Platform display name' },
  { key: 'maintenance_mode', value: 'false', description: 'Maintenance mode enabled' },
  { key: 'registration_enabled', value: 'true', description: 'New registrations enabled' },
  { key: 'cashback_entrada_pct', value: '35', description: 'CashBack Entrada percentage' },
  { key: 'cashback_residual_pct', value: '45', description: 'CashBack Residual percentage' },
  { key: 'cashback_vendas_pct', value: '0.9', description: 'CashBack Vendas percentage' },
  { key: 'min_withdrawal', value: '5000', description: 'Minimum withdrawal amount in cents' },
  { key: 'max_withdrawal', value: '500000', description: 'Maximum withdrawal amount in cents' },
  { key: 'withdrawal_fee_pct', value: '2', description: 'Withdrawal fee percentage' },
]

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const configs = await prisma.systemConfig.findMany()
    const configMap: Record<string, string> = {}
    for (const c of configs) {
      configMap[c.key] = c.value
    }

    // Seed missing default configs using Prisma upsert
    for (const def of DEFAULT_CONFIGS) {
      if (!configMap[def.key]) {
        const created = await prisma.systemConfig.upsert({
          where: { key: def.key },
          update: { value: def.value },
          create: { key: def.key, value: def.value, description: def.description },
        })
        configMap[def.key] = created.value
      }
    }

    return success(configMap)
  } catch (err) {
    console.error('Admin config GET error:', err)
    return error('Failed to fetch config', 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, configs } = body
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!configs || typeof configs !== 'object') return error('configs object is required', 400)

    // Upsert each config using Prisma
    const updates = Object.entries(configs).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )

    await Promise.all(updates)
    return success({ message: 'Configuration updated successfully' })
  } catch (err) {
    console.error('Admin config PUT error:', err)
    return error('Failed to update config', 500)
  }
}
