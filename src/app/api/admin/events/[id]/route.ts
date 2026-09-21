import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// PUT — update an event
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      userId,
      title,
      description,
      type,
      status,
      eventDate,
      endDate,
      location,
      meetingUrl,
      maxAttendees,
      imageUrl,
      isActive,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.event.findUnique({ where: { id } })
    if (!existing) return error('Event not found', 404)

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (type !== undefined) data.type = type
    if (status !== undefined) data.status = status
    if (eventDate !== undefined) data.eventDate = new Date(eventDate)
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null
    if (location !== undefined) data.location = location || null
    if (meetingUrl !== undefined) data.meetingUrl = meetingUrl || null
    if (maxAttendees !== undefined) data.maxAttendees = maxAttendees ? Number(maxAttendees) : null
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    const updated = await prisma.event.update({ where: { id }, data })
    return success(updated)
  } catch (err) {
    console.error('Admin events PUT error:', err)
    return error('Failed to update event', 500)
  }
}

// DELETE — delete an event
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

    const existing = await prisma.event.findUnique({ where: { id } })
    if (!existing) return error('Event not found', 404)

    // Delete registrations first to avoid FK errors
    await prisma.eventRegistration.deleteMany({ where: { eventId: id } })
    await prisma.event.delete({ where: { id } })
    return success({ message: 'Event deleted successfully' })
  } catch (err) {
    console.error('Admin events DELETE error:', err)
    return error('Failed to delete event', 500)
  }
}
