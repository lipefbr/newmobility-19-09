import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Static fallback list of client-spec gratifications (Índice.docx §5).
// Returned in addition to whatever the DB has so that newly-registered users
// (or any user with zero rows in the Gratification table) still see the full
// catalog of gratifications the platform offers. The DB rows (when present)
// take precedence — they hold the actual claimed/unclaimed state and
// per-user amounts. The static fallback items are always rendered as
// "available" (not claimed) since they represent the catalog, not the
// per-user claim state.
const STATIC_FALLBACK_GRATIFICATIONS = [
  {
    type: 'fuel_aid',
    name: 'Auxílio Combustível',
    amount: 260000, // R$ 2.600 (R$100/dia × 26 dias)
    category: 'mobility',
    description: 'R$ 2.600/mês (R$100/dia × 26 dias). Pago no fim do mês após pagamento da fatura. Qualificação: ao fechar o 5º nível.',
  },
  {
    type: 'car_wash',
    name: 'Reembolso Vale Ducha (Lava-Carro)',
    amount: 78000, // R$ 780 (R$30/dia × 26 dias)
    category: 'mobility',
    description: 'R$ 780/mês (R$30/dia × 26 dias). Pago diário ou no fim do mês após fatura. Qualificação: ao fechar o 5º nível.',
  },
  {
    type: 'vacation_6mo',
    name: 'Férias 6 Meses',
    amount: 500000, // R$ 5.000 + 10 dias
    category: 'vacation',
    description: 'R$ 5.000 + 10 dias de férias. Único aos 6 meses de cadastro ativo.',
  },
  {
    type: 'vacation_12mo',
    name: 'Férias 12 Meses',
    amount: 2000000, // R$ 20.000 + 20 dias
    category: 'vacation',
    description: 'R$ 20.000 + 20 dias de férias. Único aos 12 meses de cadastro ativo.',
  },
  {
    type: 'driver_daily_goal',
    name: 'Meta Diária Motorista',
    amount: 0,
    category: 'mobility',
    description: '18 corridas/dia — Motorista/Entregador ativo. Ao bater a meta no dia, o sistema envia notificação push avisando que aquele dia teve a meta batida.',
  },
  {
    type: 'driver_monthly_goal',
    name: 'Meta Mensal Motorista',
    amount: 0,
    category: 'mobility',
    description: '384 corridas/mês (18 corridas × ~21 dias úteis). Bonificação extra mensal ao bater a meta — Motorista/Entregador ativo.',
  },
  {
    type: 'cashback_bonus_prize',
    name: 'Prêmio CashBack Gratificação',
    amount: 1500000, // R$ 15.000
    category: 'prize',
    description: 'R$ 15.000 — Único ao fechar equipe com 1.364 usuários.',
  },
]

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

    const gratifications = await db.find(
      'Gratification',
      '"userId" = $1',
      [userId],
      'ORDER BY "createdAt" DESC'
    ) as any[]

    const available = gratifications.filter((g) => !g.isClaimed)
    const claimed = gratifications.filter((g) => g.isClaimed)

    // BACK-7 — driver goals are gated by qualification.
    //
    // The admin sets a single config row (type='driver_goals_config') whose
    // `targetQualification` is one of:
    //   - 'motorista'  → only motoristas see the card
    //   - 'entregador' → only entregadores see the card
    //   - 'ambos'      → motoristas AND entregadores see the card
    //
    // The user must ALSO have either:
    //   - user.qualification matching the configured target, OR
    //   - the isDriver / isDelivery boolean flag set (legacy/manual override).
    //
    // When the user is not eligible, we return `driverGoals: null` so the UI
    // can hide the card. When they ARE eligible, we compute progress from
    // user.totalRides (we don't track per-day rides separately, so we use a
    // reasonable fraction of totalRides for the daily counter).
    const configRow = await db.findOne(
      'Gratification',
      '"type" = $1',
      ['driver_goals_config']
    ) as any

    const targetQualification: string = configRow?.targetQualification || 'ambos'

    const userQualification: string = (user as any)?.qualification || ''
    const userIsDriver: boolean = Boolean((user as any)?.isDriver)
    const userIsDelivery: boolean = Boolean((user as any)?.isDelivery)
    const totalRides: number = (user as any)?.totalRides || 0

    const matchesQualification =
      targetQualification === 'ambos'
        ? userQualification === 'motorista' || userQualification === 'entregador'
        : userQualification === targetQualification

    const isEligibleForDriverGoals =
      matchesQualification || userIsDriver || userIsDelivery

    // Compute driver goal-tracking info (per client spec §6):
    //   - Daily ride goal: 18 rides/day
    //   - Monthly ride goal: 384 rides/month (18 × ~21 dias úteis)
    // We don't track per-day rides in a separate table yet, so daily rides
    // is estimated as a fraction of totalRides (rolling window). The monthly
    // counter uses totalRides directly capped at the monthly goal.
    const DAILY_GOAL = 18
    const MONTHLY_GOAL = 384
    const dailyRides = Math.min(totalRides % DAILY_GOAL, DAILY_GOAL)
    const monthlyRides = Math.min(totalRides, MONTHLY_GOAL)

    const driverGoals = isEligibleForDriverGoals
      ? {
          dailyGoal: DAILY_GOAL,
          monthlyGoal: MONTHLY_GOAL,
          dailyRides,
          monthlyRides,
          dailyGoalReached: dailyRides >= DAILY_GOAL,
          monthlyGoalReached: monthlyRides >= MONTHLY_GOAL,
        }
      : null

    return success({
      available,
      claimed,
      totalEarned: gratifications.reduce((sum, g) => sum + g.amount, 0),
      totalClaimed: claimed.reduce((sum, g) => sum + g.amount, 0),
      // Static catalog — always returned so the UI can show the full
      // gratification catalog (fuel voucher, car wash, vacations, driver
      // goals, cashback prize) even when no per-user rows exist yet.
      catalog: STATIC_FALLBACK_GRATIFICATIONS,
      driverGoals,
    })
  } catch (err) {
    console.error('Gratifications error:', err)
    return error('Internal server error', 500)
  }
}
