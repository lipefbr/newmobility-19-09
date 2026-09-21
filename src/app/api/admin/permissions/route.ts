import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { logAudit } from '@/lib/audit'

/**
 * GET /api/admin/permissions
 *
 * Returns the per-role admin page permission map stored in SystemConfig under
 * the `admin_permissions` key. The value is a JSON string of shape:
 *   {
 *     "admin":   ["*"],                                  // wildcard = all pages
 *     "support": ["users", "support", "announcements"]   // explicit allow-list
 *   }
 *
 * Query: userId=<admin id>
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const row = await prisma.systemConfig.findUnique({ where: { key: 'admin_permissions' } })
    let parsed: Record<string, string[]> = {
      admin: ['*'],
      support: ['users', 'support', 'announcements'],
    }
    if (row?.value) {
      try {
        const obj = JSON.parse(row.value)
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          // Merge with defaults so we always have at least the admin/support roles
          parsed = {
            admin: Array.isArray(obj.admin) ? obj.admin : ['*'],
            support: Array.isArray(obj.support) ? obj.support : ['users', 'support', 'announcements'],
            ...Object.fromEntries(
              Object.entries(obj).filter(
                ([k, v]) => k !== 'admin' && k !== 'support' && Array.isArray(v)
              ),
            ),
          }
        }
      } catch {
        // keep defaults
      }
    }

    return success({ permissions: parsed })
  } catch (err) {
    console.error('Admin permissions GET error:', err)
    return error('Failed to fetch permissions', 500)
  }
}

/**
 * PUT /api/admin/permissions
 *
 * Body: { userId, permissions: Record<string, string[]> }
 * Saves the permissions map back to SystemConfig as a JSON string and writes
 * an audit-log row.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, permissions } = body as {
      userId?: string
      permissions?: Record<string, string[]>
    }
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
      return error('permissions object is required', 400)
    }

    // Sanitise: every value must be a string array.
    const clean: Record<string, string[]> = {}
    for (const [role, pages] of Object.entries(permissions)) {
      if (Array.isArray(pages)) {
        clean[role] = pages.map((p) => String(p)).filter(Boolean)
      }
    }

    const json = JSON.stringify(clean)

    await prisma.systemConfig.upsert({
      where: { key: 'admin_permissions' },
      update: { value: json },
      create: { key: 'admin_permissions', value: json, description: 'Per-role admin page allow-list' },
    })

    await logAudit({
      adminId: admin.id,
      adminName: admin.name || admin.email,
      action: 'config_change',
      details: `Permissões de admin atualizadas: ${Object.keys(clean).join(', ')}`,
      ipAddress: req.headers.get('x-forwarded-for') || null,
    })

    return success({ message: 'Permissões atualizadas com sucesso', permissions: clean })
  } catch (err) {
    console.error('Admin permissions PUT error:', err)
    return error('Failed to update permissions', 500)
  }
}
