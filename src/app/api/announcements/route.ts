import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const announcements = await db.find(
      'Announcement',
      '"isActive" = true',
      [],
      'ORDER BY priority DESC, "createdAt" DESC'
    ) as any[]
    const now = new Date()
    const active = announcements.filter(a => {
      if (a.startDate && new Date(a.startDate) > now) return false
      if (a.endDate && new Date(a.endDate) < now) return false
      return true
    })
    return success(active)
  } catch (err) {
    return error('Failed to fetch announcements', 500)
  }
}
