import { prisma } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'

// ─────────────────────────────────────────────────────────────────────────────
// /api/motorista/me
//
// Returns the authenticated driver's profile + a consolidated view for the
// /motorista app. Mirrors the pattern used by /api/mobile/me but for the
// MOTORISTA surface.
//
// Access control: only accounts flagged as driver (isDriver=true OR
// userType='motorista') may use this app. Client (usuario) and lojista
// accounts are blocked and shown an in-app block screen — they have their
// own apps (/mobile and /lojista respectively).
//
// The wallet balances come from the SAME User columns used by the cashback/MMN
// engine — we never recompute or duplicate them.
// ─────────────────────────────────────────────────────────────────────────────

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

    // ── Access control ──────────────────────────────────────────────────────
    // A motorista account is one where isDriver=true OR userType='motorista'.
    // We deliberately allow both signals so an admin can flip either flag.
    const isDriverAccount =
      user.isDriver === true || user.userType === 'motorista'

    const safeUser = sanitizeUser(user as unknown as Record<string, unknown>)

    // ── Consolidated wallet (same logic as /api/mobile/me) ──────────────────
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
      pendingCents: user.balancePending || 0,
    }

    // ── Driver stats (read-only display values) ─────────────────────────────
    // totalRides is a real counter on User. Today/week earnings and rating are
    // mock until the rides engine is built — flagged with isMock so the UI can
    // show a "demo" badge honestly.
    const stats = {
      totalRides: user.totalRides || 0,
      stars: user.stars || 0,
      // Mock earnings — will be replaced by real aggregation from a Rides table
      todayEarningsCents: 0,
      weekEarningsCents: 0,
      acceptanceRate: 0,
      isMock: true,
    }

    // ── Vehicle info ────────────────────────────────────────────────────────
    // No Vehicle model exists yet in the schema. We expose whatever fields the
    // User already has (none specific) plus a clearly-mocked placeholder so
    // the UI never breaks. When the /admingeral panel adds a Vehicle model
    // and the admin approves driver documents, this will be replaced with a
    // real lookup.
    const vehicle = {
      model: null, // e.g. "Honda CG 160"
      plate: null, // e.g. "ABC1D23"
      color: null,
      year: null,
      type: null, // 'moto' | 'carro' | 'utilitario'
      isMock: true,
    }

    return success({
      user: safeUser,
      wallet,
      stats,
      vehicle,
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
    console.error('[/api/motorista/me] error:', err)
    return error('Internal server error', 500)
  }
}
