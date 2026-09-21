import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Map a CareerPlan row (DB) to the response shape consumed by the
// career-page.tsx UI. `achieved` is computed dynamically from the user's
// current careerPoints so it never goes stale when the admin edits a plan.
function mapPlan(plan: {
  id: string
  code: string
  name: string
  description: string | null
  minPoints: number
  bonusCents: number
  rewardWithdrawalCents: number
  rewardShoppingCents: number
  rewardPoints: number
  gratification: string | null
  rewardType: string
  color: string | null
  icon: string | null
  isActive: boolean
  sortOrder: number
}, userPoints: number) {
  // Split the description by newline so admins can list multiple benefits
  // (one per line) in a single text field.
  const benefits = (plan.description || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    minPoints: plan.minPoints,
    bonusCents: plan.bonusCents,
    // rewardType: 'real' (BRL) or 'points'. Default to 'real' for safety
    // in case an old row predates the column (db push backfills NULL).
    rewardType: plan.rewardType === 'points' ? 'points' : 'real',
    // BACK-9 — separate reward fields.
    rewardWithdrawalCents: plan.rewardWithdrawalCents ?? 0,
    rewardShoppingCents: plan.rewardShoppingCents ?? 0,
    rewardPoints: plan.rewardPoints ?? 0,
    gratification: plan.gratification ?? null,
    color: plan.color,
    icon: plan.icon,
    sortOrder: plan.sortOrder,
    isActive: plan.isActive,
    achieved: userPoints >= plan.minPoints,
    benefits,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await db.findOne('User', '"id" = $1', [userId])

    if (!user) {
      return error('User not found', 404)
    }

    const careerPoints = Number(user.careerPoints || 0)
    const personalPoints = Number(user.personalPoints || 0)

    // Load all active career plans from the DB (admin-managed).
    const plans = await prisma.careerPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    // Map to response shape with the `achieved` flag computed dynamically.
    const mappedPlans = plans.map((p) => mapPlan(p, careerPoints))

    // Determine current rank = the highest plan whose minPoints the user has
    // reached. If no plan matches (e.g. user has 0 points but the lowest plan
    // requires > 0), treat the user as "Associado" (no rank yet).
    let currentPlan: typeof mappedPlans[number] | null = null
    for (const p of mappedPlans) {
      if (careerPoints >= p.minPoints) currentPlan = p
    }
    const hasAchievedAny = currentPlan !== null

    // Determine next rank = first plan with minPoints strictly greater than
    // the user's current careerPoints. If the user hasn't achieved any plan
    // yet, the next rank is the first (lowest) plan.
    const nextPlan = hasAchievedAny
      ? (mappedPlans.find((p) => careerPoints < p.minPoints) || null)
      : (mappedPlans[0] || null)

    const progress = nextPlan
      ? Math.min(((careerPoints / nextPlan.minPoints) * 100), 100)
      : 100

    // Career milestones (kept for backward-compat with any callers that still
    // read this field). Derived from the same DB-driven plan list so admin
    // edits propagate here too.
    const milestones = mappedPlans.map((p) => ({
      id: p.id,
      milestone: p.name,
      pointsRequired: p.minPoints,
      achieved: p.achieved,
      achievedAt: p.achieved ? new Date().toISOString() : null,
    }))

    return success({
      currentRank: currentPlan?.name ?? 'Associado',
      currentStars: currentPlan?.sortOrder ?? 0,
      totalPoints: careerPoints,
      personalPoints,
      nextRank: nextPlan
        ? {
            name: nextPlan.name,
            stars: nextPlan.sortOrder,
            pointsNeeded: Math.max(nextPlan.minPoints - careerPoints, 0),
            icon: nextPlan.icon,
            color: nextPlan.color,
            bonusCents: nextPlan.bonusCents,
            rewardType: nextPlan.rewardType,
            // BACK-9 — separate reward fields.
            rewardWithdrawalCents: nextPlan.rewardWithdrawalCents ?? 0,
            rewardShoppingCents: nextPlan.rewardShoppingCents ?? 0,
            rewardPoints: nextPlan.rewardPoints ?? 0,
            gratification: nextPlan.gratification ?? null,
          }
        : null,
      progress,
      plans: mappedPlans,
      milestones,
    })
  } catch (err) {
    console.error('Career error:', err)
    return error('Internal server error', 500)
  }
}
