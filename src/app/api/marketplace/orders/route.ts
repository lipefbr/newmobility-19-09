import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const sellerName = searchParams.get('sellerName')
    const status = searchParams.get('status')

    // For lojista view: get orders containing their products
    if (sellerName) {
      const where: any = {}
      if (status && status !== 'all') {
        where.status = status
      }

      // Find order items for products by this seller
      const sellerProducts = await prisma.marketplaceProduct.findMany({
        where: { sellerName },
        select: { id: true },
      })
      const sellerProductIds = sellerProducts.map(p => p.id)

      if (sellerProductIds.length === 0) {
        return success({ orders: [] })
      }

      const orderItems = await prisma.marketplaceOrderItem.findMany({
        where: { productId: { in: sellerProductIds } },
        include: {
          order: true,
          product: { select: { name: true, imageUrl: true, category: true, sellerName: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Group by order
      const orderMap = new Map<string, any>()
      for (const item of orderItems) {
        if (!orderMap.has(item.orderId)) {
          orderMap.set(item.orderId, {
            ...item.order,
            items: [],
          })
        }
        if (!status || status === 'all' || item.order.status === status) {
          orderMap.get(item.orderId).items.push({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            cashbackPercent: item.cashbackPercent,
            category: item.product.category,
            imageUrl: item.product.imageUrl,
            sellerName: item.product.sellerName,
          })
        }
      }

      const orders = Array.from(orderMap.values())
        .filter(o => !status || status === 'all' || o.status === status)

      return success({ orders })
    }

    // For regular user view: get their orders
    if (!userId) {
      return error('userId or sellerName is required')
    }

    const where: any = { userId }
    if (status && status !== 'all') {
      where.status = status
    }

    const orders = await prisma.marketplaceOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, imageUrl: true, category: true, sellerName: true },
            },
          },
        },
      },
    })

    // Map items to include product info at top level for frontend compatibility
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        cashbackPercent: item.cashbackPercent,
        category: item.product?.category,
        imageUrl: item.product?.imageUrl,
        sellerName: item.product?.sellerName,
      })),
    }))

    return success({ orders: ordersWithItems })
  } catch (err) {
    console.error('Marketplace orders error:', err)
    return error('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, items, shippingAddress, paymentMethod } = body

    if (!userId || !items || items.length === 0) {
      return error('userId and items are required')
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return error('User not found', 404)
    }

    // Block orders for free plan users (subscription not paid)
    if (user.plan === 'free' && user.role !== 'admin') {
      return error('Você precisa assinar um plano para comprar no marketplace. Acesse "Meu Plano" para assinar.', 403)
    }

    // Get products and calculate total
    let totalAmount = 0
    let totalCashback = 0
    const orderItemsData: any[] = []
    const productUpdates: { id: string; newStock: number }[] = []

    for (const item of items) {
      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: item.productId },
      })
      if (!product || !product.isActive) {
        return error(`Product ${item.productId} not available`, 400)
      }
      if (product.stock < item.quantity) {
        return error(`Insufficient stock for ${product.name}`, 400)
      }

      const itemTotal = product.price * item.quantity
      const itemCashback = Math.round(itemTotal * (product.cashbackPercent / 100))
      totalAmount += itemTotal
      totalCashback += itemCashback

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        cashbackPercent: product.cashbackPercent,
        userId,
      })

      productUpdates.push({ id: product.id, newStock: product.stock - item.quantity })
    }

    // If paying with balance, check first
    if (paymentMethod === 'balance' && user.balanceWithdrawal < totalAmount) {
      return error('Saldo insuficiente', 400)
    }

    // Create order
    const order = await prisma.marketplaceOrder.create({
      data: {
        userId,
        totalAmount,
        cashbackEarned: totalCashback,
        shippingAddress: shippingAddress || null,
        paymentMethod: paymentMethod || null,
        status: paymentMethod === 'balance' ? 'processing' : 'pending',
        paidAt: paymentMethod === 'balance' ? new Date() : null,
      },
    })

    // Create order items
    for (const itemData of orderItemsData) {
      await prisma.marketplaceOrderItem.create({
        data: {
          orderId: order.id,
          ...itemData,
        },
      })
    }

    // Decrease stock for all products
    for (const update of productUpdates) {
      await prisma.marketplaceProduct.update({
        where: { id: update.id },
        data: { stock: update.newStock },
      })
    }

    // If paying with balance, deduct from user
    if (paymentMethod === 'balance') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          balanceWithdrawal: user.balanceWithdrawal - totalAmount,
          balanceGratification: user.balanceGratification + totalCashback,
        },
      })

      // Create transaction
      await prisma.transaction.create({
        data: {
          userId,
          type: 'marketplace_purchase',
          amount: -totalAmount,
          status: 'approved',
          category: 'marketplace',
          description: `Compra no Marketplace - Pedido #${order.id.slice(-8)}`,
        },
      })

      // Create cashback transaction
      if (totalCashback > 0) {
        await prisma.transaction.create({
          data: {
            userId,
            type: 'cashback_sales',
            amount: totalCashback,
            status: 'approved',
            category: 'marketplace',
            description: `CashBack Marketplace - Pedido #${order.id.slice(-8)}`,
          },
        })
      }
    }

    // Get the order with items
    const orderWithItems = await prisma.marketplaceOrder.findUnique({
      where: { id: order.id },
      include: { items: true },
    })

    // ========================================================================
    // PRIORIDADE 2 — MOTOR DE CASHBACK (MATRIZ ENTRADA)
    // Compra no marketplace dispara distribuição na matriz Entrada.
    // ========================================================================
    try {
      const { triggerEntradaCashback } = await import('@/lib/cashback-engine')
      await triggerEntradaCashback({
        buyerId: userId,
        orderAmountCents: totalAmount,
        orderReferenceId: order.id,
      })
    } catch (cbErr) {
      console.warn('[Cashback Motor] Entrada distribution failed:', cbErr)
    }

    return success({ order: orderWithItems }, 201)
  } catch (err) {
    console.error('Create order error:', err)
    return error('Internal server error', 500)
  }
}
