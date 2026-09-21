import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// GET a single ticket with messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('userId')

    if (!adminUserId) {
      return error('userId is required')
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!adminUser || (adminUser.role !== 'admin')) {
      return error('Unauthorized - Admin only', 403)
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!ticket) {
      return error('Ticket not found', 404)
    }

    return success({
      ticket: {
        id: ticket.id,
        userId: ticket.userId,
        userName: ticket.user?.name || 'Usuário',
        userEmail: ticket.user?.email || '',
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        messages: ticket.messages.map((m) => ({
          id: m.id,
          message: m.message,
          isAdmin: m.isAdmin,
          userId: m.userId,
          createdAt: m.createdAt,
        })),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
    })
  } catch (err) {
    console.error('Admin get ticket error:', err)
    return error('Internal server error', 500)
  }
}

// PUT - update ticket status (open/closed/resolved/etc.)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params
    const body = await request.json()
    const { userId, status } = body

    if (!userId) {
      return error('userId is required')
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

    // Update ticket status
    const validStatuses = ['open', 'in_progress', 'answered', 'resolved', 'closed']
    if (status && !validStatuses.includes(status)) {
      return error('Invalid status')
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
    })

    return success({ ticket: updatedTicket })
  } catch (err) {
    console.error('Admin update ticket error:', err)
    return error('Internal server error', 500)
  }
}
