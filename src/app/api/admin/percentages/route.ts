import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const DEFAULT_PERCENTAGES: Record<string, string> = {
  cashback_entrada_l1_pct: '5',
  cashback_entrada_l2_pct: '10',
  cashback_entrada_l3_pct: '10',
  cashback_entrada_l4_pct: '5',
  cashback_entrada_l5_pct: '5',
  cashback_residual_l1_pct: '5',
  cashback_residual_l2_pct: '5.5',
  cashback_residual_l3_pct: '6',
  cashback_residual_l4_pct: '6.5',
  cashback_residual_l5_pct: '7',
  cashback_residual_l6_pct: '7.5',
  cashback_residual_l7_pct: '8',
  cashback_vendas_l1_pct: '0.1',
  cashback_vendas_l2_pct: '0.1',
  cashback_vendas_l3_pct: '0.1',
  cashback_vendas_l4_pct: '0.1',
  cashback_vendas_l5_pct: '0.1',
  cashback_vendas_l6_pct: '0.1',
  cashback_vendas_l7_pct: '0.1',
  cashback_vendas_l8_pct: '0.1',
  cashback_vendas_l9_pct: '0.2',
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'cashback_' } }
    })

    const configMap: Record<string, string> = {}
    for (const c of configs) {
      configMap[c.key] = c.value
    }

    // Ensure defaults exist
    for (const [key, value] of Object.entries(DEFAULT_PERCENTAGES)) {
      if (!configMap[key]) {
        await prisma.systemConfig.upsert({
          where: { key },
          update: {},
          create: { key, value, description: `CashBack percentage for ${key}` }
        })
        configMap[key] = value
      }
    }

    // Organize into matrix structure
    const entrada = []
    for (let i = 1; i <= 5; i++) {
      entrada.push({ level: i, percentage: parseFloat(configMap[`cashback_entrada_l${i}_pct`] || '0'), users: Math.pow(4, i) })
    }
    const residual = []
    for (let i = 1; i <= 7; i++) {
      residual.push({ level: i, percentage: parseFloat(configMap[`cashback_residual_l${i}_pct`] || '0') })
    }
    const vendas = []
    for (let i = 1; i <= 9; i++) {
      vendas.push({ level: i, percentage: parseFloat(configMap[`cashback_vendas_l${i}_pct`] || '0') })
    }

    return success({ entrada, residual, vendas, raw: configMap })
  } catch (err) {
    return error('Failed to fetch percentages', 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, percentages } = body
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!percentages || typeof percentages !== 'object') return error('percentages object is required', 400)

    const updates = Object.entries(percentages).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), description: `CashBack percentage for ${key}` },
      })
    )

    await Promise.all(updates)
    return success({ message: 'Percentages updated successfully' })
  } catch (err) {
    return error('Failed to update percentages', 500)
  }
}
