import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ─────────────────────────────────────────────────────────────────────────────
// /api/motorista/home
//
// Aggregates everything /motorista/inicio needs in one request:
//   1. Driver profile (name, avatar, vehicle)
//   2. Wallet (consolidated, real balances from cashback/MMN)
//   3. Driver stats (totalRides, stars, mock today/week earnings)
//   4. Recent rides (mock until a Ride model exists — flagged isMock)
//   5. Access control flag (isDriver)
//
// The "online" status is NOT persisted here — it is a transient client-side
// state (the driver toggles it on the home screen). In a future iteration we
// can persist it on the User (e.g. driverOnlineUntil) or in a Redis-like
// store so dispatch can find available drivers.
// ─────────────────────────────────────────────────────────────────────────────

interface MockRide {
  id: string
  type: 'corrida' | 'entrega'
  passengerName: string
  origin: string
  destination: string
  distanceKm: number
  durationMin: number
  priceCents: number
  status: 'completed'
  completedAt: string
  isMock: true
}

const MOCK_RIDES: MockRide[] = [
  {
    id: 'mock-ride-1',
    type: 'corrida',
    passengerName: 'Ana Paula',
    origin: 'Shopping Iguatemi',
    destination: 'Av. Paulista, 1000',
    distanceKm: 3.2,
    durationMin: 14,
    priceCents: 1890,
    status: 'completed',
    completedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    isMock: true,
  },
  {
    id: 'mock-ride-2',
    type: 'entrega',
    passengerName: 'Burger House',
    origin: 'Burger House - Pinheiros',
    destination: 'R. dos Pinheiros, 500',
    distanceKm: 1.8,
    durationMin: 9,
    priceCents: 990,
    status: 'completed',
    completedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    isMock: true,
  },
  {
    id: 'mock-ride-3',
    type: 'corrida',
    passengerName: 'Carlos Eduardo',
    origin: 'Parque Ibirapuera',
    destination: 'Aeroporto de Congonhas',
    distanceKm: 7.5,
    durationMin: 22,
    priceCents: 3490,
    status: 'completed',
    completedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
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

    const isDriverAccount =
      user.isDriver === true || user.userType === 'motorista'

    const wallet = {
      totalCents:
        (user.balanceWithdrawal || 0) +
        (user.balanceMobility || 0) +
        (user.balanceGratification || 0) +
        (user.balanceFree || 0),
      withdrawalCents: user.balanceWithdrawal || 0,
      mobilityCents: user.balanceMobility || 0,
      gratificationCents: user.balanceGratification || 0,
      freeCents: user.balanceFree || 0,
    }

    const stats = {
      totalRides: user.totalRides || 0,
      stars: user.stars || 0,
      todayEarningsCents: 0,
      weekEarningsCents: 0,
      acceptanceRate: 0,
      isMock: true,
    }

    const vehicle = {
      model: null,
      plate: null,
      color: null,
      year: null,
      type: null,
      isMock: true,
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
      stats,
      vehicle,
      recentRides: MOCK_RIDES,
      isDriver: isDriverAccount,
      blockReason: !isDriverAccount
        ? user.userType === 'lojista'
          ? 'lojista'
          : user.isDelivery
            ? 'entregador'
            : 'cliente'
        : null,
    })
  } catch (err) {
    console.error('[/api/motorista/home] error:', err)
    return error('Internal server error', 500)
  }
}
