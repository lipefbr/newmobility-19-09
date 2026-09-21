import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'admin') return null
  return user
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, name, dataAmount, priceCents, cashbackCents, rewardPoints, features, isPopular, isRecommended, isActive, sortOrder } = body
    if (!(await requireAdmin(userId))) return error('Unauthorized', 403)

    const existing = await prisma.talkMobiPlan.findUnique({ where: { id } })
    if (!existing) return error('Plan not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim()
    if (dataAmount !== undefined) data.dataAmount = String(dataAmount).trim()
    if (priceCents !== undefined) data.priceCents = Math.floor(Number(priceCents) || 0)
    if (cashbackCents !== undefined) data.cashbackCents = Math.max(0, Math.floor(Number(cashbackCents) || 0))
    if (rewardPoints !== undefined) data.rewardPoints = Math.max(0, Math.floor(Number(rewardPoints) || 0))
    if (features !== undefined) data.features = JSON.stringify(Array.isArray(features) ? features : [])
    if (isPopular !== undefined) data.isPopular = !!isPopular
    if (isRecommended !== undefined) data.isRecommended = !!isRecommended
    if (isActive !== undefined) data.isActive = !!isActive
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder)

    const updated = await prisma.talkMobiPlan.update({ where: { id }, data })
    let parsedFeatures: unknown[] = []
    try { parsedFeatures = JSON.parse(updated.features || '[]') } catch { /* ignore */ }
    return success({ ...updated, features: parsedFeatures })
  } catch (err) {
    console.error('Update talkmobi plan error:', err)
    return error('Failed to update TalkMobi plan', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!(await requireAdmin(userId))) return error('Unauthorized', 403)

    const existing = await prisma.talkMobiPlan.findUnique({ where: { id } })
    if (!existing) return error('Plan not found', 404)

    await prisma.talkMobiPlan.delete({ where: { id } })
    return success({ id, deleted: true })
  } catch (err) {
    console.error('Delete talkmobi plan error:', err)
    return error('Failed to delete TalkMobi plan', 500)
  }
}
