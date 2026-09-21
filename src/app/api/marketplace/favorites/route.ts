import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { NextRequest } from 'next/server'

// GET /api/marketplace/favorites?userId=X
//   → { favorites: [{ id, productId, createdAt, product: {...} }] }
// Returns the user's favorited products, newest first.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    if (!userId) {
      return error('userId is required')
    }

    const favorites = await prisma.marketplaceFavorite.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return success({
      favorites: favorites.map((f) => ({
        id: f.id,
        productId: f.productId,
        createdAt: f.createdAt,
        product: f.product,
      })),
    })
  } catch (err) {
    console.error('Marketplace favorites GET error:', err)
    return error('Internal server error', 500)
  }
}

// POST /api/marketplace/favorites
// Body: { userId, productId }
// Toggles the favorite: if it exists, removes it; if it doesn't, creates it.
// Returns { favorited: boolean, favorite?: {...} }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, productId } = body
    if (!userId || !productId) {
      return error('userId and productId are required')
    }

    // Validate that the user and product exist.
    const [user, product] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.marketplaceProduct.findUnique({ where: { id: productId }, select: { id: true } }),
    ])
    if (!user) return error('User not found', 404)
    if (!product) return error('Product not found', 404)

    const existing = await prisma.marketplaceFavorite.findUnique({
      where: { userId_productId: { userId, productId } },
    })

    if (existing) {
      await prisma.marketplaceFavorite.delete({ where: { id: existing.id } })
      return success({ favorited: false })
    }

    const favorite = await prisma.marketplaceFavorite.create({
      data: { userId, productId },
    })
    return success({ favorited: true, favorite }, 201)
  } catch (err) {
    console.error('Marketplace favorites POST error:', err)
    return error('Internal server error', 500)
  }
}
