import { prisma } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'

// ─────────────────────────────────────────────────────────────────────────────
// /api/mobile/me
//
// Returns the authenticated user's full profile + a CONSOLIDATED wallet view
// for the NewMobility mobile app (/mobile/*).
//
// This route reads directly from the same `User` table used by the rest of the
// platform — it does NOT duplicate or recompute any cashback/MMN logic. The
// wallet balances (balanceWithdrawal, balanceShopping, etc.) are the same
// columns written by the cashback engine, career-claim route, and admin panel.
//
// The mobile app calls this on every screen that needs wallet/user data so
// there is a single source of truth (no stale Zustand cache).
//
// Auth model: the existing NewMobility backend uses a userId query param
// (stored in localStorage by the web app / WebView). A proper token-based
// session should be added in a future hardening pass — for now we follow the
// same pattern as /api/user/profile.
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

    const safeUser = sanitizeUser(user as unknown as Record<string, unknown>)

    // ── Consolidated wallet ────────────────────────────────────────────────
    // All balances are stored in CENTAVOS (integers). We expose both the raw
    // cents (for precise arithmetic) and a single `totalCents` that the mobile
    // home screen displays as the headline "Saldo".
    //
    // totalCents = sum of every SPENDABLE balance. `balancePending` is
    // excluded because it represents funds that haven't cleared yet.
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
      // MMN / career context (read-only display values — not recomputed)
      careerPoints: user.careerPoints || 0,
      personalPoints: user.personalPoints || 0,
      entradaLevel: user.entradaLevel || 0,
      residualLevel: user.residualLevel || 0,
      vendasLevel: user.vendasLevel || 0,
    }

    // ── Access control flag ────────────────────────────────────────────────
    // The mobile app is EXCLUSIVELY for `usuario/cliente` accounts.
    // `userType` is the canonical field (default "usuario"). We also check
    // isDriver / isDelivery as a secondary signal — a user flagged as driver
    // or delivery should use the future driver app, not this one.
    const isClient =
      (user.userType === 'usuario' || user.userType === 'cliente') &&
      !user.isDriver &&
      !user.isDelivery

    return success({
      user: safeUser,
      wallet,
      isClient,
      // Human-readable block reason for non-client accounts (shown in-app)
      blockReason: !isClient
        ? user.isDriver || user.userType === 'motorista'
          ? 'motorista'
          : user.isDelivery
            ? 'entregador'
            : user.userType === 'lojista'
              ? 'lojista'
              : 'outro'
        : null,
    })
  } catch (err) {
    console.error('[/api/mobile/me] error:', err)
    return error('Internal server error', 500)
  }
}
