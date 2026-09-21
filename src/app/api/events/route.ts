import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const status = url.searchParams.get('status') || 'upcoming'
    const limit = parseInt(url.searchParams.get('limit') || '20')

    // Build conditions
    const conditions: string[] = ['"isActive" = true']
    const params: any[] = []
    let paramIdx = 1

    if (status !== 'all') {
      conditions.push(`status = $${paramIdx}`)
      params.push(status)
      paramIdx++
    }

    // Get real events from database (no mock fallback — return empty array when DB is empty)
    const events = await db.find(
      'Event',
      conditions.join(' AND '),
      params,
      `ORDER BY "eventDate" ASC LIMIT ${limit}`
    ) as any[]

    // Enrich events with registration counts and user registration status
    for (const evt of events) {
      const regCount = await db.count('EventRegistration', '"eventId" = $1', [evt.id])
      let isRegistered = false
      if (userId) {
        const reg = await db.findOne(
          'EventRegistration',
          '"eventId" = $1 AND "userId" = $2',
          [evt.id, userId]
        )
        isRegistered = !!reg
      }
      evt.registrationCount = regCount
      evt.isRegistered = isRegistered
    }

    const formattedEvents = events.map((evt: any) => ({
      id: evt.id,
      title: evt.title,
      description: evt.description,
      type: evt.type,
      status: evt.status,
      eventDate: evt.eventDate instanceof Date ? evt.eventDate.toISOString() : evt.eventDate,
      endDate: evt.endDate instanceof Date ? evt.endDate?.toISOString() : evt.endDate,
      location: evt.location,
      meetingUrl: evt.meetingUrl,
      maxAttendees: evt.maxAttendees,
      registrationCount: evt.registrationCount ?? 0,
      isRegistered: evt.isRegistered ?? false,
    }))

    return success({ events: formattedEvents, total: formattedEvents.length })
  } catch (err: any) {
    return error(err.message || 'Erro ao buscar eventos', 500)
  }
}
