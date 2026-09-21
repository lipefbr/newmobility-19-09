import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, isActive } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (typeof isActive !== 'boolean') {
      return error('isActive must be a boolean', 400)
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return error('User not found', 404)

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
    })

    return success(sanitizeUser(updatedUser))
  } catch (err) {
    return error('Failed to toggle user active status', 500)
  }
}
