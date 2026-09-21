import { db } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, language } = body

    if (!userId || !language) {
      return error('userId and language are required')
    }

    const validLanguages = ['pt', 'en', 'es', 'fr', 'it']
    if (!validLanguages.includes(language)) {
      return error(`Invalid language. Must be one of: ${validLanguages.join(', ')}`)
    }

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('User not found', 404)
    }

    const updatedUser = await db.update('User', '"id" = $1', { language }, [userId])

    return success(sanitizeUser(updatedUser as unknown as Record<string, unknown>))
  } catch (err) {
    console.error('Language update error:', err)
    return error('Internal server error', 500)
  }
}
