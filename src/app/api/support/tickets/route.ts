import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    // Get tickets with latest message
    const tickets = await db.find(
      'Ticket',
      '"userId" = $1',
      [userId],
      'ORDER BY "updatedAt" DESC'
    ) as any[]

    // For each ticket, get the latest message
    const ticketsWithMessages = await Promise.all(
      tickets.map(async (ticket) => {
        const messages = await db.find(
          'TicketMessage',
          '"ticketId" = $1',
          [ticket.id],
          'ORDER BY "createdAt" DESC LIMIT 1'
        ) as any[]
        return {
          ...ticket,
          messages,
        }
      })
    )

    return success({ tickets: ticketsWithMessages })
  } catch (err) {
    console.error('Tickets error:', err)
    return error('Internal server error', 500)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, subject, category, message } = body

    if (!userId || !subject || !category || !message) {
      return error('userId, subject, category, and message are required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    // Create ticket
    const ticket = await db.insert('Ticket', {
      userId,
      subject,
      category,
      status: 'open',
    })

    // Create first message
    const ticketMessage = await db.insert('TicketMessage', {
      ticketId: (ticket as any).id,
      userId,
      message,
      isAdmin: false,
    })

    return success({
      ticket: {
        ...ticket,
        messages: [ticketMessage],
      },
    }, 201)
  } catch (err) {
    console.error('Create ticket error:', err)
    return error('Internal server error', 500)
  }
}
