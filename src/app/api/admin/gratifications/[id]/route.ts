import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, amount, type, category, description, isClaimed } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const gratification = await prisma.gratification.findUnique({ where: { id } })
    if (!gratification) return error('Gratification not found', 404)

    const data: Record<string, unknown> = {}
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return error('amount must be a positive number', 400)
      }
      data.amount = amount
    }
    if (type !== undefined) data.type = type
    if (category !== undefined) data.category = category
    if (description !== undefined) data.description = description
    if (isClaimed !== undefined) {
      data.isClaimed = isClaimed
      if (isClaimed && !gratification.isClaimed) {
        data.claimedAt = new Date()
      }
    }

    const updatedGratification = await prisma.gratification.update({
      where: { id },
      data,
    })

    return success(updatedGratification)
  } catch (err) {
    return error('Failed to update gratification', 500)
  }
}
