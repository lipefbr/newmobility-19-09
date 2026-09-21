import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { NextRequest } from 'next/server'

// GET /api/marketplace/reviews?productId=X
//   → { reviews: [{ id, rating, comment, createdAt, reviewerName, direction }] }
// Only returns buyer_to_seller reviews (the public reputation of a seller for a product).
// seller_to_buyer reviews are private between the two parties and not listed here.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return error('productId is required')
    }

    const reviews = await prisma.marketplaceReview.findMany({
      where: {
        productId,
        direction: 'buyer_to_seller',
      },
      include: {
        reviewer: {
          select: { id: true, name: true, profileImage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const mapped = reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      orderId: r.orderId,
      rating: r.rating,
      comment: r.comment,
      direction: r.direction,
      createdAt: r.createdAt,
      reviewerName: r.reviewer?.name || 'Usuário',
      reviewerImage: r.reviewer?.profileImage || null,
    }))

    return success({ reviews: mapped })
  } catch (err) {
    console.error('Marketplace reviews GET error:', err)
    return error('Internal server error', 500)
  }
}

// POST /api/marketplace/reviews
// Body: { orderId, productId, reviewerId, direction, rating, comment? }
// Validates that the reviewer actually has a completed order for that product
// (status 'paid' or 'delivered' — MarketplaceOrder.status uses 'delivered',
// but we accept 'paid' as well for forward-compat), then creates the review.
// Also updates the MarketplaceProduct.rating + reviewCount cache for
// buyer_to_seller reviews (the public product rating).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, productId, reviewerId, direction, rating, comment } = body

    if (!orderId || !productId || !reviewerId || !direction) {
      return error('orderId, productId, reviewerId, and direction are required')
    }
    if (direction !== 'buyer_to_seller' && direction !== 'seller_to_buyer') {
      return error("direction must be 'buyer_to_seller' or 'seller_to_buyer'")
    }
    const ratingNum = parseInt(rating, 10)
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return error('rating must be an integer between 1 and 5')
    }
    if (comment && typeof comment !== 'string') {
      return error('comment must be a string')
    }

    // 1) Fetch the order with its items and the product (for sellerName).
    const order = await prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
      include: {
        items: { select: { id: true, productId: true, userId: true } },
      },
    })
    if (!order) {
      return error('Order not found', 404)
    }

    // 2) Order must be completed before allowing a review.
    //    Accept both 'paid' (forward-compat) and 'delivered'.
    if (order.status !== 'paid' && order.status !== 'delivered') {
      return error(
        `Só é possível avaliar pedidos entregues (status atual: ${order.status}).`,
        400,
      )
    }

    // 3) Verify the product belongs to this order.
    const matchingItem = order.items.find((it) => it.productId === productId)
    if (!matchingItem) {
      return error('Product does not belong to this order', 400)
    }

    // 4) Fetch the product to resolve the seller's name.
    const product = await prisma.marketplaceProduct.findUnique({
      where: { id: productId },
      select: { id: true, sellerName: true, rating: true, reviewCount: true },
    })
    if (!product) {
      return error('Product not found', 404)
    }

    // 5) Resolve reviewer & reviewee based on direction.
    let revieweeId: string | null = null
    if (direction === 'buyer_to_seller') {
      // Reviewer must be the buyer (order.userId).
      if (order.userId !== reviewerId) {
        return error('Only the buyer of this order can rate the seller.', 403)
      }
      // Reviewee = the seller (resolved via sellerName → User lookup).
      if (!product.sellerName) {
        return error('Seller not identified for this product', 400)
      }
      const seller = await prisma.user.findFirst({
        where: { name: product.sellerName },
        select: { id: true },
      })
      if (!seller) {
        return error('Seller account not found', 404)
      }
      revieweeId = seller.id
    } else {
      // seller_to_buyer: reviewer = seller, reviewee = buyer (order.userId).
      if (!product.sellerName) {
        return error('Seller not identified for this product', 400)
      }
      const seller = await prisma.user.findFirst({
        where: { name: product.sellerName },
        select: { id: true },
      })
      if (!seller) {
        return error('Seller account not found', 404)
      }
      if (seller.id !== reviewerId) {
        return error('Only the seller of this product can rate the buyer.', 403)
      }
      revieweeId = order.userId
    }

    if (!revieweeId) {
      return error('Could not determine the reviewee', 400)
    }
    if (revieweeId === reviewerId) {
      return error('You cannot review yourself', 400)
    }

    // 6) Create the review (the @@unique([orderId, direction]) constraint
    //    prevents double-reviewing the same direction).
    let review
    try {
      review = await prisma.marketplaceReview.create({
        data: {
          productId,
          orderId,
          reviewerId,
          revieweeId,
          direction,
          rating: ratingNum,
          comment: comment?.trim() ? comment.trim() : null,
        },
      })
    } catch (e: any) {
      // Prisma P2002 = unique constraint violation
      if (e?.code === 'P2002') {
        return error('Esta direção já foi avaliada para este pedido.', 409)
      }
      throw e
    }

    // 7) If this is a buyer_to_seller review, update the product's
    //    cached rating + reviewCount so the marketplace grid shows real data.
    if (direction === 'buyer_to_seller') {
      const agg = await prisma.marketplaceReview.aggregate({
        where: { productId, direction: 'buyer_to_seller' },
        _avg: { rating: true },
        _count: { rating: true },
      })
      await prisma.marketplaceProduct.update({
        where: { id: productId },
        data: {
          rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
          reviewCount: agg._count.rating || 0,
        },
      })
    }

    return success({ review }, 201)
  } catch (err) {
    console.error('Marketplace reviews POST error:', err)
    return error('Internal server error', 500)
  }
}
