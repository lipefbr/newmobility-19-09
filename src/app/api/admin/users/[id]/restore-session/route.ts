import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'

/**
 * POST /api/admin/users/[id]/restore-session
 *
 * Counterpart to /api/admin/users/[id]/login-as — called by the
 * ImpersonationBanner ("Voltar para Admin" button) when the admin is done
 * browsing as the impersonated user and wants to return to their real admin
 * session.
 *
 * `[id]` is the ADMIN's user id (read from `originalAdminId` on the client).
 * Body: `{ userId: <impersonatedUserId> }` — the impersonated user id, used
 * only for audit logging.
 *
 * Response shape mirrors the login-as response so the client can call
 * `login(data.user)` with the same object shape:
 *   { user, adminId, adminName, message: 'Sessão restaurada' }
 *
 * NOTE: We write the AuditLog row directly with prisma.auditLog.create using
 * the schema-supported fields (userId / action / entityType / entityId /
 * details / ipAddress) rather than going through the logAudit() helper,
 * because the helper's parameter shape (adminId / adminName / targetUserId /
 * targetEmail) does NOT match the actual AuditLog model columns — its writes
 * fail silently. This route uses the correct column names per the task spec.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const impersonatedUserId = body.userId

    // Look up the admin (the [id] param). The body's `userId` is the
    // impersonated user (for audit only) — we don't strictly require it but
    // we log it when present.
    const admin = await prisma.user.findUnique({ where: { id } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const safeUser = sanitizeUser(admin as unknown as Record<string, unknown>)

    try {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'login_as_restore',
          entityType: 'User',
          entityId: impersonatedUserId || null,
          details: JSON.stringify({
            impersonatedUserId: impersonatedUserId || null,
            restoredAt: new Date().toISOString(),
          }),
          ipAddress: req.headers.get('x-forwarded-for') || null,
        },
      })
    } catch (auditErr) {
      // Audit failures must never block the restore flow — only log to stderr.
      console.error('Failed to write restore-session audit log:', auditErr)
    }

    return success({
      user: safeUser,
      adminId: admin.id,
      adminName: admin.name || admin.email,
      message: 'Sessão restaurada',
    })
  } catch (err) {
    console.error('Admin restore-session POST error:', err)
    return error('Failed to restore admin session', 500)
  }
}

