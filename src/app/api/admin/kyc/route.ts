import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * GET /api/admin/kyc?status=pending|approved|rejected|all&page=1&limit=10
 *
 * Admin-only. Returns paginated list of users with their KycDocuments.
 * Defaults to status='pending'.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return error('Não autenticado', 401)
    if (session.role !== 'admin') return error('Acesso restrito a administradores', 403)

    const status = req.nextUrl.searchParams.get('status') || 'pending'
    const page = Math.max(parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '10', 10) || 10, 1),
      50
    )
    const search = req.nextUrl.searchParams.get('search')?.trim() || ''
    const offset = (page - 1) * limit

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const whereUser: Record<string, unknown> = {}
    if (status !== 'all' && ['pending', 'approved', 'rejected', 'none'].includes(status)) {
      whereUser.kycStatus = status
    }
    if (search) {
      whereUser.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Run user list + counts in parallel
    const [users, total, pendingCount, approvedToday, rejectedToday] = await Promise.all([
      prisma.user.findMany({
        where: whereUser,
        orderBy: [{ kycStatus: 'asc' }, { updatedAt: 'desc' }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          plan: true,
          kycStatus: true,
          kycVerifiedAt: true,
          kycRejectedReason: true,
          kycVerifiedById: true,
          updatedAt: true,
          createdAt: true,
          kycDocuments: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              docType: true,
              fileUrl: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              status: true,
              rejectReason: true,
              reviewedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.user.count({ where: whereUser }),
      prisma.user.count({ where: { kycStatus: 'pending' } }),
      prisma.user.count({
        where: { kycStatus: 'approved', kycVerifiedAt: { gte: startOfToday } },
      }),
      prisma.user.count({
        where: { kycStatus: 'rejected', updatedAt: { gte: startOfToday } },
      }),
    ])

    // Count uploaded docTypes per user (max 5)
    const formatted = users.map((u) => {
      const docTypes = new Set(u.kycDocuments.map((d) => d.docType))
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        cpf: u.cpf,
        phone: u.phone,
        plan: u.plan,
        kycStatus: u.kycStatus,
        kycVerifiedAt: u.kycVerifiedAt,
        kycRejectedReason: u.kycRejectedReason,
        kycVerifiedById: u.kycVerifiedById,
        updatedAt: u.updatedAt,
        createdAt: u.createdAt,
        uploadedCount: docTypes.size,
        documents: u.kycDocuments,
      }
    })

    return success({
      users: formatted,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      stats: {
        pendingCount,
        approvedToday,
        rejectedToday,
      },
    })
  } catch (err) {
    console.error('GET /api/admin/kyc error:', err)
    return error('Erro ao listar KYC para revisão', 500)
  }
}
