import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// GET /api/admin/system-settings/single?key=X&userId=Y
// Retorna o valor de uma única config pelo key.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const key = req.nextUrl.searchParams.get('key')
    if (!userId) return error('userId is required', 400)
    if (!key) return error('key is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const config = await prisma.systemConfig.findUnique({
      where: { key },
      select: { key: true, value: true, description: true, category: true },
    })
    return success(config || { key, value: null, description: null, category: null })
  } catch (err) {
    console.error('Single config GET error:', err)
    return error('Failed to fetch config', 500)
  }
}
