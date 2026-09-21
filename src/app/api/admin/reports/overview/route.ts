import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/admin/reports/overview
// Platform-wide aggregation endpoint for the admin "Relatórios Admin" panel.
// Implements the client-spec §19 reports: user counts by qualification,
// plan distribution, matrix distribution by type+level, earnings per app
// block, withdrawal summary, per-matrix cashback earnings, recent signups
// and the most recent pending withdrawal requests.
//
// Auth: requires `userId` of an admin user (same pattern as /admin/stats).
// We accept the param via query string for parity with other admin routes.
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })
    if (!requester || requester.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // ----- User counts by qualification -----
    // qualification values captured at registration:
    //   motorista, passageiro, passageiro_60, passageiro_pcd, comercio, entregador
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        qualification: true,
        isActive: true,
        plan: true,
        createdAt: true,
      },
    })

    const counts: Record<string, number> = {
      motorista: 0,
      passageiro: 0,
      passageiro_60: 0,
      passageiro_pcd: 0,
      comercio: 0,
      entregador: 0,
    }
    const planCounts: Record<string, number> = {
      free: 0,
      blue3: 0,
      blue5: 0,
      premium5: 0,
    }
    let activeUsers = 0
    let inactiveUsers = 0
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    let recentSignups = 0

    for (const u of allUsers) {
      const q = (u.qualification || 'passageiro') as string
      if (counts[q] !== undefined) counts[q]++
      else counts['passageiro']++ // unknown qualifications count as regular passenger

      const p = (u.plan || 'free') as string
      if (planCounts[p] !== undefined) planCounts[p]++
      else planCounts['free']++

      if (u.isActive) activeUsers++
      else inactiveUsers++

      if (new Date(u.createdAt) > thirtyDaysAgo) recentSignups++
    }

    // ----- Matrix distribution -----
    const matrixPositions = await prisma.matrixPosition.findMany({
      select: { matrixType: true, level: true },
    })
    const matrixDistribution: Record<
      'entrada' | 'residual' | 'vendas',
      { total: number; byLevel: Record<number, number> }
    > = {
      entrada: { total: 0, byLevel: {} },
      residual: { total: 0, byLevel: {} },
      vendas: { total: 0, byLevel: {} },
    }
    for (const mp of matrixPositions) {
      const kind = mp.matrixType as 'entrada' | 'residual' | 'vendas'
      if (matrixDistribution[kind]) {
        matrixDistribution[kind].total++
        const lvl = mp.level
        matrixDistribution[kind].byLevel[lvl] =
          (matrixDistribution[kind].byLevel[lvl] || 0) + 1
      }
    }

    // ----- Transactions / earnings per app block -----
    // Categories represent the 5 income blocks from client spec §19 plus
    // withdrawal/payment buckets.
    const transactions = await prisma.transaction.findMany({
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        status: true,
        category: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const earningsByBlock: Record<string, number> = {
      mobility: 0,
      shopping: 0,
      food: 0,
      pharmacy: 0,
      gratification: 0,
      withdrawal: 0,
      paymentInvoice: 0,
    }
    for (const t of transactions) {
      const cat = (t.category || '') as string
      if (earningsByBlock[cat] !== undefined) {
        earningsByBlock[cat] += t.amount || 0
      }
    }

    // ----- Withdrawals summary -----
    const withdrawals = transactions.filter((t) => t.type === 'withdrawal')
    const pendingWithdrawals = withdrawals.filter(
      (w) => w.status === 'pending'
    ).length
    const approvedWithdrawals = withdrawals.filter(
      (w) => w.status === 'approved' || w.status === 'paid'
    ).length
    const rejectedWithdrawals = withdrawals.filter(
      (w) => w.status === 'rejected'
    ).length
    const totalWithdrawn = withdrawals
      .filter((w) => w.status === 'paid' || w.status === 'approved')
      .reduce((sum, w) => sum + Math.abs(w.amount || 0), 0)

    // recent pending withdrawals (top 10) for the admin quick-approve table
    const recentWithdrawals = withdrawals
      .filter((w) => w.status === 'pending')
      .slice(0, 10)
      .map((w) => ({
        id: w.id,
        userId: w.userId,
        amount: w.amount,
        description: w.description,
        createdAt: w.createdAt,
      }))

    // ----- Cashback by matrix type -----
    const [cashbackEntries, cashbackResiduals, cashbackSales] = await Promise.all([
      prisma.cashbackEntry.aggregate({ _sum: { amount: true } }),
      prisma.cashbackResidual.aggregate({ _sum: { amount: true } }),
      prisma.cashbackSales.aggregate({ _sum: { amount: true } }),
    ])
    const matrixEarnings: Record<'entrada' | 'residual' | 'vendas', number> = {
      entrada: cashbackEntries._sum.amount || 0,
      residual: cashbackResiduals._sum.amount || 0,
      vendas: cashbackSales._sum.amount || 0,
    }

    // Total balances held by users (sum across all wallet fields) — for the
    // "Saldo em circulação" summary card.
    const balancesAgg = await prisma.user.aggregate({
      _sum: {
        balanceWithdrawal: true,
        balanceMobility: true,
        balanceShopping: true,
        balanceFood: true,
        balancePharmacy: true,
        balanceGratification: true,
        balancePaymentInvoice: true,
      },
    })
    const totalInCirculation =
      (balancesAgg._sum.balanceWithdrawal || 0) +
      (balancesAgg._sum.balanceMobility || 0) +
      (balancesAgg._sum.balanceShopping || 0) +
      (balancesAgg._sum.balanceFood || 0) +
      (balancesAgg._sum.balancePharmacy || 0) +
      (balancesAgg._sum.balanceGratification || 0) +
      (balancesAgg._sum.balancePaymentInvoice || 0)

    // 60+ seniors count (passageiro_60 qualification) — surfaced separately
    // per client spec §19 ("Passageiros 60+ e Idosos").
    const seniorsCount = counts['passageiro_60']

    return NextResponse.json({
      success: true,
      userCounts: {
        ...counts,
        total: allUsers.length,
      },
      seniorsCount,
      activeUsers,
      inactiveUsers,
      planCounts,
      matrixDistribution,
      earningsByBlock,
      withdrawals: {
        pending: pendingWithdrawals,
        approved: approvedWithdrawals,
        rejected: rejectedWithdrawals,
        totalWithdrawn,
        recent: recentWithdrawals,
      },
      matrixEarnings,
      recentSignups,
      totalTransactions: transactions.length,
      totalInCirculation,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Admin Reports Overview] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to load reports' },
      { status: 500 }
    )
  }
}
