import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'
import { logAudit } from '@/lib/audit'

/**
 * POST /api/admin/users/[id]/login-as
 *
 * Admin-only "Login as user" — returns the target user's full data so the
 * admin front-end can swap the current session in the zustand store to the
 * impersonated user (and remember the admin id so it can swap back).
 *
 * Also writes an `login_as` row to AuditLog.
 *
 * Body: { userId: <admin id> }
 * Response: { user, adminId, redirectUrl: '/' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const adminId = body.userId

    if (!adminId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return error('User not found', 404)

    // Don't allow impersonating other admins (would be a privilege escalation).
    if (targetUser.role === 'admin') return error('Cannot impersonate admin users', 403)

    const safeUser = sanitizeUser(targetUser as unknown as Record<string, unknown>)

    await logAudit({
      adminId: admin.id,
      adminName: admin.name || admin.email,
      action: 'login_as',
      targetUserId: id,
      targetEmail: targetUser.email,
      details: `Admin entrou no backoffice como ${targetUser.name || targetUser.email}`,
      ipAddress: req.headers.get('x-forwarded-for') || null,
    })

    return success({
      user: safeUser,
      adminId: admin.id,
      adminName: admin.name || admin.email,
      redirectUrl: '/',
      message: `Agora acessando como ${targetUser.name || targetUser.email}`,
    })
  } catch (err) {
    console.error('Admin login-as POST error:', err)
    return error('Failed to login as user', 500)
  }
}
