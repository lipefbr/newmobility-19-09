import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { formatBRL } from '@/lib/format'

/**
 * Escape a CSV field — wraps in double quotes if the value contains a comma,
 * double-quote, newline, or leading/trailing whitespace. Embedded double-quotes
 * are escaped by doubling them.
 */
function csvField(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return ''
  const s = String(input)
  if (/[",\n\r]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * GET /api/admin/reports/export
 *
 * Admin-only. Exports platform-wide filtered transactions as CSV.
 *
 * Query params (all optional except userId):
 *   - userId      string  required (admin auth)
 *   - userType    string  filter by User.qualification
 *   - category    string  filter by Transaction.category
 *   - matrix      string  filter by matrix type (entrada | residual | vendas)
 *   - startDate   string  ISO date — inclusive lower bound
 *   - endDate     string  ISO date — inclusive upper bound
 *
 * CSV columns: Data, Tipo, Categoria, Descrição, Valor (R$), Status, Usuário
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp = req.nextUrl.searchParams
    const userType = sp.get('userType')?.trim() || ''
    const category = sp.get('category')?.trim() || ''
    const matrix = sp.get('matrix')?.trim() || ''
    const startDateStr = sp.get('startDate')?.trim() || ''
    const endDateStr = sp.get('endDate')?.trim() || ''

    // Build a Set of userIds that match the userType filter (if any).
    let userIdFilter: Set<string> | null = null
    if (userType && userType !== 'all') {
      const matchingUsers = await prisma.user.findMany({
        where: { qualification: userType },
        select: { id: true },
      })
      userIdFilter = new Set(matchingUsers.map((u) => u.id))
    }

    const where: {
      createdAt?: { gte?: Date; lte?: Date }
      category?: string
      type?: string
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
      take: 20000,
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

    const userIds = Array.from(
      new Set(transactions.map((t) => t.userId))
    )
    const userRows = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    })
    const userMap = new Map(
      userRows.map((u) => [u.id, { name: u.name, email: u.email }])
    )

    const typeLabels: Record<string, string> = {
      credit: 'Entrada',
      debit: 'Saída',
      withdrawal: 'Saque',
      cashback_entry: 'Cashback Entrada',
      cashback_residual: 'Cashback Residual',
      cashback_sales: 'Cashback Vendas',
      payment: 'Pagamento',
      transfer: 'Transferência',
      reward: 'Recompensa',
      challenge_reward: 'Recompensa Desafio',
      plan_upgrade: 'Upgrade de Plano',
      voucher: 'Voucher',
    }

    const statusLabels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      cancelled: 'Cancelado',
      failed: 'Falhou',
    }

    const rows = transactions.map((t) => {
      const dt = new Date(t.createdAt)
      const dateStr =
        dt.toLocaleDateString('pt-BR') +
        ' ' +
        dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const u = userMap.get(t.userId)
      const userName = u ? `${u.name} <${u.email}>` : t.userId
      const typeLabel = typeLabels[t.type] || t.type
      const statusLabel = statusLabels[t.status] || t.status
      const valor = formatBRL(Number(t.amount) || 0)
      return [
        csvField(dateStr),
        csvField(typeLabel),
        csvField(t.category || 'outros'),
        csvField(t.description || ''),
        csvField(valor),
        csvField(statusLabel),
        csvField(userName),
      ].join(',')
    })

    const header = [
      'Data',
      'Tipo',
      'Categoria',
      'Descrição',
      'Valor (R$)',
      'Status',
      'Usuário',
    ].map(csvField).join(',')

    const csv = [header, ...rows].join('\r\n') + '\r\n'

    const filename = `relatorio-admin-newmobility-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/reports/export] error:', err)
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}
