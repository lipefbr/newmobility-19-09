import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ─────────────────────────────────────────────────────────────────────────────
// /api/lojista/home
//
// Aggregates everything /lojista/inicio needs in one request:
//   1. Store-owner profile (name, avatar, phone)
//   2. Store profile (name, category, logo, isOpen, rating) — mock until a
//      Store model exists, flagged isMock
//   3. Wallet (consolidated, real balances from cashback/MMN)
//   4. Today sales summary (orders count + revenue) — mock until an Order
//      model exists, flagged isMock
//   5. Recent orders list (last 3-5) — mock until an Order model exists
//   6. Access control flag (isLojista)
//
// The "open/closed" store status is NOT persisted here — it is a transient
// client-side state (the lojista toggles it on the home screen), exactly like
// the motorista "online" toggle. In a future iteration we can persist it on
// the Store row (e.g. isOpenUntil) so the customer app can filter open stores.
// ─────────────────────────────────────────────────────────────────────────────

interface MockOrder {
  id: string
  number: string
  customerName: string
  itemsSummary: string
  priceCents: number
  status: 'preparo' | 'entrega' | 'entregue' | 'cancelado'
  minutesAgo: number
  isMock: true
}

interface MockStore {
  id: string
  name: string
  category: string
  logo: string | null
  isVerified: boolean
  rating: number
  totalOrders: number
  isMock: true
}

interface MockSalesSummary {
  todayRevenueCents: number
  todayOrders: number
  deltaPctVsYesterday: number
  weekRevenueCents: number
  isMock: true
}

// Default mock data — clearly flagged with isMock: true so the UI can show a
// "demonstração" badge. These will be replaced by real DB rows once the
// /admingeral panel and its Prisma models (Store, Order) are implemented.
const MOCK_STORE: MockStore = {
  id: 'mock-store-1',
  name: 'Burger House',
  category: 'Lanchonaria · Alimentação',
  logo: null,
  isVerified: true,
  rating: 4.8,
  totalOrders: 1240,
  isMock: true,
}

const MOCK_SALES: MockSalesSummary = {
  todayRevenueCents: 124890,
  todayOrders: 32,
  deltaPctVsYesterday: 12.5,
  weekRevenueCents: 843050,
  isMock: true,
}

const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'mock-order-4582',
    number: '4582',
    customerName: 'Ana Paula',
    itemsSummary: '1x Combo Hambúrguer Clássico',
    priceCents: 3290,
    status: 'preparo',
    minutesAgo: 0,
    isMock: true,
  },
  {
    id: 'mock-order-4581',
    number: '4581',
    customerName: 'Carlos Eduardo',
    itemsSummary: '1x Pizza Margherita Média',
    priceCents: 4990,
    status: 'entrega',
    minutesAgo: 5,
    isMock: true,
  },
  {
    id: 'mock-order-4580',
    number: '4580',
    customerName: 'Mariana Souza',
    itemsSummary: '2x Batata Frita',
    priceCents: 2580,
    status: 'entregue',
    minutesAgo: 22,
    isMock: true,
  },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required', 401)
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return error('Usuário não encontrado', 404)
    }

    const isLojistaAccount =
      user.userType === 'lojista' || user.isDelivery === true

    const wallet = {
      totalCents:
        (user.balanceWithdrawal || 0) +
        (user.balanceMobility || 0) +
        (user.balanceShopping || 0) +
        (user.balanceFood || 0) +
        (user.balancePharmacy || 0) +
        (user.balanceGratification || 0) +
        (user.balanceFree || 0),
      withdrawalCents: user.balanceWithdrawal || 0,
      foodCents: user.balanceFood || 0,
      shoppingCents: user.balanceShopping || 0,
      pendingCents: user.balancePending || 0,
    }

    // ── Store profile ──────────────────────────────────────────────────────
    // Try to read from a Store table (future /admingeral panel). If the table
    // doesn't exist yet (Prisma throws P2021), fall back to mock.
    let store: MockStore | Record<string, unknown> = MOCK_STORE
    try {
      // @ts-expect-error — Store may not exist in the Prisma schema yet
      const row = await prisma.store.findFirst({
        where: { ownerId: user.id },
      })
      if (row) {
        store = { ...row, isMock: false }
      }
    } catch {
      // Table doesn't exist yet — keep mock data
    }

    // ── Today sales summary (mock) ─────────────────────────────────────────
    // Will be replaced by a real aggregation from an Order table once it
    // exists. For now we return a clearly-flagged mock.
    let sales: MockSalesSummary | Record<string, unknown> = MOCK_SALES
    try {
      // @ts-expect-error — Order may not exist in the Prisma schema yet
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      // @ts-expect-error — Order may not exist in the Prisma schema yet
      const rows = await prisma.order.findMany({
        // @ts-expect-error — Order may not exist in the Prisma schema yet
        where: { storeId: (store as { id?: string }).id, createdAt: { gte: todayStart } },
      })
      if (rows && rows.length > 0) {
        const todayRevenueCents = rows.reduce(
          (sum: number, r: { priceCents?: number; totalCents?: number }) =>
            sum + (r.priceCents || r.totalCents || 0),
          0,
        )
        sales = {
          todayRevenueCents,
          todayOrders: rows.length,
          deltaPctVsYesterday: 0,
          weekRevenueCents: todayRevenueCents,
          isMock: false,
        }
      }
    } catch {
      // Table doesn't exist yet — keep mock data
    }

    // ── Recent orders (mock) ───────────────────────────────────────────────
    let orders: MockOrder[] | Record<string, unknown>[] = MOCK_ORDERS
    try {
      // @ts-expect-error — Order may not exist in the Prisma schema yet
      const rows = await prisma.order.findMany({
        // @ts-expect-error — Order may not exist in the Prisma schema yet
        where: { storeId: (store as { id?: string }).id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
      if (rows && rows.length > 0) {
        orders = rows.map((r: Record<string, unknown>) => ({ ...r, isMock: false }))
      }
    } catch {
      // Table doesn't exist yet — keep mock data
    }

    return success({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        phone: user.phone,
      },
      wallet,
      store,
      sales,
      orders,
      isLojista: isLojistaAccount,
      isDelivery: user.isDelivery === true,
      hasMockData:
        (store as MockStore).isMock === true ||
        (sales as MockSalesSummary).isMock === true ||
        orders.some((o) => (o as MockOrder).isMock === true),
      blockReason: !isLojistaAccount
        ? user.isDriver || user.userType === 'motorista'
          ? 'motorista'
          : user.userType === 'usuario' || user.userType === 'cliente'
            ? 'cliente'
            : 'outro'
        : null,
    })
  } catch (err) {
    console.error('[/api/lojista/home] error:', err)
    return error('Internal server error', 500)
  }
}
