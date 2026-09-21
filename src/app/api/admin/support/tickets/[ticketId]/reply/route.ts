import { prisma } from '@/lib/db'
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

    // Verify admin
    const adminUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!adminUser || (adminUser.role !== 'admin')) {
      return error('Unauthorized - Admin only', 403)
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
      return error('Ticket not found', 404)
    }

    if (ticket.status === 'closed') {
      return error('Cannot reply to a closed ticket', 400)
    }

    // Create admin reply message
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        message,
        isAdmin: true,
      },
    })

    // Update ticket status to 'in_progress' so it shows in the admin filter
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'in_progress' },
    })

    return success({ message: ticketMessage }, 201)
  } catch (err) {
    console.error('Admin reply ticket error:', err)
    return error('Internal server error', 500)
  }
}
