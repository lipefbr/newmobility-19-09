import { NextRequest } from 'next/server'
import { success, error } from '@/lib/api-utils'
import { prisma } from '@/lib/db'

// PUT update a plan
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const body = await req.json()
    const {
      userId,
      name,
      price,
      features,
      matrixEntradaId,
      matrixResidualId,
      matrixVendasId,
      description,
      isActive,
      sortOrder,
    } = body

    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.plan.findUnique({ where: { id: planId } })
    if (!existing) return error('Plan not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (price !== undefined) data.priceCents = Number(price)
    if (description !== undefined) data.description = description
    if (features !== undefined) {
      const featuresArray = Array.isArray(features)
        ? features
        : typeof features === 'string'
          ? features.split(',').map((f: string) => f.trim()).filter(Boolean)
          : []
      data.features = JSON.stringify(featuresArray)
    }
    if (matrixEntradaId !== undefined) data.matrixEntradaId = matrixEntradaId || null
    if (matrixResidualId !== undefined) data.matrixResidualId = matrixResidualId || null
    if (matrixVendasId !== undefined) data.matrixVendasId = matrixVendasId || null
    if (isActive !== undefined) data.isActive = Boolean(isActive)
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder)

    const updated = await prisma.plan.update({ where: { id: planId }, data })
    return success(updated)
  } catch (err) {
    console.error('Update plan error:', err)
    return error('Failed to update plan', 500)
  }
}

// DELETE a plan
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const userId = req.nextUrl.searchParams.get('userId')

    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.plan.findUnique({ where: { id: planId } })
    if (!existing) return error('Plan not found', 404)

    // Prevent deletion of default plans
    if (existing.isDefault) {
      return error('Não é possível excluir planos padrão', 400)
    }

    // Check if any users are using this plan (by planId or plan code)
    const usersWithPlan = await prisma.user.count({
      where: { OR: [{ planId }, { plan: existing.code }] },
    })
    if (usersWithPlan > 0) {
      return error(`Não é possível excluir: ${usersWithPlan} usuário(s) está(ão) usando este plano`, 400)
    }

    await prisma.plan.delete({ where: { id: planId } })
    return success({ message: 'Plan deleted successfully' })
  } catch (err) {
    console.error('Delete plan error:', err)
    return error('Failed to delete plan', 500)
  }
}
