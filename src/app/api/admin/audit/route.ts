import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * GET /api/admin/audit
 *
 * Returns audit log rows for the admin "Logs de Auditoria" panel.
 *
 * Query params:
 *   userId        — admin id (required, must be role=admin)
 *   action        — filter by action (user_edit | user_block | kyc_approve ...)
 *   adminId       — filter by admin id (the admin who performed the action)
 *   targetUserId  — filter by target user id
 *   startDate     — ISO date string, inclusive
 *   endDate       — ISO date string, inclusive
 *   search        — fuzzy match against adminName / targetEmail / details
 *   page          — 1-indexed page number (default 1)
 *   limit         — page size, capped at 100 (default 50)
 */
export async function GET(req: NextRequest) {
  try {
    const adminId = req.nextUrl.searchParams.get('userId')
    if (!adminId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const action = req.nextUrl.searchParams.get('action') || 'all'
    const filterAdminId = req.nextUrl.searchParams.get('adminId') || ''
    const targetUserId = req.nextUrl.searchParams.get('targetUserId') || ''
    const startDate = req.nextUrl.searchParams.get('startDate') || ''
    const endDate = req.nextUrl.searchParams.get('endDate') || ''
    const search = req.nextUrl.searchParams.get('search') || ''
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (action !== 'all') where.action = action
    if (filterAdminId) where.adminId = filterAdminId
    if (targetUserId) where.targetUserId = targetUserId

    const dateRange: Record<string, Date> = {}
    if (startDate) dateRange.gte = new Date(startDate)
    if (endDate) {
      // endDate inclusive: bump to end-of-day
      const d = new Date(endDate)
      d.setHours(23, 59, 59, 999)
      dateRange.lte = d
    }
    if (Object.keys(dateRange).length > 0) where.createdAt = dateRange

    if (search) {
      where.OR = [
        { adminName: { contains: search, mode: 'insensitive' } },
        { targetEmail: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return success({
      logs: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    })
  } catch (err) {
    console.error('Admin audit GET error:', err)
    return error('Failed to fetch audit logs', 500)
  }
}
