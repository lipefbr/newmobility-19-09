import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    // Admin view: return ALL announcements (including inactive)
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user && user.role === 'admin') {
        const all = await prisma.announcement.findMany({
          orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        })
        return success(all)
      }
    }
    // Public view: only active + in date range
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })
    const now = new Date()
    const active = announcements.filter(a => {
      if (a.startDate && new Date(a.startDate) > now) return false
      if (a.endDate && new Date(a.endDate) < now) return false
      return true
    })
    return success(active)
  } catch (err) {
    console.error('Admin announcements GET error:', err)
    return error('Failed to fetch announcements', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, title, message, type, priority, actionLabel, actionUrl, startDate, endDate } = body
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!title || !message) return error('title and message are required', 400)

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type: type || 'info',
        priority: priority || 'normal',
        actionLabel: actionLabel || null,
        actionUrl: actionUrl || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: userId,
      },
    })

    return success(announcement, 201)
  } catch (err) {
    console.error('Admin announcements POST error:', err)
    return error('Failed to create announcement', 500)
  }
}
