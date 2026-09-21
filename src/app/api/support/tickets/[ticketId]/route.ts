import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const ticket = await db.findOne('Ticket', '"id" = $1', [ticketId])

    if (!ticket) {
      return error('Ticket not found', 404)
    }

    if ((ticket as any).userId !== userId) {
      return error('Ticket does not belong to this user', 403)
    }

    // Get messages ordered ascending
    const messages = await db.find(
      'TicketMessage',
      '"ticketId" = $1',
      [ticketId],
      'ORDER BY "createdAt" ASC'
    )

    return success({ ticket: { ...ticket, messages } })
  } catch (err) {
    console.error('Ticket detail error:', err)
    return error('Internal server error', 500)
  }
}
