import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const VALID_RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other']

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ dependentId: string }> }
) {
  try {
    const { dependentId } = await params
    const body = await request.json()
    const { userId, name, cpf, relationship, birthDate, phone, email, isActive } = body

    if (!userId) {
      return error('userId is required')
    }

    // Validate relationship if provided
    if (relationship && !VALID_RELATIONSHIPS.includes(relationship)) {
      return error(`relationship must be one of: ${VALID_RELATIONSHIPS.join(', ')}`)
    }

    // Find the dependent and verify ownership
    const dependent = await db.dependent.findUnique({
      where: { id: dependentId },
    })

    if (!dependent) {
      return error('Dependent not found', 404)
    }

    if (dependent.userId !== userId) {
      return error('You do not have permission to update this dependent', 403)
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = typeof name === 'string' ? name.trim() : name
    if (cpf !== undefined) updateData.cpf = cpf
    if (relationship !== undefined) updateData.relationship = relationship
    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedDependent = await db.dependent.update({
      where: { id: dependentId },
      data: updateData,
    })

    return success({ dependent: updatedDependent })
  } catch (err) {
    console.error('Update dependent error:', err)
    return error('Internal server error', 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dependentId: string }> }
) {
  try {
    const { dependentId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    // Find the dependent and verify ownership
    const dependent = await db.dependent.findUnique({
      where: { id: dependentId },
    })

    if (!dependent) {
      return error('Dependent not found', 404)
    }

    if (dependent.userId !== userId) {
      return error('You do not have permission to delete this dependent', 403)
    }

    // Soft delete - set isActive to false
    await db.dependent.update({
      where: { id: dependentId },
      data: { isActive: false },
    })

    return success({ message: 'Dependent removed successfully' })
  } catch (err) {
    console.error('Delete dependent error:', err)
    return error('Internal server error', 500)
  }
}
