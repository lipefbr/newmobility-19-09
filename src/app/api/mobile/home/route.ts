import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ─────────────────────────────────────────────────────────────────────────────
// /api/mobile/home
//
// Aggregates everything the /mobile/inicio home screen needs in a single
// request:
//   1. Consolidated wallet (same logic as /api/mobile/me, no duplication of
//      cashback/MMN business rules — just reads the balance columns).
//   2. User's location (address/city/state from their profile).
//   3. Promotional banners (from a `MobileBanner` table if it exists, otherwise
//      a clearly-marked default mock so the UI never breaks).
//   4. Featured products (from a `Product` / `StoreItem` table if it exists,
//      otherwise a clearly-marked mock list).
//
// The banner/product tables are designed to be administered by the future
// /admingeral panel. For now they may not exist in the schema — we detect
// this at runtime via a try/catch on the Prisma query and fall back to mock
// data. When the admin panel is built and the tables are added to the Prisma
// schema, this route will automatically serve real data with zero code
// changes.
// ─────────────────────────────────────────────────────────────────────────────

interface MockProduct {
  id: string
  name: string
  description: string
  priceCents: number
  image: string
  storeName: string
  category: string
  isMock: true
}

interface MockBanner {
  id: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  image: string
  accentColor: string
  isMock: true
}

// Default mock data — clearly flagged with isMock: true so the UI can show a
// "demonstração" badge. These will be replaced by real DB rows once the
// /admingeral panel and its Prisma models are implemented.
const MOCK_BANNERS: MockBanner[] = [
  {
    id: 'mock-banner-1',
    title: 'NewMobility',
    subtitle: 'Comida que chega rápido, do seu jeito!',
    ctaLabel: 'Peça agora',
    ctaHref: '/mobile/alimentacao',
    image: '/mobile/banners/food.jpg',
    accentColor: '#155EEF',
    isMock: true,
  },
]

const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'mock-prod-1',
    name: 'Combo Hambúrguer Clássico',
    description: 'Burger 180g + batata + refri 350ml',
    priceCents: 3290,
    image: '/mobile/products/burger.jpg',
    storeName: 'Burger House',
    category: 'Alimentação',
    isMock: true,
  },
  {
    id: 'mock-prod-2',
    name: 'Pizza Margherita',
    description: 'Molho de tomate, mussarela e manjericão',
    priceCents: 4990,
    image: '/mobile/products/pizza.jpg',
    storeName: 'Pizzaria Bella',
    category: 'Alimentação',
    isMock: true,
  },
  {
    id: 'mock-prod-3',
    name: 'Maçã Fuji 1kg',
    description: 'Maçã fresca selecionada',
    priceCents: 890,
    image: '/mobile/products/apple.jpg',
    storeName: 'Mercado Express',
    category: 'Mercado',
    isMock: true,
  },
  {
    id: 'mock-prod-4',
    name: 'Tênis Esportivo',
    description: 'Conforto e estilo para o dia a dia',
    priceCents: 19990,
    image: '/mobile/products/sneaker.jpg',
    storeName: 'Sport Store',
    category: 'Shopping',
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

    // ── 1. Wallet (same consolidation as /api/mobile/me) ───────────────────
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
      mobilityCents: user.balanceMobility || 0,
      shoppingCents: user.balanceShopping || 0,
      foodCents: user.balanceFood || 0,
      pharmacyCents: user.balancePharmacy || 0,
      gratificationCents: user.balanceGratification || 0,
      freeCents: user.balanceFree || 0,
      pendingCents: user.balancePending || 0,
    }

    // ── 2. Location ────────────────────────────────────────────────────────
    const location = {
      address: user.address || null,
      city: user.city || null,
      state: user.state || null,
      // Short label for the header "Entregar para" line
      shortLabel:
        user.city && user.state
          ? `${user.city}, ${user.state}`
          : user.city || user.state || 'São Paulo, SP',
    }

    // ── 3. Banners ─────────────────────────────────────────────────────────
    // Try to read from a MobileBanner table (future /admingeral panel).
    // If the table doesn't exist yet (Prisma throws P2021), fall back to mock.
    let banners: (MockBanner | Record<string, unknown>)[] = MOCK_BANNERS
    try {
      // @ts-expect-error — MobileBanner may not exist in the Prisma schema yet
      const rows = await prisma.mobileBanner.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 5,
      })
      if (rows && rows.length > 0) {
        banners = rows.map((r: Record<string, unknown>) => ({ ...r, isMock: false }))
      }
    } catch {
      // Table doesn't exist yet — keep mock data
    }

    // ── 4. Featured products ───────────────────────────────────────────────
    // Try Product / StoreItem tables. Fall back to mock.
    let products: (MockProduct | Record<string, unknown>)[] = MOCK_PRODUCTS
    try {
      // @ts-expect-error — Product may not exist in the Prisma schema yet
      const rows = await prisma.product.findMany({
        where: { isFeatured: true, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
      if (rows && rows.length > 0) {
        products = rows.map((r: Record<string, unknown>) => ({ ...r, isMock: false }))
      }
    } catch {
      // Table doesn't exist yet — keep mock data
    }

    // ── 5. Access control ──────────────────────────────────────────────────
    const isClient =
      (user.userType === 'usuario' || user.userType === 'cliente') &&
      !user.isDriver &&
      !user.isDelivery

    return success({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        phone: user.phone,
      },
      wallet,
      location,
      banners,
      products,
      isClient,
      // Flag so the UI knows whether banners/products are mock data
      hasMockData:
        banners.some((b) => (b as MockBanner).isMock) ||
        products.some((p) => (p as MockProduct).isMock),
    })
  } catch (err) {
    console.error('[/api/mobile/home] error:', err)
    return error('Internal server error', 500)
  }
}
