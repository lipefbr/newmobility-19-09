import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { formatBRL } from '@/lib/format'

/**
 * GET /api/talkmobi
 *
 * Returns all active TalkMobi plans sorted by their `sortOrder` field,
 * with their price/cashback already formatted as BRL strings (so the
 * front-end doesn't need to import formatBRL itself).
 *
 * No session required — these are public marketing plans visible to
 * logged-in and anonymous users alike (the surrounding backoffice is
 * auth-gated, but the plan list itself contains no PII).
 */
export async function GET(_req: NextRequest) {
  try {
    const rows = await prisma.talkMobiPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    const plans = rows.map((p) => {
      // Parse the JSON-encoded `features` array stored on the plan. The
      // column is typed as String in Prisma (default "[]"), so we parse
      // defensively and fall back to [] on any malformed payload.
      let features: string[] = []
      try {
        const parsed = JSON.parse(p.features || '[]')
        if (Array.isArray(parsed)) {
          features = parsed.map((f) => String(f)).filter(Boolean)
        }
      } catch {
        features = []
      }

      return {
        id: p.id,
        name: p.name,
        dataAmount: p.dataAmount,
        priceCents: p.priceCents,
        cashbackCents: p.cashbackCents,
        rewardPoints: p.rewardPoints,
        features,
        isPopular: p.isPopular,
        isRecommended: p.isRecommended,
        sortOrder: p.sortOrder,
        priceFormatted: formatBRL(p.priceCents),
        cashbackFormatted: formatBRL(p.cashbackCents),
      }
    })

    return success({ plans })
  } catch (err) {
    console.error('TalkMobi GET error:', err)
    return error('Failed to fetch TalkMobi plans', 500)
  }
}
