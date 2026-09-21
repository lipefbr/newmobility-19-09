import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// PUT — update a streak reward
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      userId,
      streakDays,
      rewardType,
      rewardAmount,
      description,
      isActive,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.streakReward.findUnique({ where: { id } })
    if (!existing) return error('Streak reward not found', 404)

    const data: Record<string, unknown> = {}
    if (streakDays !== undefined) {
      const days = Number(streakDays)
      if (days <= 0) return error('streakDays deve ser positivo', 400)
      // Check uniqueness against other records
      const conflict = await prisma.streakReward.findUnique({ where: { streakDays: days } })
      if (conflict && conflict.id !== id) return error('Já existe uma recompensa para estes dias', 400)
      data.streakDays = days
    }
    if (rewardType !== undefined) data.rewardType = rewardType
    if (rewardAmount !== undefined) data.rewardAmount = Number(rewardAmount) || 0
    if (description !== undefined) data.description = description || null
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    const updated = await prisma.streakReward.update({ where: { id }, data })
    return success(updated)
  } catch (err) {
    console.error('Admin streak-rewards PUT error:', err)
    return error('Failed to update streak reward', 500)
  }
}

// DELETE — delete a streak reward
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.streakReward.findUnique({ where: { id } })
    if (!existing) return error('Streak reward not found', 404)

    await prisma.streakReward.delete({ where: { id } })
    return success({ message: 'Streak reward deleted successfully' })
  } catch (err) {
    console.error('Admin streak-rewards DELETE error:', err)
    return error('Failed to delete streak reward', 500)
  }
}
