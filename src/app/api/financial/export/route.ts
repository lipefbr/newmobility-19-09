import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') || 'all'

    if (!userId) {
      return error('userId is required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    // Build SQL conditions
    const conditions: string[] = ['"userId" = $1']
    const params: any[] = [userId]
    let paramIdx = 1

    if (type !== 'all') {
      paramIdx++
      conditions.push(`"type" = $${paramIdx}`)
      params.push(type)
    }

    if (startDate) {
      paramIdx++
      conditions.push(`"createdAt" >= $${paramIdx}`)
      params.push(new Date(startDate))
    }

    if (endDate) {
      paramIdx++
      conditions.push(`"createdAt" <= $${paramIdx}`)
      params.push(new Date(endDate))
    }

    const whereClause = conditions.join(' AND ')
    const transactions = await db.find('Transaction', whereClause, params, 'ORDER BY "createdAt" DESC LIMIT 1000')

    if (format === 'csv') {
      // Generate CSV
      const headers = 'Data,Descrição,Tipo,Categoria,Valor (centavos),Status\n'
      const rows = (transactions as any[]).map(tx => {
        const date = tx.createdAt ? new Date(tx.createdAt).toISOString().split('T')[0] : ''
        const desc = `"${(tx.description || '').replace(/"/g, '""')}"`
        return `${date},${desc},${tx.type},${tx.category || ''},${tx.amount},${tx.status}`
      }).join('\n')

      const csv = headers + rows

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="extrato_newmobility_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return success({ transactions })
  } catch (err) {
    console.error('Financial export error:', err)
    return error('Internal server error', 500)
  }
}
