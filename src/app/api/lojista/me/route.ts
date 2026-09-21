import { prisma } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'

// ─────────────────────────────────────────────────────────────────────────────
// /api/lojista/me
//
// Returns the authenticated store-owner's profile + a consolidated view for
// the /lojista app (the "Painel da Loja" surface).
//
// Access control: ONLY accounts flagged as lojista (userType='lojista') OR
// food-delivery merchants (isDelivery=true) may use this app.
//   - Client (usuario/cliente) accounts → blocked, directed to /mobile
//   - Driver (isDriver / userType='motorista') accounts → blocked, directed
//     to /motorista
//
// The wallet balances come from the SAME User columns used by the cashback/MMN
// engine — we never recompute or duplicate them. The store profile (name,
// category, logo, isOpen) is mock until a Store model exists in the Prisma
// schema — flagged with isMock so the UI shows a "demo" badge honestly.
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
    // A lojista account is one where userType='lojista' OR isDelivery=true
    // (food-delivery merchants use the same store-owner dashboard).
    const isLojistaAccount =
      user.userType === 'lojista' || user.isDelivery === true

    const safeUser = sanitizeUser(user as unknown as Record<string, unknown>)

    // ── Consolidated wallet (same logic as /api/mobile/me) ──────────────────
    // The lojista primarily cares about balanceWithdrawal (what they can
    // payout) + balanceFood (their food-delivery cashback). We still expose
    // the full breakdown for the /lojista/financeiro screen.
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

    // ── Store profile (mock until a Store model exists) ─────────────────────
    // No Store model in the Prisma schema yet. We expose a clearly-mocked
    // placeholder so the UI never breaks. When the /admingeral panel adds a
    // Store model and approves store documents, this will be replaced with a
    // real lookup (prisma.store.findFirst({ where: { ownerId: user.id } })).
    const store = {
      id: null,
      name: null, // e.g. "Burger House"
      category: null, // e.g. "Alimentação"
      logo: null,
      isVerified: false,
      isOpen: false,
      rating: 0,
      totalOrders: 0,
      isMock: true,
    }

    return success({
      user: safeUser,
      wallet,
      store,
      isLojista: isLojistaAccount,
      isDelivery: user.isDelivery === true,
      // Human-readable block reason for non-lojista accounts (shown in-app)
      blockReason: !isLojistaAccount
        ? user.isDriver || user.userType === 'motorista'
          ? 'motorista'
          : user.userType === 'usuario' || user.userType === 'cliente'
            ? 'cliente'
            : 'outro'
        : null,
    })
  } catch (err) {
    console.error('[/api/lojista/me] error:', err)
    return error('Internal server error', 500)
  }
}
