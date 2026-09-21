import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// POST /api/admin/gratifications/assign
// Task 2-c / Admin Item 2 — create a gratification row attributed to a user.
//
// Body:
//   userId          (string)  — admin's id (must have role === 'admin')
//   targetUserId    (string)  — user who will receive the gratification
//   type            (string)  — machine-readable benefit slug, e.g.
//                               'leadership', 'fuel_aid', 'custom'
//   amount          (number)  — reward value in BRL cents (positive integer)
//   category        (string)  — wallet/balance bucket the gratification lands
//                               on, e.g. 'gratification', 'mobility'
//   name            (string?) — human-readable label shown on the user's Metas
//                               list. Defaults to the type slug when missing.
//   qualification   (string?) — PT-BR free-text describing the requirement the
//                               user must satisfy to claim this gratification
//                               (e.g. "Ao fechar o 5º nível"). Persisted on
//                               the Gratification.qualification column.
//   description     (string?) — admin-only note (defaults to the name).
//
// On success, returns the created Gratification row (HTTP 201).
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      targetUserId,
      type,
      amount,
      category,
      name,
      qualification,
      description,
    } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!targetUserId || !type || !amount || !category) {
      return error('targetUserId, type, amount, and category are required', 400)
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return error('amount must be a positive number', 400)
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) return error('Target user not found', 404)

    // When the admin provides a name, prepend it to the description so the
    // user-facing gratifications list shows a friendly label. The Gratification
    // model has no dedicated `name` column, so we encode it into the
    // description field as "Name — description" (matches the convention used
    // by the public /api/gratifications GET handler which splits on '—').
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const trimmedDescription = typeof description === 'string' ? description.trim() : ''
    const trimmedQualification = typeof qualification === 'string' ? qualification.trim() : ''

    let finalDescription: string
    if (trimmedDescription && trimmedName && trimmedName !== trimmedDescription) {
      finalDescription = `${trimmedName} — ${trimmedDescription}`
    } else if (trimmedDescription) {
      finalDescription = trimmedDescription
    } else {
      finalDescription = trimmedName || `Gratificação ${type} atribuída pelo admin`
    }

    const gratification = await prisma.gratification.create({
      data: {
        userId: targetUserId,
        type,
        amount,
        category,
        description: finalDescription,
        // qualification column = PT-BR human-readable requirement text.
        qualification: trimmedQualification || null,
        isClaimed: false,
      },
    })

    return success(gratification, 201)
  } catch (err) {
    console.error('Admin gratifications/assign POST error:', err)
    return error('Failed to assign gratification', 500)
  }
}
