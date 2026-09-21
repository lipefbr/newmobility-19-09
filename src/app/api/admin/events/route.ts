import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// GET — list all events (admin view, including inactive)
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const events = await prisma.event.findMany({
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
      include: { registrations: { select: { id: true } } },
    })

    const formatted = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      type: e.type,
      status: e.status,
      eventDate: e.eventDate instanceof Date ? e.eventDate.toISOString() : e.eventDate,
      endDate: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate,
      location: e.location,
      meetingUrl: e.meetingUrl,
      maxAttendees: e.maxAttendees,
      imageUrl: e.imageUrl,
      isActive: e.isActive,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      registrationCount: e.registrations?.length || 0,
    }))

    return success({ events: formatted, total: formatted.length })
  } catch (err) {
    console.error('Admin events GET error:', err)
    return error('Failed to fetch events', 500)
  }
}

// POST — create a new event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      title,
      description,
      type = 'webinar',
      status = 'upcoming',
      eventDate,
      endDate,
      location,
      meetingUrl,
      maxAttendees,
      imageUrl,
      isActive = true,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!title || !description || !eventDate) {
      return error('title, description and eventDate are required', 400)
    }

    const created = await prisma.event.create({
      data: {
        title,
        description,
        type,
        status,
        eventDate: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        location: location || null,
        meetingUrl: meetingUrl || null,
        maxAttendees: maxAttendees ? Number(maxAttendees) : null,
        imageUrl: imageUrl || null,
        isActive: Boolean(isActive),
        createdBy: userId,
      },
    })

    return success(created, 201)
  } catch (err) {
    console.error('Admin events POST error:', err)
    return error('Failed to create event', 500)
  }
}
