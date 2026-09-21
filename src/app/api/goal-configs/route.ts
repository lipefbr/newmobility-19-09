import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/goal-configs — Metas configuradas pelo admin para o usuário logado
// ----------------------------------------------------------------------------
// Retorna as metas ativas que se aplicam ao usuário com base em sua
// qualificação (user.qualification). Para cada meta, calcula o progresso
// atual (currentValue) com base na métrica (metricCode) e na periodicidade
// (frequency).
//
// Exemplo de resposta:
//   {
//     "goals": [
//       {
//         "id": "cmt...",
//         "name": "Meta Diária Motorista",
//         "description": "20 viagens finalizadas por dia",
//         "targetQualification": "motorista",
//         "metricCode": "trips_daily",
//         "metricLabel": "viagens finalizadas",
//         "targetValue": 20,
//         "currentValue": 12,       // progresso hoje
//         "rewardCents": 500,       // R$ 5,00
//         "rewardWallet": "gratification",
//         "frequency": "daily",
//         "progressPct": 60,
//         "isAchieved": false,
//         "isClaimed": false
//       }
//     ]
//   }
// ============================================================================

function userMatchesTargetQualification(userQual: string | null | undefined, target: string): boolean {
  if (!userQual) return false
  const q = userQual.toLowerCase()
  if (target === 'ambos') return q === 'motorista' || q === 'entregador'
  return q === target.toLowerCase()
}

// Compute current progress for a goal based on metricCode + frequency
async function computeProgress(
  userId: string,
  metricCode: string,
  frequency: string
): Promise<number> {
  const now = new Date()
  let since: Date

  // Determine the time window based on frequency
  if (frequency === 'daily') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (frequency === 'weekly') {
    const day = now.getDay() // 0 = Sunday
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
  } else if (frequency === 'monthly') {
    since = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    // one_time — since the beginning of time
    since = new Date(0)
  }

  try {
    // Try to count from Ride model if it exists (motorista trips)
    if (metricCode === 'trips_daily' || metricCode === 'trips_monthly' || metricCode === 'trips_total') {
      // @ts-expect-error — Ride model may or may not exist
      const count = await prisma.ride?.count({
        where: {
          driverId: userId,
          status: 'completed',
          completedAt: { gte: since },
        },
      })
      if (typeof count === 'number') return count
    }
    if (metricCode === 'deliveries_daily' || metricCode === 'deliveries_monthly') {
      // @ts-expect-error — Delivery model may or may not exist
      const count = await prisma.delivery?.count({
        where: {
          driverId: userId,
          status: 'completed',
          completedAt: { gte: since },
        },
      })
      if (typeof count === 'number') return count
    }
    if (metricCode === 'sales_total') {
      const count = await prisma.marketplaceOrder.count({
        where: {
          sellerId: userId,
          status: { in: ['paid', 'delivered', 'completed'] },
          createdAt: { gte: since },
        },
      })
      return count
    }
    if (metricCode === 'referrals_total') {
      const count = await prisma.user.count({
        where: { referredById: userId, createdAt: { gte: since } },
      })
      return count
    }
    if (metricCode === 'kyc_approved') {
      // Count approved KYC documents
      const count = await prisma.kycDocument.count({
        where: { userId, status: 'approved', createdAt: { gte: since } },
      })
      return count
    }
  } catch {
    // If the model doesn't exist or query fails, fall back to 0
    return 0
  }

  return 0
}

// GET /api/goal-configs?userId=<userId>
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, qualification: true, role: true, isActive: true },
    })
    if (!user) return error('User not found', 404)

    // Fetch all active goal configs
    const configs = await prisma.goalConfig.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    // Filter by user qualification
    const applicable = configs.filter((c) =>
      userMatchesTargetQualification(user.qualification, c.targetQualification)
    )

    // Compute progress for each goal
    const goalsWithProgress = await Promise.all(
      applicable.map(async (c) => {
        const currentValue = await computeProgress(userId, c.metricCode, c.frequency)
        const progressPct = c.targetValue > 0 ? Math.min(100, Math.round((currentValue / c.targetValue) * 100)) : 0
        const isAchieved = currentValue >= c.targetValue

        // Check if the user has already claimed this goal for the current period
        // (we look for a Gratification row with type='goal_claim' + referenceId=goalConfig.id
        // created within the current period)
        let isClaimed = false
        try {
          const periodStart =
            c.frequency === 'daily'
              ? new Date(new Date().setHours(0, 0, 0, 0))
              : c.frequency === 'weekly'
                ? new Date(new Date().setDate(new Date().getDate() - new Date().getDay()))
                : c.frequency === 'monthly'
                  ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                  : new Date(0)
          const claim = await prisma.gratification.findFirst({
            where: {
              userId,
              type: 'goal_claim',
              // @ts-expect-error — referenceId may not exist on Gratification schema
              referenceId: c.id,
              createdAt: { gte: periodStart },
            },
          })
          isClaimed = !!claim
        } catch {
          isClaimed = false
        }

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          targetQualification: c.targetQualification,
          metricCode: c.metricCode,
          metricLabel: c.metricLabel,
          targetValue: c.targetValue,
          currentValue,
          rewardCents: c.rewardCents,
          rewardWallet: c.rewardWallet,
          frequency: c.frequency,
          progressPct,
          isAchieved,
          isClaimed,
        }
      })
    )

    return success({ goals: goalsWithProgress })
  } catch (err) {
    console.error('goal-configs GET error:', err)
    return error('Failed to fetch goal configs', 500)
  }
}
