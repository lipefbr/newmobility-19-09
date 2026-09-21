import { db } from '@/lib/db'
import { success } from '@/lib/api-utils'

export async function GET() {
  try {
    const userCount = await db.count('User')
    return success({
      message: 'NewMobility API is running',
      version: '2.0.0',
      status: 'healthy',
      users: userCount,
    })
  } catch {
    return success({
      message: 'NewMobility API is running',
      version: '2.0.0',
      status: 'healthy',
    })
  }
}
