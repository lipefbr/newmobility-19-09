import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * GET /api/reports
 *
 * Returns the current user's report data with optional filters.
 *
 * Query params (all optional except userId):
 *   - userId      string  required (auth)
 *   - category    string  filter by Transaction.category
 *   - type        string  filter by Transaction.type ('credit' | 'debit' | 'cashback_entry' | 'withdrawal' | ...)
 *   - startDate   string  ISO date — inclusive lower bound on createdAt
 *   - endDate     string  ISO date — inclusive upper bound on createdAt
 *
 * Returns:
 *   {
 *     summary: { totalEntradas, totalSaidas, saldo, cashbackRecebido, count },
 *     byCategory: [{ category, total, count }],
 *     byMonth: [{ month, entradas, saidas, saldo }],
 *     transactions: [{ id, type, category, description, amount, status, createdAt }]
 *   }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return error('Unauthorized', 401)

    const sp = req.nextUrl.searchParams
    const category = sp.get('category')?.trim() || ''
    const type = sp.get('type')?.trim() || ''
    const startDateStr = sp.get('startDate')?.trim() || ''
    const endDateStr = sp.get('endDate')?.trim() || ''

    // Build conditions
    const params: unknown[] = [session.userId]
    const parts: string[] = ['"userId" = $1']

    if (category && category !== 'all') {
      params.push(category)
      parts.push(`"category" = $${params.length}`)
    }
    if (type && type !== 'all') {
      params.push(type)
      parts.push(`"type" = $${params.length}`)
    }
    if (startDateStr) {
      const sd = new Date(startDateStr)
      if (!isNaN(sd.getTime())) {
        params.push(sd)
        parts.push(`"createdAt" >= $${params.length}`)
      }
    }
    if (endDateStr) {
      const ed = new Date(endDateStr)
      if (!isNaN(ed.getTime())) {
        // inclusive upper bound — bump to end-of-day
        ed.setHours(23, 59, 59, 999)
        params.push(ed)
        parts.push(`"createdAt" <= $${params.length}`)
      }
    }

    const conditions = parts.join(' AND ')

    const transactions = (await db.find(
      'Transaction',
      conditions,
      params,
      'ORDER BY "createdAt" DESC LIMIT 1000'
    )) as Array<{
      id: string
      type: string
      amount: number
      status: string
      category: string | null
      description: string | null
      createdAt: Date
    }>

    // Summary totals
    let totalEntradas = 0
    let totalSaidas = 0
    let cashbackRecebido = 0
    for (const t of transactions) {
      const amt = Number(t.amount) || 0
      // Treat withdrawals as saídas regardless of sign
      const isWithdrawal = t.type === 'withdrawal'
      const isCashback = t.type.startsWith('cashback')
      if (isCashback) {
        cashbackRecebido += Math.abs(amt)
      }
      if (amt >= 0 && !isWithdrawal) {
        totalEntradas += amt
      } else {
        totalSaidas += Math.abs(amt)
      }
    }
    const saldo = totalEntradas - totalSaidas

    // Breakdown by category
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

    // Breakdown by month (YYYY-MM)
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
      byCategory,
      byMonth,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        category: t.category || 'outros',
        description: t.description || '',
        amount: Number(t.amount) || 0,
        status: t.status,
        createdAt: t.createdAt,
      })),
      filters: {
        category: category || null,
        type: type || null,
        startDate: startDateStr || null,
        endDate: endDateStr || null,
      },
    })
  } catch (err) {
    console.error('[GET /api/reports] error:', err)
    return error('Failed to fetch reports', 500)
  }
}
