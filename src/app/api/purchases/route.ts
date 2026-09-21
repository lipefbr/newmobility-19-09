import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/purchases
//
// User-scoped purchases report. Returns "treated" purchase records (one per
// MarketplaceOrder the user placed) plus a summary block for the page header.
//
// Query params:
//   userId    (required) — scoped lookup, never returns other users' data
//   page      (optional) — 1-indexed page number, default 1
//   limit     (optional) — page size, default 20, capped at 100
//   category  (optional) — 'mobility' | 'pharmacy' | 'food' | 'shopping'
//                          (matches the category filter in purchases-page.tsx)
//   fromDate  (optional) — ISO date string, filters createdAt >= fromDate
//   toDate    (optional) — ISO date string, filters createdAt <= toDate
//
// Response shape:
//   {
//     purchases: Array<{
//       id: string
//       date: string                  // ISO timestamp of createdAt
//       item: string                  // joined product names or description
//       category: string              // normalized UI category
//       amount: number                // total paid in BRL cents
//       cashback: number              // cashback earned in BRL cents
//       status: 'paid' | 'pending' | 'shipped' | 'cancelled' | 'completed'
//       seller: string                // sellerName from product or 'NewMobility'
//     }>,
//     summary: {
//       totalSpent: number            // sum of amount across all (unfiltered) purchases
//       totalPurchases: number        // count of all (unfiltered) purchases
//       totalCashback: number         // sum of cashbackEarned across all
//       thisMonthCount: number        // count of purchases made this calendar month
//       thisMonthSpent: number        // sum of amount for this calendar month
//     },
//     pagination: { page, limit, total, totalPages }
//   }
//
// Notes:
// - This endpoint never exposes other users' data — every query is scoped to
//   the supplied `userId`. Privacy is enforced via Prisma `where: { userId }`.
// - When the user has no MarketplaceOrder rows (e.g. a brand-new account), the
//   purchases array is empty and the summary is all zeros. The frontend uses
//   this to show the empty state instead of mock data.
// - The `category` filter is normalized from the product's `category` field
//   (which may store raw values like 'electronics', 'health', 'groceries')
//   into the four UI buckets used by purchases-page.tsx.
// ─────────────────────────────────────────────────────────────────────────────

// Map the marketplace product category (free-form string from the DB) into one
// of the four buckets the purchases UI knows how to render. Anything that
// doesn't match falls into 'shopping' so the badge always has a label.
function normalizeCategory(raw: string | null | undefined): string {
  if (!raw) return 'shopping'
  const c = raw.toLowerCase().trim()
  if (c.includes('mobil') || c.includes('ride') || c.includes('corrida') || c.includes('transport')) {
    return 'mobility'
  }
  if (c.includes('farm') || c.includes('pharma') || c.includes('health') || c.includes('medic')) {
    return 'pharmacy'
  }
  if (c.includes('food') || c.includes('comida') || c.includes('restaurant') || c.includes('refeic') || c.includes('grocer') || c.includes('supermerc')) {
    return 'food'
  }
  return 'shopping'
}

// Map MarketplaceOrder.status into the canonical status the UI badge knows.
function normalizeStatus(raw: string | null | undefined): 'paid' | 'pending' | 'shipped' | 'cancelled' | 'completed' {
  const s = (raw || 'pending').toLowerCase().trim()
  if (s === 'paid' || s === 'delivered' || s === 'completed' || s === 'approved') return 'paid'
  if (s === 'shipped' || s === 'in_transit') return 'shipped'
  if (s === 'cancelled' || s === 'canceled' || s === 'rejected') return 'cancelled'
  return 'pending'
}

// Build the human-readable "item" label for an order. Joins the names of the
// items in the order into a single string. Falls back to the order id when the
// order has no items (defensive — shouldn't happen for real orders).
function buildItemLabel(items: Array<{ productName?: string | null }>): string {
  const names = items
    .map((i) => i.productName?.trim())
    .filter((n): n is string => !!n && n.length > 0)
  if (names.length === 0) return 'Compra NewMobility'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} e ${names[1]}`
  return `${names[0]} +${names.length - 1} itens`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required', 400)
    }

    // Parse + clamp pagination params.
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))
    const categoryFilter = searchParams.get('category') // 'mobility' | 'pharmacy' | 'food' | 'shopping' | null
    const fromDateStr = searchParams.get('fromDate')
    const toDateStr = searchParams.get('toDate')

    // ── Unfiltered totals for the summary header ───────────────────────────
    // The summary should always reflect the user's TOTAL purchase activity,
    // regardless of the active filter. We compute it separately from the
    // paginated list below.
    const allOrders = await prisma.marketplaceOrder.findMany({
      where: { userId },
      select: {
        id: true,
        totalAmount: true,
        cashbackEarned: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalPurchases = allOrders.length
    const totalSpent = allOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
    const totalCashback = allOrders.reduce((sum, o) => sum + (Number(o.cashbackEarned) || 0), 0)

    // "This month" = current calendar month in the server's local timezone.
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthOrders = allOrders.filter((o) => o.createdAt >= monthStart)
    const thisMonthCount = thisMonthOrders.length
    const thisMonthSpent = thisMonthOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)

    // ── Build the where clause for the paginated, filtered query ───────────
    const where: {
      userId: string
      createdAt?: { gte?: Date; lte?: Date }
    } = { userId }

    if (fromDateStr) {
      const d = new Date(fromDateStr)
      if (!isNaN(d.getTime())) {
        where.createdAt = where.createdAt || {}
        ;(where.createdAt as any).gte = d
      }
    }
    if (toDateStr) {
      const d = new Date(toDateStr)
      if (!isNaN(d.getTime())) {
        where.createdAt = where.createdAt || {}
        ;(where.createdAt as any).lte = d
      }
    }

    // Total count matching the filter (for pagination metadata). We can't use
    // prisma.marketplaceOrder.count with a category filter directly because the
    // category lives on the product (via the order items). Instead, we fetch
    // matching orders + their items, normalize the category in JS, then apply
    // the category filter in-memory before slicing for pagination.
    const matchingOrders = await prisma.marketplaceOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                category: true,
                sellerName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Normalize each order into the treated shape, then apply the category
    // filter in JS (since the category lives on the product, not the order).
    const treated = matchingOrders.map((o) => {
      const firstItem = o.items[0]
      const productCategory = firstItem?.product?.category || null
      const sellerName = firstItem?.product?.sellerName || null
      return {
        id: o.id,
        date: o.createdAt.toISOString(),
        item: buildItemLabel(
          o.items.map((i) => ({ productName: i.productName || i.product?.name }))
        ),
        category: normalizeCategory(productCategory),
        amount: Number(o.totalAmount) || 0,
        cashback: Number(o.cashbackEarned) || 0,
        status: normalizeStatus(o.status),
        seller: sellerName || 'NewMobility',
      }
    })

    const filtered = categoryFilter && categoryFilter !== 'all'
      ? treated.filter((p) => p.category === categoryFilter)
      : treated

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const startIdx = (page - 1) * limit
    const pageItems = filtered.slice(startIdx, startIdx + limit)

    return success({
      purchases: pageItems,
      summary: {
        totalSpent,
        totalPurchases,
        totalCashback,
        thisMonthCount,
        thisMonthSpent,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (err) {
    console.error('[GET /api/purchases] error:', err)
    return error('Internal server error', 500)
  }
}
