import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * GET /api/referrals/activity?userId=<id>
 *
 * Returns the real recent activity feed for the current user's referrals.
 * Per BACK-10, this replaces the 3 hardcoded mock entries that were shown
 * on the "Meus Indicados" page.
 *
 * Two kinds of activity entries are returned, sorted by `createdAt` DESC
 * and capped at 10:
 *
 *   1. "Joined the network" entries — one per direct referral. The action
 *      label is:
 *        - "Entrou na rede"  if `createdAt` is within the last 7 days
 *        - "Ativo na rede"   if `lastLoginDate` is within the last 7 days
 *        - "Entrou na rede"  otherwise (fallback to joined)
 *
 *   2. "Earned R$ X from <name>" entries — from CashbackEntry,
 *      CashbackResidual, and CashbackSales rows where the CURRENT user is
 *      the recipient (`userId = currentUser.id`) and the source user is one
 *      of the current user's direct referrals. The amount is formatted as
 *      BRL.
 *
 * Response shape:
 *   { activity: ActivityEntry[], total: number }
 *
 * where ActivityEntry = {
 *   id: string,
 *   type: 'join' | 'active' | 'cashback',
 *   name: string,           // referral name
 *   action: string,         // pt-BR label
 *   time: string,           // relative time, pt-BR ("3h atrás", "1 dia")
 *   isoTime: string | null, // ISO date for sorting / absolute display
 *   plan: string,           // 'free' | 'blue3' | 'blue5' | ...
 *   avatar: string | null,  // profileImage URL or null (UI falls back to initials)
 *   amount?: number,        // BRL value, only for cashback entries
 * }
 */

interface ActivityEntry {
  id: string
  type: 'join' | 'active' | 'cashback'
  name: string
  action: string
  time: string
  isoTime: string | null
  plan: string
  avatar: string | null
  amount?: number
}

const HOUR_MS = 1000 * 60 * 60
const DAY_MS = HOUR_MS * 24
const WEEK_MS = DAY_MS * 7

/**
 * Format a past date as a pt-BR relative-time string. Mirrors the labels
 * used by the old mock data ("3h atrás", "1 dia", "3 dias") so the UI
 * continues to look the same.
 */
function formatRelativeTime(date: Date | null): string {
  if (!date) return '—'
  const diff = Date.now() - date.getTime()
  if (diff < 0) return 'agora'
  if (diff < HOUR_MS) {
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)))
    return `${mins} min atrás`
  }
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / HOUR_MS)
    return `${hours}h atrás`
  }
  if (diff < WEEK_MS) {
    const days = Math.floor(diff / DAY_MS)
    if (days === 1) return '1 dia'
    return `${days} dias`
  }
  // Beyond a week, fall back to a short absolute date (e.g. "12/03").
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function planLabel(plan: string | null | undefined): string {
  if (!plan) return 'free'
  return plan
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    // Verify the user exists (also lets us return a 404 cleanly).
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!me) return error('User not found', 404)

    // Pull all direct referrals of the current user. We only need a few
    // fields — the activity feed is a summary view, not a detail view.
    // NOTE: the User model has no `lastLoginDate` column (that field lives
    // on GamificationStreak), so we use the `isActive` boolean to decide
    // whether to label a referral as "Ativo na rede".
    const referrals = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        name: true,
        plan: true,
        profileImage: true,
        createdAt: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Build a lookup so we can resolve `fromUserId` → referral name/image
    // when processing cashback entries.
    const referralById = new Map(referrals.map((r) => [r.id, r]))

    const entries: ActivityEntry[] = []

    const now = Date.now()
    for (const r of referrals) {
      const createdMs = r.createdAt ? r.createdAt.getTime() : null
      const joinedRecently = createdMs !== null && now - createdMs < WEEK_MS
      const activeRecently = !!r.isActive

      // Per BACK-10: "Entrou na rede" if createdAt within last 7 days, OR
      // "Ativo na rede" if the referral is currently active. We prefer the
      // "joined" label when both are true (a brand-new referral that is
      // also active is more interestingly described as having just joined).
      let type: 'join' | 'active' = 'join'
      let action = 'Entrou na rede'
      if (!joinedRecently && activeRecently) {
        type = 'active'
        action = 'Ativo na rede'
      }

      // For "joined" entries we show how long ago they signed up; for
      // "active" entries there's no login timestamp on the User model, so
      // we fall back to the signup date for the relative-time label.
      const refDate = r.createdAt

      entries.push({
        id: `join-${r.id}`,
        type,
        name: r.name,
        action,
        time: formatRelativeTime(refDate),
        isoTime: refDate ? refDate.toISOString() : null,
        plan: planLabel(r.plan),
        avatar: r.profileImage ?? null,
      })
    }

    // Cashback entries the CURRENT user received from their direct
    // referrals. Each one becomes a "Ganhou R$ X de <name>" activity.
    // We query all three cashback tables in parallel and merge.
    const [entrada, residual, vendas] = await Promise.all([
      prisma.cashbackEntry.findMany({
        where: { userId, fromUserId: { in: Array.from(referralById.keys()) } },
        select: {
          id: true,
          fromUserId: true,
          amount: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.cashbackResidual.findMany({
        where: { userId, fromUserId: { in: Array.from(referralById.keys()) } },
        select: {
          id: true,
          fromUserId: true,
          amount: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.cashbackSales.findMany({
        where: { userId, fromUserId: { in: Array.from(referralById.keys()) } },
        select: {
          id: true,
          fromUserId: true,
          amount: true,
          description: true,
          category: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const fmtBRL = (cents: number) =>
      (Math.abs(cents) / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })

    const pushCashback = (
      id: string,
      fromUserId: string,
      amount: number,
      createdAt: Date | null,
      kind: 'entrada' | 'residual' | 'vendas',
    ) => {
      const referral = referralById.get(fromUserId)
      if (!referral) return
      const amountBRL = fmtBRL(amount)
      entries.push({
        id: `cashback-${kind}-${id}`,
        type: 'cashback',
        name: referral.name,
        action: `Ganhou ${amountBRL} de ${referral.name.split(' ')[0]}`,
        time: formatRelativeTime(createdAt),
        isoTime: createdAt ? createdAt.toISOString() : null,
        plan: planLabel(referral.plan),
        avatar: referral.profileImage ?? null,
        amount: Math.abs(amount) / 100,
      })
    }

    for (const c of entrada) {
      pushCashback(c.id, c.fromUserId, c.amount, c.createdAt, 'entrada')
    }
    for (const c of residual) {
      pushCashback(c.id, c.fromUserId, c.amount, c.createdAt, 'residual')
    }
    for (const c of vendas) {
      pushCashback(c.id, c.fromUserId, c.amount, c.createdAt, 'vendas')
    }

    // Sort by activity date DESC and cap at 10. Entries with no timestamp
    // sink to the bottom.
    entries.sort((a, b) => {
      const aMs = a.isoTime ? new Date(a.isoTime).getTime() : 0
      const bMs = b.isoTime ? new Date(b.isoTime).getTime() : 0
      return bMs - aMs
    })
    const capped = entries.slice(0, 10)

    return success({ activity: capped, total: entries.length })
  } catch (err) {
    console.error('GET /api/referrals/activity error:', err)
    return error('Failed to load referral activity', 500)
  }
}
