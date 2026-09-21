import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

const VALID_RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other']
const MAX_DEPENDENTS = 5

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return error('User not found', 404)
    }

    const dependents = await db.dependent.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return success({ dependents })
  } catch (err) {
    console.error('List dependents error:', err)
    return error('Internal server error', 500)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, name, cpf, relationship, birthDate, phone, email } = body

    // Validate required fields
    if (!userId) {
      return error('userId is required')
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return error('name is required')
    }
    if (!relationship) {
      return error('relationship is required')
    }
    if (!VALID_RELATIONSHIPS.includes(relationship)) {
      return error(`relationship must be one of: ${VALID_RELATIONSHIPS.join(', ')}`)
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return error('User not found', 404)
    }

    // Check dependent limit
    const activeCount = await db.dependent.count({
      where: { userId, isActive: true },
    })
    if (activeCount >= MAX_DEPENDENTS) {
      return error(`Maximum of ${MAX_DEPENDENTS} dependents per user reached`)
    }

    // Create dependent
    const dependent = await db.dependent.create({
      data: {
        userId,
        name: name.trim(),
        cpf: cpf || null,
        relationship,
        birthDate: birthDate ? new Date(birthDate) : null,
        phone: phone || null,
        email: email || null,
      },
    })

    return success({ dependent }, 201)
  } catch (err) {
    console.error('Create dependent error:', err)
    return error('Internal server error', 500)
  }
}
