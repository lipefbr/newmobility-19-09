import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// PUT — update a FAQ
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      userId,
      question,
      answer,
      category,
      isActive,
      sortOrder,
    } = body

    if (!userId) return error('userId is required', 400)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.fAQ.findUnique({ where: { id } })
    if (!existing) return error('FAQ not found', 404)

    const data: Record<string, unknown> = {}
    if (question !== undefined) data.question = question
    if (answer !== undefined) data.answer = answer
    if (category !== undefined) data.category = category
    if (isActive !== undefined) data.isActive = Boolean(isActive)
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0

    const updated = await prisma.fAQ.update({ where: { id }, data })
    return success(updated)
  } catch (err) {
    console.error('Admin faq PUT error:', err)
    return error('Failed to update FAQ', 500)
  }
}

// DELETE — delete a FAQ
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.fAQ.findUnique({ where: { id } })
    if (!existing) return error('FAQ not found', 404)

    await prisma.fAQ.delete({ where: { id } })
    return success({ message: 'FAQ deleted successfully' })
  } catch (err) {
    console.error('Admin faq DELETE error:', err)
    return error('Failed to delete FAQ', 500)
  }
}
