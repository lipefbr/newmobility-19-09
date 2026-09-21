import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { formatBRL } from '@/lib/format'
import { seedTalkMobiPlansIfEmpty } from '@/lib/seed-talkmobi'

/**
 * TalkMobi plans CRUD API.
 *
 *   GET    /api/talkmobi/plans              — public: lists active plans
 *   POST   /api/talkmobi/plans              — admin: create a plan
 *   PUT    /api/talkmobi/plans?id=<planId>  — admin: update a plan
 *   DELETE /api/talkmobi/plans?id=<planId>  — admin: soft-delete (isActive=false)
 *
 * Why this exists alongside /api/talkmobi/route.ts:
 * the original endpoint is read-only and only returns active plans. This
 * newer route exposes the full lifecycle (create / update / soft-delete)
 * so the backoffice can manage plans without touching the DB directly.
 * The GET shape is identical to /api/talkmobi so the front-end can swap
 * endpoints transparently.
 */

interface TalkMobiPlanDTO {
  id: string
  name: string
  dataAmount: string
  priceCents: number
  cashbackCents: number
  rewardPoints: number
  description: string | null
  features: string[]
  isPopular: boolean
  isRecommended: boolean
  sortOrder: number
  priceFormatted: string
  cashbackFormatted: string
}

/**
 * Map a raw TalkMobiPlan row to the DTO consumed by the page. The
 * `features` column is JSON-encoded in the DB; we parse defensively so a
 * malformed payload can never break the whole list.
 */
function toDTO(p: {
  id: string
  name: string
  dataAmount: string
  priceCents: number
  cashbackCents: number
  rewardPoints: number
  description: string | null
  features: string
  isPopular: boolean
  isRecommended: boolean
  sortOrder: number
}): TalkMobiPlanDTO {
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
    description: p.description ?? null,
    features,
    isPopular: p.isPopular,
    isRecommended: p.isRecommended,
    sortOrder: p.sortOrder,
    priceFormatted: formatBRL(p.priceCents),
    cashbackFormatted: formatBRL(p.cashbackCents),
  }
}

async function requireAdmin(userId: string | null | undefined) {
  if (!userId) return { ok: false as const, response: error('userId is required', 400) }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'admin') {
    return { ok: false as const, response: error('Unauthorized', 403) }
  }
  return { ok: true as const }
}

/**
 * GET /api/talkmobi/plans
 *
 * Returns all active TalkMobi plans sorted by `sortOrder`, with
 * price/cashback already formatted as BRL strings. Public — these are
 * marketing plans with no PII.
 */
export async function GET(_req: NextRequest) {
  try {
    // Auto-seed the four canonical plans if the table is empty so the
    // public marketing page is never blank on a fresh DB. The seed is
    // idempotent — it no-ops when plans already exist (just one COUNT).
    await seedTalkMobiPlansIfEmpty().catch((e) =>
      console.error('TalkMobi auto-seed failed (non-fatal):', e),
    )

    const rows = await prisma.talkMobiPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    const plans = rows.map(toDTO)
    return success({ plans })
  } catch (err) {
    console.error('TalkMobi plans GET error:', err)
    return error('Failed to fetch TalkMobi plans', 500)
  }
}

/**
 * POST /api/talkmobi/plans  (admin only)
 *
 * Creates a new plan. The caller may pass `features` either as a JSON
 * array or as a pre-encoded JSON string — we normalize to a string for
 * storage.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      id,
      name,
      dataAmount,
      priceCents,
      cashbackCents = 0,
      rewardPoints = 0,
      description = null,
      features = [],
      isPopular = false,
      isRecommended = false,
      isActive = true,
      sortOrder = 0,
    } = body ?? {}

    // userId may also be passed as a query param (e.g. when the caller
    // doesn't want to mix auth and payload) — fall back to it.
    const auth = await requireAdmin(userId ?? req.nextUrl.searchParams.get('userId'))
    if (!auth.ok) return auth.response

    if (!name || !dataAmount || priceCents === undefined) {
      return error('name, dataAmount and priceCents are required', 400)
    }
    const price = Number(priceCents)
    if (!Number.isFinite(price) || price < 0) {
      return error('priceCents must be a non-negative number', 400)
    }

    // Allow callers to pass either a string[] or an already-encoded string.
    const featuresString = Array.isArray(features)
      ? JSON.stringify(features)
      : typeof features === 'string' && features.trim().startsWith('[')
        ? features
        : JSON.stringify([])

    const planId = id || `talkmobi-${slugify(name)}-${Date.now().toString(36)}`

    const created = await prisma.talkMobiPlan.create({
      data: {
        id: planId,
        name: String(name),
        dataAmount: String(dataAmount),
        priceCents: price,
        cashbackCents: Number(cashbackCents) || 0,
        rewardPoints: Number(rewardPoints) || 0,
        description: description ?? null,
        features: featuresString,
        isPopular: Boolean(isPopular),
        isRecommended: Boolean(isRecommended),
        isActive: Boolean(isActive),
        sortOrder: Number(sortOrder) || 0,
      },
    })

    return success(toDTO(created), 201)
  } catch (err) {
    console.error('TalkMobi plans POST error:', err)
    return error('Failed to create TalkMobi plan', 500)
  }
}

/**
 * PUT /api/talkmobi/plans?id=<planId>  (admin only)
 *
 * Updates any subset of plan fields. `features` may be passed as a
 * string[] or pre-encoded string.
 */
export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('id query param is required', 400)

    const body = await req.json()
    const auth = await requireAdmin(body?.userId ?? req.nextUrl.searchParams.get('userId'))
    if (!auth.ok) return auth.response

    const existing = await prisma.talkMobiPlan.findUnique({ where: { id } })
    if (!existing) return error('TalkMobi plan not found', 404)

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.dataAmount !== undefined) data.dataAmount = String(body.dataAmount)
    if (body.priceCents !== undefined) {
      const price = Number(body.priceCents)
      if (!Number.isFinite(price) || price < 0) {
        return error('priceCents must be a non-negative number', 400)
      }
      data.priceCents = price
    }
    if (body.cashbackCents !== undefined) {
      data.cashbackCents = Number(body.cashbackCents) || 0
    }
    if (body.rewardPoints !== undefined) {
      data.rewardPoints = Number(body.rewardPoints) || 0
    }
    if (body.description !== undefined) {
      data.description = body.description ?? null
    }
    if (body.features !== undefined) {
      data.features = Array.isArray(body.features)
        ? JSON.stringify(body.features)
        : typeof body.features === 'string' && body.features.trim().startsWith('[')
          ? body.features
          : JSON.stringify([])
    }
    if (body.isPopular !== undefined) data.isPopular = Boolean(body.isPopular)
    if (body.isRecommended !== undefined) data.isRecommended = Boolean(body.isRecommended)
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0

    const updated = await prisma.talkMobiPlan.update({ where: { id }, data })
    return success(toDTO(updated))
  } catch (err) {
    console.error('TalkMobi plans PUT error:', err)
    return error('Failed to update TalkMobi plan', 500)
  }
}

/**
 * DELETE /api/talkmobi/plans?id=<planId>  (admin only)
 *
 * Soft-deletes the plan by setting `isActive = false`. We never hard-
 * delete because historical invoices/subscriptions may reference the id.
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('id query param is required', 400)

    const userId = req.nextUrl.searchParams.get('userId')
    const auth = await requireAdmin(userId)
    if (!auth.ok) return auth.response

    const existing = await prisma.talkMobiPlan.findUnique({ where: { id } })
    if (!existing) return error('TalkMobi plan not found', 404)

    const updated = await prisma.talkMobiPlan.update({
      where: { id },
      data: { isActive: false },
    })
    return success({ id: updated.id, isActive: updated.isActive })
  } catch (err) {
    console.error('TalkMobi plans DELETE error:', err)
    return error('Failed to delete TalkMobi plan', 500)
  }
}

function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
