import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, title, message, type, priority, isActive, actionLabel, actionUrl, startDate, endDate } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    // Build update data dynamically
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (message !== undefined) updateData.message = message
    if (type !== undefined) updateData.type = type
    if (priority !== undefined) updateData.priority = priority
    if (isActive !== undefined) updateData.isActive = isActive
    if (actionLabel !== undefined) updateData.actionLabel = actionLabel
    if (actionUrl !== undefined) updateData.actionUrl = actionUrl
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
    })

    return success(announcement)
  } catch (err) {
    console.error('Update announcement error:', err)
    return error('Failed to update announcement', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    await prisma.announcement.delete({ where: { id } })
    return success({ message: 'Announcement deleted' })
  } catch (err) {
    console.error('Delete announcement error:', err)
    return error('Failed to delete announcement', 500)
  }
}
