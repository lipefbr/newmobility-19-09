import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'json'
    const plan = searchParams.get('plan')
    const status = searchParams.get('status')

    // Build where clause using Prisma (not raw SQL)
    const where: Record<string, unknown> = {}
    if (plan) where.plan = plan
    if (status === 'active') where.isActive = true
    if (status === 'inactive') where.isActive = false

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        isActive: true,
        createdAt: true,
        referralCode: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Count direct referrals for each user
    const usersWithCount = await Promise.all(
      users.map(async (u) => {
        const directReferrals = await prisma.user.count({
          where: { referredById: u.id },
        })
        return { ...u, directReferrals }
      })
    )

    if (format === 'csv') {
      const headers = 'Nome,Email,Plano,Status,Código de Indicação,Indicados Diretos,Data de Cadastro\n'
      const rows = usersWithCount.map(r =>
        `"${r.name}","${r.email}","${r.plan}","${r.isActive ? 'Ativo' : 'Inativo'}","${r.referralCode}",${r.directReferrals},"${new Date(r.createdAt).toLocaleDateString('pt-BR')}"`
      ).join('\n')

      return new Response(headers + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=referrals-export.csv',
        },
      })
    }

    return success({ referrals: usersWithCount, total: usersWithCount.length })
  } catch (err) {
    console.error('Referrals export error:', err)
    return error('Failed to export referrals', 500)
  }
}
