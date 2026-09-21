import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// PUT — update a game config
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
      pointsPerWin,
      pointsPerPlay,
      cashbackPerWin,
      minBetCents,
      maxPlaysPerDay,
      isActive,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.gameConfig.findUnique({ where: { id } })
    if (!existing) return error('Game config not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description || null
    if (pointsPerWin !== undefined) data.pointsPerWin = Number(pointsPerWin) || 0
    if (pointsPerPlay !== undefined) data.pointsPerPlay = Number(pointsPerPlay) || 0
    if (cashbackPerWin !== undefined) data.cashbackPerWin = Number(cashbackPerWin) || 0
    if (minBetCents !== undefined) data.minBetCents = Number(minBetCents) || 0
    if (maxPlaysPerDay !== undefined) data.maxPlaysPerDay = Number(maxPlaysPerDay) || 0
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    const updated = await prisma.gameConfig.update({ where: { id }, data })
    return success(updated)
  } catch (err) {
    console.error('Admin game-config PUT error:', err)
    return error('Failed to update game config', 500)
  }
}

// DELETE — delete a game config
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

    const existing = await prisma.gameConfig.findUnique({ where: { id } })
    if (!existing) return error('Game config not found', 404)

    await prisma.gameConfig.delete({ where: { id } })
    return success({ message: 'Game config deleted successfully' })
  } catch (err) {
    console.error('Admin game-config DELETE error:', err)
    return error('Failed to delete game config', 500)
  }
}
