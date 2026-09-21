import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Default points configuration
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

// GET /api/admin/points-config?userId=X
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

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

    return success({ ...result, raw: map })
  } catch (err) {
    console.error('Admin points-config GET error:', err)
    return error('Failed to fetch points configuration', 500)
  }
}

// PUT /api/admin/points-config body { userId, configs }
// configs shape: { referralPoints: 10, planUpgradePoints: 25, ... }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, configs } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!configs || typeof configs !== 'object') {
      return error('configs object is required', 400)
    }

    const updates: Promise<unknown>[] = []
    let count = 0

    for (const [key, value] of Object.entries(configs)) {
      if (typeof value !== 'number' || isNaN(value)) continue
      const storageKey = `${POINTS_KEY_PREFIX}${key}`
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: storageKey },
          update: { value: String(value) },
          create: {
            key: storageKey,
            value: String(value),
            description: `Points configuration: ${key}`,
          },
        })
      )
      count++
    }

    await Promise.all(updates)

    return success({ message: 'Points configuration updated successfully', updated: count })
  } catch (err) {
    console.error('Admin points-config PUT error:', err)
    return error('Failed to update points configuration', 500)
  }
}
