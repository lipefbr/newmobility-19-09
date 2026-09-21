import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/goal-configs — CRUD para metas configuráveis pelo admin
// ----------------------------------------------------------------------------
// Permite que o admin crie/edite/delete metas como:
//   "Motorista: 20 viagens finalizadas/dia → R$ 5,00"
//   "Entregador: 15 entregas/dia → R$ 4,00"
// ============================================================================

const VALID_QUALIFICATIONS = ['motorista', 'entregador', 'ambos'] as const
const VALID_METRICS = [
  'trips_daily',
  'trips_monthly',
  'deliveries_daily',
  'deliveries_monthly',
  'trips_total',
  'sales_total',
  'referrals_total',
  'kyc_approved',
  'custom',
] as const
const VALID_WALLETS = ['gratification', 'withdrawal', 'shopping', 'mobility', 'food', 'pharmacy'] as const
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'one_time'] as const

function isValid<T extends string>(value: string, list: readonly T[]): value is T {
  return (list as readonly string[]).includes(value)
}

// GET /api/admin/goal-configs?userId=<adminId>
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const configs = await prisma.goalConfig.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return success({ configs })
  } catch (err) {
    console.error('Admin goal-configs GET error:', err)
    return error('Failed to fetch goal configs', 500)
  }
}

// POST /api/admin/goal-configs
// Body: {
//   userId, name, description?, targetQualification, metricCode, metricLabel,
//   targetValue, rewardCents, rewardWallet, frequency, isActive?, sortOrder?
// }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      name,
      description,
      targetQualification,
      metricCode,
      metricLabel,
      targetValue,
      rewardCents,
      rewardWallet,
      frequency,
      isActive = true,
      sortOrder = 99,
    } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // Validations
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return error('Nome da meta é obrigatório (mínimo 3 caracteres)', 400)
    }

    const tq = isValid(targetQualification, VALID_QUALIFICATIONS) ? targetQualification : 'ambos'
    const mc = isValid(metricCode, VALID_METRICS) ? metricCode : 'trips_daily'
    const ml = (typeof metricLabel === 'string' && metricLabel.trim()) ? metricLabel.trim() : 'viagens finalizadas'
    const tv = Number.isFinite(targetValue) && targetValue > 0 ? Math.floor(targetValue) : 1
    const rc = Number.isFinite(rewardCents) && rewardCents >= 0 ? Math.floor(rewardCents) : 0
    const rw = isValid(rewardWallet, VALID_WALLETS) ? rewardWallet : 'gratification'
    const fr = isValid(frequency, VALID_FREQUENCIES) ? frequency : 'daily'

    const created = await prisma.goalConfig.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        targetQualification: tq,
        metricCode: mc,
        metricLabel: ml,
        targetValue: tv,
        rewardCents: rc,
        rewardWallet: rw,
        frequency: fr,
        isActive: Boolean(isActive),
        sortOrder: Number.isFinite(sortOrder) ? Math.floor(sortOrder) : 99,
      },
    })

    return success({
      message: 'Meta criada com sucesso',
      config: created,
    }, 201)
  } catch (err) {
    console.error('Admin goal-configs POST error:', err)
    return error('Failed to create goal config', 500)
  }
}
