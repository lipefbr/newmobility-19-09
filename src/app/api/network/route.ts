import { db, prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

// Task 14-F — Minha Rede downline API.
//
// Returns ONLY the logged-in user's downline (their recursive referrals).
// No platform-wide data. Used by the Minha Rede page to render:
//   - the paid/unpaid chart
//   - the downline table (with filters + pagination)
//   - the per-matrix blocking progress cards (also returned here for one
//     round-trip; the dedicated /api/network/matrix-progress route exists
//     for cases where only the progress is needed).
//
// Performance: builds a parent→children map ONCE from a single DB query
// (same pattern as /api/dashboard/route.ts `buildChildrenMap`), then walks
// the tree in-memory to avoid N+1 round-trips on Neon PostgreSQL.

// ---------- types ----------

export type PaidStatus = 'paid' | 'pending' | 'never_paid'

export interface DownlineMember {
  id: string
  name: string
  email: string
  plan: string
  userType: string
  isActive: boolean
  profileImage: string | null
  paidStatus: PaidStatus
  /** 1-indexed: direct referrals = level 1. */
  level: number
  createdAt: string
}

export interface NetworkSummary {
  total: number
  paid: number
  unpaid: number
  pending: number
  neverPaid: number
  active: number
  byLevel: Record<number, number>
}

export interface NetworkEarnings {
  entrada: number
  residual: number
  vendasCount: number
  vendasAmount: number
}

// ---------- helpers ----------

interface RawChild {
  id: string
  name: string
  email: string
  plan: string
  userType: string
  isActive: boolean
  profileImage: string | null
  referredById: string | null
  createdAt: Date
}

async function buildChildrenMap(): Promise<Record<string, RawChild[]>> {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      userType: true,
      isActive: true,
      profileImage: true,
      referredById: true,
      createdAt: true,
    },
  })
  const map: Record<string, RawChild[]> = {}
  for (const r of rows) {
    if (!r.referredById) continue
    if (!map[r.referredById]) map[r.referredById] = []
    map[r.referredById].push({
      id: r.id,
      name: r.name,
      email: r.email,
      plan: r.plan || 'free',
      userType: r.userType || 'usuario',
      isActive: !!r.isActive,
      profileImage: r.profileImage,
      referredById: r.referredById,
      createdAt: r.createdAt,
    })
  }
  return map
}

// BFS-walk the referral tree (up to 9 levels — the deepest matrix depth,
// vendas). Returns the flat descendant list with their tree level
// (1-indexed). Cycle-safe via a `seen` set.
function walkDescendants(
  rootId: string,
  childrenMap: Record<string, RawChild[]>,
): { member: RawChild; level: number }[] {
  const out: { member: RawChild; level: number }[] = []
  const seen = new Set<string>([rootId])
  let currentLevel: string[] = [rootId]
  for (let level = 1; level <= 9; level++) {
    if (currentLevel.length === 0) break
    const next: string[] = []
    for (const parentId of currentLevel) {
      const kids = childrenMap[parentId]
      if (!kids) continue
      for (const k of kids) {
        if (seen.has(k.id)) continue
        seen.add(k.id)
        out.push({ member: k, level })
        next.push(k.id)
      }
    }
    currentLevel = next
  }
  return out
}

// Derive a member's paid status from their most recent Invoice.
//   - 'paid'       → latest invoice has status 'paid'
//   - 'pending'    → latest invoice exists but is pending/overdue/cancelled
//   - 'never_paid' → no invoice exists for this user
//
// We batch-fetch invoices for ALL downline ids in one query to avoid N+1.
async function buildPaidStatusMap(
  userIds: string[],
): Promise<Record<string, PaidStatus>> {
  const out: Record<string, PaidStatus> = {}
  if (userIds.length === 0) return out
  for (const id of userIds) out[id] = 'never_paid'

  // Fetch the latest invoice per user. Prisma doesn't have a built-in
  // "latest per group" so we pull the most recent 1 invoice per user via
  // a single findMany + client-side grouping. Downline sizes are typically
  // small (low hundreds at most) so this is fine.
  // Cap per user to keep payload bounded — we only need the latest.
  const invoices = await prisma.invoice.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: 'desc' },
    // No native per-user limit; we group client-side below.
    select: { userId: true, status: true, createdAt: true },
  })

  const latestPerUser: Record<string, { status: string; createdAt: Date }> = {}
  for (const inv of invoices) {
    const cur = latestPerUser[inv.userId]
    if (!cur || inv.createdAt > cur.createdAt) {
      latestPerUser[inv.userId] = { status: inv.status, createdAt: inv.createdAt }
    }
  }

  for (const id of userIds) {
    const latest = latestPerUser[id]
    if (!latest) {
      out[id] = 'never_paid'
    } else if (latest.status === 'paid') {
      out[id] = 'paid'
    } else {
      // pending | overdue | cancelled | unknown → counts as "pending"
      out[id] = 'pending'
    }
  }
  return out
}

// ---------- route ----------

export async function GET(request: Request) {
  try {
    const session = await getSession(request)
    if (!session) return error('Unauthorized', 401)

    const rootId = session.userId

    // 1. Walk the user's downline in-memory (one User table scan, no N+1).
    const childrenMap = await buildChildrenMap()
    const descendants = walkDescendants(rootId, childrenMap)

    // 2. Batch-fetch paid-status for every downline id (one Invoice query).
    const downlineIds = descendants.map((d) => d.member.id)
    const paidStatusMap = await buildPaidStatusMap(downlineIds)

    // 3. Build the downline payload + summary.
    const downline: DownlineMember[] = descendants.map(({ member, level }) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      plan: member.plan,
      userType: member.userType,
      isActive: member.isActive,
      profileImage: member.profileImage,
      paidStatus: paidStatusMap[member.id] ?? 'never_paid',
      level,
      createdAt: member.createdAt instanceof Date
        ? member.createdAt.toISOString()
        : new Date(member.createdAt).toISOString(),
    }))

    const summary: NetworkSummary = {
      total: downline.length,
      paid: 0,
      unpaid: 0,
      pending: 0,
      neverPaid: 0,
      active: 0,
      byLevel: {},
    }
    for (const m of downline) {
      if (m.paidStatus === 'paid') summary.paid += 1
      else summary.unpaid += 1
      if (m.paidStatus === 'pending') summary.pending += 1
      if (m.paidStatus === 'never_paid') summary.neverPaid += 1
      if (m.isActive) summary.active += 1
      summary.byLevel[m.level] = (summary.byLevel[m.level] || 0) + 1
    }

    // 4. Per-matrix earnings (entrada + residual in cents, vendas in count).
    //    These are the USER's OWN earnings (not the downline's), used by
    //    the matrix blocking progress cards.
    const [entradaRecords, residualRecords, vendasRecords] = await Promise.all([
      db.find('CashbackEntry', '"userId" = $1', [rootId]),
      db.find('CashbackResidual', '"userId" = $1', [rootId]),
      db.find('CashbackSales', '"userId" = $1', [rootId]),
    ])

    const entradaEarned = (entradaRecords as Array<{ amount?: number }>).reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    )
    const residualEarned = (residualRecords as Array<{ amount?: number }>).reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    )
    const vendasCount = vendasRecords.length
    const vendasAmount = (vendasRecords as Array<{ amount?: number }>).reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    )

    const earnings: NetworkEarnings = {
      entrada: entradaEarned,
      residual: residualEarned,
      vendasCount,
      vendasAmount,
    }

    // 5. Root user (for the page header + referral-code CTA).
    const rootUser = await db.findOne('User', '"id" = $1', [rootId])
    const root = rootUser
      ? {
          id: rootUser.id,
          name: rootUser.name,
          email: rootUser.email,
          plan: rootUser.plan || 'free',
          referralCode: rootUser.referralCode,
          profileImage: rootUser.profileImage ?? null,
          userType: rootUser.userType || 'usuario',
          isActive: !!rootUser.isActive,
          createdAt:
            rootUser.createdAt instanceof Date
              ? rootUser.createdAt.toISOString()
              : new Date(rootUser.createdAt as string | number | Date).toISOString(),
        }
      : null

    return success({
      user: root,
      downline,
      summary,
      earnings,
    })
  } catch (err) {
    console.error('Network (minha-rede) error:', err)
    return error('Internal server error', 500)
  }
}
