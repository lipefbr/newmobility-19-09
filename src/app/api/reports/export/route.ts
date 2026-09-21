import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { formatBRL } from '@/lib/format'

/**
 * Escape a CSV field — wraps in double quotes if the value contains a comma,
 * double-quote, newline, or leading/trailing whitespace. Embedded double-quotes
 * are escaped by doubling them ("").
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
 * GET /api/reports/export
 *
 * Exports the current user's transactions as a CSV file.
 *
 * Query params (all optional except userId):
 *   - userId      string  required (auth)
 *   - category    string  filter by Transaction.category
 *   - type        string  filter by Transaction.type
 *   - startDate   string  ISO date — inclusive lower bound
 *   - endDate     string  ISO date — inclusive upper bound
 *
 * Returns:
 *   Content-Type: text/csv
 *   Content-Disposition: attachment; filename="relatorio-newmobility-YYYY-MM-DD.csv"
 *
 * CSV columns: Data, Tipo, Categoria, Descrição, Valor (R$), Status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sp = req.nextUrl.searchParams
    const category = sp.get('category')?.trim() || ''
    const type = sp.get('type')?.trim() || ''
    const startDateStr = sp.get('startDate')?.trim() || ''
    const endDateStr = sp.get('endDate')?.trim() || ''

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
      'ORDER BY "createdAt" DESC LIMIT 10000'
    )) as Array<{
      id: string
      type: string
      amount: number
      status: string
      category: string | null
      description: string | null
      createdAt: Date
    }>

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
      const dateStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
      ].join(',')
    })

    const header = [
      'Data',
      'Tipo',
      'Categoria',
      'Descrição',
      'Valor (R$)',
      'Status',
    ].map(csvField).join(',')

    const csv = [header, ...rows].join('\r\n') + '\r\n'

    const filename = `relatorio-newmobility-${new Date()
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
    console.error('[GET /api/reports/export] error:', err)
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}
