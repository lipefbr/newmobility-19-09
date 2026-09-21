import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const type = searchParams.get('type') || 'all'

    if (!userId) {
      return error('userId is required')
    }

    // Build conditions and params
    const params: any[] = [userId]
    let conditions = '"userId" = $1'

    if (type && type !== 'all') {
      params.push(type)
      conditions += ` AND "type" = $${params.length}`
    }

    const total = await db.count('Transaction', conditions, params)

    // Add pagination params
    const offset = (page - 1) * limit
    params.push(offset, limit)
    const extra = `ORDER BY "createdAt" DESC OFFSET $${params.length - 1} LIMIT $${params.length}`

    const transactions = await db.find('Transaction', conditions, params, extra)

    return success({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('Transactions error:', err)
    return error('Internal server error', 500)
  }
}
