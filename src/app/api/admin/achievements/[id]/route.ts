import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// PUT — update an achievement
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
      icon,
      category,
      pointsReward,
      targetValue,
      isActive,
      sortOrder,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.achievement.findUnique({ where: { id } })
    if (!existing) return error('Achievement not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description || null
    if (icon !== undefined) data.icon = icon || null
    if (category !== undefined) data.category = category
    if (pointsReward !== undefined) data.pointsReward = Number(pointsReward) || 0
    if (targetValue !== undefined) data.targetValue = Number(targetValue) || 1
    if (isActive !== undefined) data.isActive = Boolean(isActive)
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0

    const updated = await prisma.achievement.update({ where: { id }, data })
    return success(updated)
  } catch (err) {
    console.error('Admin achievements PUT error:', err)
    return error('Failed to update achievement', 500)
  }
}

// DELETE — delete an achievement
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

    const existing = await prisma.achievement.findUnique({ where: { id } })
    if (!existing) return error('Achievement not found', 404)

    await prisma.achievement.delete({ where: { id } })
    return success({ message: 'Achievement deleted successfully' })
  } catch (err) {
    console.error('Admin achievements DELETE error:', err)
    return error('Failed to delete achievement', 500)
  }
}
