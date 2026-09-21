import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * GET /api/admin/reports
 *
 * Admin-only. Returns platform-wide transaction report with segmented filters.
 *
 * Query params (all optional except userId):
 *   - userId      string  required (admin auth)
 *   - userType    string  filter by User.qualification (motorista | passageiro | comercio | entregador | passageiro_60 | passageiro_pcd)
 *   - category    string  filter by Transaction.category (mobility | shopping | food | pharmacy | gratification | withdrawal | paymentInvoice)
 *   - matrix      string  filter by matrix type (entrada | residual | vendas) — translates to the
 *                         matching cashback_* Transaction.type filter
 *   - startDate   string  ISO date — inclusive lower bound on createdAt
 *   - endDate     string  ISO date — inclusive upper bound on createdAt
 *
 * Returns:
 *   {
 *     summary: { totalEntradas, totalSaidas, saldo, cashbackRecebido, count },
 *     byUserType: [{ userType, total, count }],
 *     byCategory: [{ category, total, count }],
 *     byMatrix: [{ matrix, total, count }],
 *     byMonth: [{ month, entradas, saidas, saldo }],
 *     transactions: [{ id, userId, userName, type, category, description, amount, status, createdAt }]
 *   }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return error('Unauthorized', 401)
    if (session.role !== 'admin') return error('Forbidden', 403)

    const sp = req.nextUrl.searchParams
    const userType = sp.get('userType')?.trim() || ''
    const category = sp.get('category')?.trim() || ''
    const matrix = sp.get('matrix')?.trim() || ''
    const startDateStr = sp.get('startDate')?.trim() || ''
    const endDateStr = sp.get('endDate')?.trim() || ''

    // Build a Set of userIds that match the userType filter (if any). This
    // lets us filter transactions by their owning user's qualification without
    // joining in raw SQL (which prisma doesn't support cleanly here).
    let userIdFilter: Set<string> | null = null
    if (userType && userType !== 'all') {
      const matchingUsers = await prisma.user.findMany({
        where: { qualification: userType },
        select: { id: true },
      })
      userIdFilter = new Set(matchingUsers.map((u) => u.id))
    }

    // Build the prisma where clause for transactions
    const where: {
      createdAt?: { gte?: Date; lte?: Date }
      category?: string
      type?: string | { in: string[] }
      userId?: { in: string[] }
    } = {}

    if (startDateStr) {
      const sd = new Date(startDateStr)
      if (!isNaN(sd.getTime())) {
        where.createdAt = where.createdAt || {}
        where.createdAt.gte = sd
      }
    }
    if (endDateStr) {
      const ed = new Date(endDateStr)
      if (!isNaN(ed.getTime())) {
        ed.setHours(23, 59, 59, 999)
        where.createdAt = where.createdAt || {}
        where.createdAt.lte = ed
      }
    }
    if (category && category !== 'all') {
      where.category = category
    }
    if (matrix && matrix !== 'all') {
      // Map matrix type → matching Transaction.type values
      if (matrix === 'entrada') where.type = 'cashback_entry'
      else if (matrix === 'residual') where.type = 'cashback_residual'
      else if (matrix === 'vendas') where.type = 'cashback_sales'
    }
    if (userIdFilter) {
      where.userId = { in: Array.from(userIdFilter) }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        status: true,
        category: true,
        description: true,
        createdAt: true,
      },
    })

    // Look up user names for the userIds in the result set (for the table)
    const userIds = Array.from(
      new Set(transactions.map((t) => t.userId))
    )
    const userRows = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, qualification: true },
    })
    const userMap = new Map(
      userRows.map((u) => [
        u.id,
        {
          name: u.name,
          email: u.email,
          qualification: u.qualification || 'passageiro',
        },
      ])
    )

    // ----- Summary totals -----
    let totalEntradas = 0
    let totalSaidas = 0
    let cashbackRecebido = 0
    for (const t of transactions) {
      const amt = Number(t.amount) || 0
      const isWithdrawal = t.type === 'withdrawal'
      const isCashback = t.type.startsWith('cashback')
      if (isCashback) cashbackRecebido += Math.abs(amt)
      if (amt >= 0 && !isWithdrawal) {
        totalEntradas += amt
      } else {
        totalSaidas += Math.abs(amt)
      }
    }
    const saldo = totalEntradas - totalSaidas

    // ----- Breakdown by user type -----
    const utMap = new Map<string, { total: number; count: number }>()
    for (const t of transactions) {
      const u = userMap.get(t.userId)
      const key = u?.qualification || 'passageiro'
      const cur = utMap.get(key) || { total: 0, count: 0 }
      cur.total += Number(t.amount) || 0
      cur.count += 1
      utMap.set(key, cur)
    }
    const byUserType = Array.from(utMap.entries())
      .map(([userType, v]) => ({ userType, total: v.total, count: v.count }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    // ----- Breakdown by category -----
    const catMap = new Map<string, { total: number; count: number }>()
    for (const t of transactions) {
      const key = t.category || 'outros'
      const cur = catMap.get(key) || { total: 0, count: 0 }
      cur.total += Number(t.amount) || 0
      cur.count += 1
      catMap.set(key, cur)
    }
    const byCategory = Array.from(catMap.entries())
      .map(([category, v]) => ({ category, total: v.total, count: v.count }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    // ----- Breakdown by matrix -----
    const matMap = new Map<string, { total: number; count: number }>([
      ['entrada', { total: 0, count: 0 }],
      ['residual', { total: 0, count: 0 }],
      ['vendas', { total: 0, count: 0 }],
      ['outras', { total: 0, count: 0 }],
    ])
    for (const t of transactions) {
      let key = 'outras'
      if (t.type === 'cashback_entry') key = 'entrada'
      else if (t.type === 'cashback_residual') key = 'residual'
      else if (t.type === 'cashback_sales') key = 'vendas'
      const cur = matMap.get(key)!
      cur.total += Number(t.amount) || 0
      cur.count += 1
    }
    const byMatrix = Array.from(matMap.entries())
      .map(([matrix, v]) => ({ matrix, total: v.total, count: v.count }))
      .filter((x) => x.count > 0)

    // ----- Breakdown by month -----
    const monthMap = new Map<
      string,
      { entradas: number; saidas: number }
    >()
    for (const t of transactions) {
      const d = new Date(t.createdAt)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const cur = monthMap.get(monthKey) || { entradas: 0, saidas: 0 }
      const amt = Number(t.amount) || 0
      const isWithdrawal = t.type === 'withdrawal'
      if (amt >= 0 && !isWithdrawal) cur.entradas += amt
      else cur.saidas += Math.abs(amt)
      monthMap.set(monthKey, cur)
    }
    const byMonth = Array.from(monthMap.entries())
      .map(([month, v]) => ({
        month,
        entradas: v.entradas,
        saidas: v.saidas,
        saldo: v.entradas - v.saidas,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return success({
      summary: {
        totalEntradas,
        totalSaidas,
        saldo,
        cashbackRecebido,
        count: transactions.length,
      },
      byUserType,
      byCategory,
      byMatrix,
      byMonth,
      transactions: transactions.map((t) => {
        const u = userMap.get(t.userId)
        return {
          id: t.id,
          userId: t.userId,
          userName: u?.name || '',
          userEmail: u?.email || '',
          userType: u?.qualification || 'passageiro',
          type: t.type,
          category: t.category || 'outros',
          description: t.description || '',
          amount: Number(t.amount) || 0,
          status: t.status,
          createdAt: t.createdAt,
        }
      }),
      filters: {
        userType: userType || null,
        category: category || null,
        matrix: matrix || null,
        startDate: startDateStr || null,
        endDate: endDateStr || null,
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/reports] error:', err)
    return error('Failed to fetch admin reports', 500)
  }
}
