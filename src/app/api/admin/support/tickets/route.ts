import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('userId')
    const statusFilter = searchParams.get('status') || 'all'
    const categoryFilter = searchParams.get('category') || 'all'
    const priorityFilter = searchParams.get('priority') || 'all'

    if (!adminUserId) {
      return error('userId is required')
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!adminUser || (adminUser.role !== 'admin')) {
      return error('Unauthorized - Admin only', 403)
    }

    // Build Prisma where clause
    const where: Record<string, unknown> = {}
    if (statusFilter !== 'all') {
      where.status = statusFilter
    }
    if (categoryFilter !== 'all') {
      where.category = categoryFilter
    }
    if (priorityFilter !== 'all') {
      where.priority = priorityFilter
    }

    // Get tickets with user info - use select instead of include for efficiency
    let tickets: any[] = []
    try {
      tickets = await prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          userId: true,
          subject: true,
          category: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true, email: true } },
          messages: {
            orderBy: { createdAt: 'asc' as const },
            select: {
              id: true,
              message: true,
              isAdmin: true,
              userId: true,
              createdAt: true,
            },
          },
        },
      })
    } catch (e) {
      console.error('Admin tickets findMany error:', e)
      // Return empty list if query fails
      return success({ tickets: [] })
    }

    const ticketsWithMessages = tickets.map((ticket: any) => {
      const adminReplies = ticket.messages.filter((m: any) => m.isAdmin)
      const lastAdminReply = adminReplies.length > 0 ? adminReplies[adminReplies.length - 1] : null

      return {
        id: ticket.id,
        userId: ticket.userId,
        userName: ticket.user?.name || 'Usuário',
        userEmail: ticket.user?.email || '',
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority || 'normal',
        message: ticket.messages.length > 0 ? ticket.messages[0].message : '',
        reply: lastAdminReply ? lastAdminReply.message : undefined,
        messages: ticket.messages,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }
    })

    return success({ tickets: ticketsWithMessages })
  } catch (err) {
    console.error('Admin tickets error:', err)
    return error('Internal server error', 500)
  }
}
