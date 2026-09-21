import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, userIds, action } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return error('userIds array is required', 400)
    }

    if (action !== 'activate' && action !== 'deactivate') {
      return error('action must be "activate" or "deactivate"', 400)
    }

    const isActive = action === 'activate'
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive },
    })

    return success({
      action,
      affectedCount: result.count,
      isActive,
    })
  } catch (err) {
    console.error('Bulk action error:', err)
    return error('Failed to perform bulk action', 500)
  }
}
