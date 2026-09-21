import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/content-texts — PUBLIC read-only endpoint
// ----------------------------------------------------------------------------
// Returns a flat { [key]: value } object for easy frontend lookup. Optionally
// filtered by ?category=X. Used by src/lib/content-texts.ts to populate the
// client-side cache that powers the getText(key, fallback) helper.
// ============================================================================

// GET /api/content-texts?category=<optional>
export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category') || undefined

    const items = await prisma.systemConfig.findMany({
      where: category ? { category } : undefined,
      select: { key: true, value: true },
    })

    const map: Record<string, string> = {}
    for (const it of items) {
      map[it.key] = it.value
    }

    return success(map)
  } catch (err) {
    console.error('Public content-texts GET error:', err)
    return error('Failed to fetch content texts', 500)
  }
}
