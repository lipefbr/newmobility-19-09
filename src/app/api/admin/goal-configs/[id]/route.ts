import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/goal-configs/[id] — UPDATE and DELETE for individual goal configs
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

// PUT /api/admin/goal-configs/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      isActive,
      sortOrder,
    } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.goalConfig.findUnique({ where: { id } })
    if (!existing) return error('Meta não encontrada', 404)

    // Build update data with validation
    const data: Record<string, unknown> = {}
    if (typeof name === 'string' && name.trim().length >= 3) data.name = name.trim()
    if (description !== undefined) data.description = typeof description === 'string' ? description.trim() || null : null
    if (targetQualification !== undefined) data.targetQualification = isValid(targetQualification, VALID_QUALIFICATIONS) ? targetQualification : 'ambos'
    if (metricCode !== undefined) data.metricCode = isValid(metricCode, VALID_METRICS) ? metricCode : 'trips_daily'
    if (metricLabel !== undefined && typeof metricLabel === 'string') data.metricLabel = metricLabel.trim() || 'viagens finalizadas'
    if (targetValue !== undefined && Number.isFinite(targetValue)) data.targetValue = Math.max(1, Math.floor(targetValue))
    if (rewardCents !== undefined && Number.isFinite(rewardCents)) data.rewardCents = Math.max(0, Math.floor(rewardCents))
    if (rewardWallet !== undefined) data.rewardWallet = isValid(rewardWallet, VALID_WALLETS) ? rewardWallet : 'gratification'
    if (frequency !== undefined) data.frequency = isValid(frequency, VALID_FREQUENCIES) ? frequency : 'daily'
    if (isActive !== undefined) data.isActive = Boolean(isActive)
    if (sortOrder !== undefined && Number.isFinite(sortOrder)) data.sortOrder = Math.floor(sortOrder)

    const updated = await prisma.goalConfig.update({
      where: { id },
      data,
    })

    return success({
      message: 'Meta atualizada com sucesso',
      config: updated,
    })
  } catch (err) {
    console.error('Admin goal-configs PUT error:', err)
    return error('Failed to update goal config', 500)
  }
}

// DELETE /api/admin/goal-configs/[id]?userId=<adminId>
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.goalConfig.findUnique({ where: { id } })
    if (!existing) return error('Meta não encontrada', 404)

    await prisma.goalConfig.delete({ where: { id } })

    return success({ message: 'Meta excluída com sucesso' })
  } catch (err) {
    console.error('Admin goal-configs DELETE error:', err)
    return error('Failed to delete goal config', 500)
  }
}
