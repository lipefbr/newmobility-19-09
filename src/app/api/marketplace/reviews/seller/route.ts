import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { NextRequest } from 'next/server'

// GET /api/marketplace/reviews/seller?userId=X
//   → { avgRating, count, distribution: { 5,4,3,2,1 }, recent: [...] }
// Returns the seller's public reputation derived from ALL buyer_to_seller
// reviews where revieweeId = X (across all their products). The product-level
// rating shown on cards comes from MarketplaceProduct.rating, but this endpoint
// gives the aggregate seller-level reputation that should appear on the seller's
// public profile / product listing header.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    if (!userId) {
      return error('userId is required')
    }

    const [agg, distribution, recent] = await Promise.all([
      prisma.marketplaceReview.aggregate({
        where: { revieweeId: userId, direction: 'buyer_to_seller' },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.marketplaceReview.groupBy({
        by: ['rating'],
        where: { revieweeId: userId, direction: 'buyer_to_seller' },
        _count: { rating: true },
      }),
      prisma.marketplaceReview.findMany({
        where: { revieweeId: userId, direction: 'buyer_to_seller' },
        include: {
          reviewer: { select: { id: true, name: true, profileImage: true } },
          product: { select: { id: true, name: true, imageUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const row of distribution) {
      dist[row.rating] = row._count.rating
    }

    const avg = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0
    const count = agg._count.rating || 0

    const recentMapped = recent.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      reviewerName: r.reviewer?.name || 'Usuário',
      reviewerImage: r.reviewer?.profileImage || null,
      productName: r.product?.name || null,
      productId: r.productId,
    }))

    return success({
      avgRating: avg,
      count,
      distribution: dist,
      recent: recentMapped,
    })
  } catch (err) {
    console.error('Marketplace seller reviews GET error:', err)
    return error('Internal server error', 500)
  }
}
