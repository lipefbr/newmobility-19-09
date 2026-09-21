import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Default points configuration (must match /api/admin/points-config)
const DEFAULT_POINTS_CONFIG: Record<string, number> = {
  referralPoints: 10,           // points earned per new referral
  planUpgradePoints: 25,        // points earned per plan upgrade
  dailyLoginPoints: 1,          // points earned for daily login streak
  betPlacedPoints: 1,           // points earned per bet placed
  betWonPoints: 5,              // points earned per winning bet
  marketplacePurchasePoints: 2, // points earned per marketplace order
  ticketResolvedPoints: 1,      // points earned when admin resolves a support ticket
  rideCompletedPoints: 1,       // points earned per completed ride (driver)
  challengeCompletedPoints: 10, // points earned per completed challenge
}

const POINTS_KEY_PREFIX = 'points_'

// GET /api/points/config?userId=X
// Public endpoint: any logged-in user can read the points configuration.
// Returns the same data as /api/admin/points-config but without admin auth.
// The displayed values update automatically when admin changes the config.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')

    // If userId is provided, verify the user exists (soft auth: any logged-in user can read).
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      })
      if (!user) return error('User not found', 404)
    }

    const rows = await prisma.systemConfig.findMany({
      where: { key: { startsWith: POINTS_KEY_PREFIX } },
    })
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value

    const result: Record<string, number> = {}
    for (const [key, defaultValue] of Object.entries(DEFAULT_POINTS_CONFIG)) {
      const storedKey = `${POINTS_KEY_PREFIX}${key}`
      const raw = map[storedKey] ?? String(defaultValue)
      const parsed = parseFloat(raw)
      result[key] = isNaN(parsed) ? defaultValue : parsed
    }

    // Friendly, UI-ready list of "how to earn points" entries (Portuguese labels
    // matching the backoffice "Como Ganhar Pontos" section).
    const howToEarn = [
      { key: 'referralPoints', label: 'Indicar um amigo', icon: 'Users' },
      { key: 'planUpgradePoints', label: 'Upgrade de plano', icon: 'Zap' },
      { key: 'dailyLoginPoints', label: 'Login diário', icon: 'Flame' },
      { key: 'betPlacedPoints', label: 'Apostar', icon: 'Target' },
      { key: 'betWonPoints', label: 'Aposta vencedora', icon: 'Trophy' },
      { key: 'marketplacePurchasePoints', label: 'Compra no marketplace', icon: 'ShoppingCart' },
      { key: 'rideCompletedPoints', label: 'Corrida concluída', icon: 'Car' },
      { key: 'challengeCompletedPoints', label: 'Desafio concluído', icon: 'Award' },
      { key: 'ticketResolvedPoints', label: 'Ticket resolvido', icon: 'LifeBuoy' },
    ].map((item) => ({
      ...item,
      points: result[item.key] ?? 0,
    }))

    return success({ config: result, howToEarn })
  } catch (err) {
    console.error('Public points-config GET error:', err)
    return error('Failed to fetch points configuration', 500)
  }
}
