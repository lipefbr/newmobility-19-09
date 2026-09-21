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
    const { userId: adminUserId, name, cpf, relationship, percentage } = body

    if (!adminUserId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.beneficiary.findUnique({ where: { id } })
    if (!existing) return error('Dependent not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (cpf !== undefined) data.cpf = cpf || null
    if (relationship !== undefined) data.relationship = relationship
    if (percentage !== undefined) data.percentage = percentage

    const updated = await prisma.beneficiary.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return success(updated)
  } catch (err) {
    return error('Failed to update dependent', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUserId = req.nextUrl.searchParams.get('userId')

    if (!adminUserId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.beneficiary.findUnique({ where: { id } })
    if (!existing) return error('Dependent not found', 404)

    await prisma.beneficiary.delete({ where: { id } })

    return success({ message: 'Dependent deleted successfully' })
  } catch (err) {
    return error('Failed to delete dependent', 500)
  }
}
