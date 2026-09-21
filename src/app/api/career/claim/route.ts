import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// POST /api/career/claim
// Body: { userId, planId }
//
// BACK-9 — lets a user claim a career plan's gratification once they have
// reached the plan's minPoints threshold. On claim:
//   - Credits `rewardWithdrawalCents` to user.balanceWithdrawal
//   - Credits `rewardShoppingCents`   to user.balanceShopping
//   - Credits `rewardPoints`          to user.careerPoints (additive)
//   - Creates a Gratification row with type='career_claim', referenceId=planId,
//     isClaimed=true (so it shows in "Gratificações Desbloqueadas")
// The endpoint is idempotent: if a Gratification with type='career_claim' and
// referenceId=planId already exists for this user, the request returns 409
// "Gratificação já reivindicada" without crediting anything again.
//
// NOTE: The Gratification model does not have a `referenceId` column, so we
// store the planId inside `description` using the format
// `[plan:<planId>] <planName>` and look it up by string-prefix matching.
const CLAIM_TYPE = 'career_claim'

function buildClaimDescription(planId: string, planName: string): string {
  return `[plan:${planId}] ${planName}`
}

function extractPlanIdFromDescription(desc: string | null): string | null {
  if (!desc) return null
  const match = desc.match(/^\[plan:([^\]]+)\]/)
  return match ? match[1] : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, planId } = body

    if (!userId || !planId) {
      return error('userId e planId são obrigatórios', 400)
    }

    // Fetch the user and the plan in parallel.
    const [user, plan] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          careerPoints: true,
          balanceWithdrawal: true,
          balanceShopping: true,
        },
      }),
      prisma.careerPlan.findUnique({ where: { id: planId } }),
    ])

    if (!user) return error('Usuário não encontrado', 404)
    if (!plan) return error('Plano de carreira não encontrado', 404)
    if (!plan.isActive) return error('Plano inativo', 400)

    // Check threshold.
    const careerPoints = Number(user.careerPoints || 0)
    if (careerPoints < plan.minPoints) {
      return error(
        `Pontos insuficientes. Você precisa de ${plan.minPoints} pts e tem ${careerPoints} pts.`,
        400
      )
    }

    // Idempotency check — look up any previously-claimed gratification for
    // this plan by this user. The Gratification table has no `referenceId`
    // column, so we encode the planId in the description prefix and scan the
    // user's career_claim gratifications.
    const existingClaims = await prisma.gratification.findMany({
      where: { userId, type: CLAIM_TYPE, isClaimed: true },
      select: { description: true },
    })
    const alreadyClaimed = existingClaims.some((g) =>
      extractPlanIdFromDescription(g.description) === planId
    )
    if (alreadyClaimed) {
      return error('Gratificação já reivindicada', 409)
    }

    // Credit the rewards. We do this inside a single Prisma transaction so a
    // partial failure (e.g. gratification insert fails after balance update)
    // leaves the database in a consistent state.
    const withdrawalCents = Number(plan.rewardWithdrawalCents || 0)
    const shoppingCents = Number(plan.rewardShoppingCents || 0)
    const pointsReward = Number(plan.rewardPoints || 0)

    const [updatedUser, gratification] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          balanceWithdrawal: { increment: withdrawalCents },
          balanceShopping: { increment: shoppingCents },
          careerPoints: { increment: pointsReward },
        },
        select: {
          id: true,
          balanceWithdrawal: true,
          balanceShopping: true,
          careerPoints: true,
        },
      }),
      prisma.gratification.create({
        data: {
          userId,
          type: CLAIM_TYPE,
          // `amount` is the BRL-equivalent credit (withdrawal + shopping, in
          // cents) so existing UI columns that sum up gratification amounts
          // still get a sensible number.
          amount: withdrawalCents + shoppingCents,
          category: 'career',
          // `description` keeps the `[plan:ID] Name` format used for the
          // idempotency lookup. The free-text gratification bonus description
          // (item 9.4) is stored in `qualification` so admins have a full
          // audit trail of which bonus was paid out at the time of the claim
          // (the plan's gratification text may be edited later by an admin,
          // so we snapshot it here).
          description: buildClaimDescription(planId, plan.name),
          isClaimed: true,
          claimedAt: new Date(),
          frequency: 'one_time',
          qualification: plan.gratification
            ? `Plano de Carreira: ${plan.name} — ${plan.gratification}`
            : `Plano de Carreira: ${plan.name}`,
        },
      }),
    ])

    return success({
      ok: true,
      planId,
      planName: plan.name,
      credited: {
        rewardWithdrawalCents: withdrawalCents,
        rewardShoppingCents: shoppingCents,
        rewardPoints: pointsReward,
      },
      balances: {
        balanceWithdrawal: updatedUser.balanceWithdrawal,
        balanceShopping: updatedUser.balanceShopping,
        careerPoints: updatedUser.careerPoints,
      },
      gratificationId: gratification.id,
    })
  } catch (err) {
    console.error('Career claim POST error:', err)
    return error('Erro ao reivindicar gratificação', 500)
  }
}

// GET /api/career/claim?userId=X
// Returns the list of career-claim gratifications for the user, so the UI can
// show "Gratificações Desbloqueadas" and disable the claim button for already-
// claimed plans.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const claims = await prisma.gratification.findMany({
      where: { userId, type: CLAIM_TYPE, isClaimed: true },
      select: { description: true, claimedAt: true, amount: true },
      orderBy: { claimedAt: 'desc' },
    })

    const claimed = claims
      .map((c) => ({
        planId: extractPlanIdFromDescription(c.description),
        claimedAt: c.claimedAt,
        amountCents: c.amount,
      }))
      .filter((c) => c.planId !== null)

    return success({ claimed })
  } catch (err) {
    console.error('Career claim GET error:', err)
    return error('Erro ao listar gratificações', 500)
  }
}
