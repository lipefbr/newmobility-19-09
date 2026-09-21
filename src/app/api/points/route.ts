import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])

    if (!user) {
      return error('User not found', 404)
    }

    const pointTransactions = await db.find(
      'PointTransaction',
      '"userId" = $1',
      [userId],
      'ORDER BY "createdAt" DESC'
    ) as any[]

    // Group points by type
    const pointsByType: Record<string, number> = {}
    for (const pt of pointTransactions) {
      pointsByType[pt.type] = (pointsByType[pt.type] || 0) + pt.amount
    }

    return success({
      careerPoints: user.careerPoints,
      personalPoints: user.personalPoints,
      stars: user.stars,
      pointsByType,
      history: pointTransactions,
    })
  } catch (err) {
    console.error('Points error:', err)
    return error('Internal server error', 500)
  }
}
