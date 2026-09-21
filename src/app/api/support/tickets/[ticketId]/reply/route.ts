import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params
    const body = await request.json()
    const { userId, message } = body

    if (!userId || !message) {
      return error('userId and message are required')
    }

    const ticket = await db.findOne('Ticket', '"id" = $1', [ticketId])

    if (!ticket) {
      return error('Ticket not found', 404)
    }

    if ((ticket as any).userId !== userId) {
      return error('Ticket does not belong to this user', 403)
    }

    if ((ticket as any).status === 'closed') {
      return error('Cannot reply to a closed ticket', 400)
    }

    const ticketMessage = await db.insert('TicketMessage', {
      ticketId,
      userId,
      message,
      isAdmin: false,
    })

    // Update ticket status to in_progress if it was open
    if ((ticket as any).status === 'open') {
      await db.update(
        'Ticket',
        '"id" = $1',
        { status: 'in_progress' },
        [ticketId]
      )
    }

    return success({ message: ticketMessage }, 201)
  } catch (err) {
    console.error('Reply ticket error:', err)
    return error('Internal server error', 500)
  }
}
