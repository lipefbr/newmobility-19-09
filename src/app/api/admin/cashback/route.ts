import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const adminId = req.nextUrl.searchParams.get('userId')
    if (!adminId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const type = req.nextUrl.searchParams.get('type') || 'all' // entrada, residual, vendas, all
    const filterUserId = req.nextUrl.searchParams.get('filterUserId') || ''
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    interface CashbackRow {
      id: string; userId: string; fromUserId: string; amount: number;
      level: number; percentage: number; description: string;
      category?: string; createdAt: Date;
      cashbackType: string;
      userName: string; userEmail: string;
      fromUserName: string;
    }

    const allRows: CashbackRow[] = []

    // Helper to add user info to entries
    const enrichEntries = async (entries: { userId: string; fromUserId: string; id: string; amount: number; level: number; percentage: number; description: string | null; category: string | null; createdAt: Date }[], cashbackType: string): Promise<CashbackRow[]> => {
      const userIds = [...new Set(entries.map((e) => e.userId))]
      const fromUserIds = [...new Set(entries.map((e) => e.fromUserId).filter(Boolean))]

      const userMap: Record<string, { name: string; email: string }> = {}
      for (const uid of [...userIds, ...fromUserIds]) {
        if (!userMap[uid]) {
          const u = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true } })
          if (u) userMap[uid] = u
        }
      }

      return entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        fromUserId: e.fromUserId || '',
        amount: e.amount,
        level: e.level,
        percentage: e.percentage,
        description: e.description || '',
        category: e.category || '',
        createdAt: e.createdAt,
        cashbackType,
        userName: userMap[e.userId]?.name || 'Usuário',
        userEmail: userMap[e.userId]?.email || '',
        fromUserName: userMap[e.fromUserId]?.name || '',
      }))
    }

    const userFilter = filterUserId ? { userId: filterUserId } : undefined

    // Fetch from each table based on filter
    if (type === 'all' || type === 'entrada') {
      const entries = await prisma.cashbackEntry.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
      })
      const enriched = await enrichEntries(entries, 'entrada')
      allRows.push(...enriched)
    }

    if (type === 'all' || type === 'residual') {
      const entries = await prisma.cashbackResidual.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
      })
      const enriched = await enrichEntries(entries, 'residual')
      allRows.push(...enriched)
    }

    if (type === 'all' || type === 'vendas') {
      const entries = await prisma.cashbackSales.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
      })
      const enriched = await enrichEntries(entries, 'vendas')
      allRows.push(...enriched)
    }

    // Sort by date descending
    allRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Calculate totals per type
    const totals = {
      entrada: allRows.filter(r => r.cashbackType === 'entrada').reduce((s, r) => s + r.amount, 0),
      residual: allRows.filter(r => r.cashbackType === 'residual').reduce((s, r) => s + r.amount, 0),
      vendas: allRows.filter(r => r.cashbackType === 'vendas').reduce((s, r) => s + r.amount, 0),
    }

    // Total per user
    const perUser: Record<string, { name: string; email: string; total: number; count: number }> = {}
    for (const r of allRows) {
      if (!perUser[r.userId]) {
        perUser[r.userId] = { name: r.userName, email: r.userEmail, total: 0, count: 0 }
      }
      perUser[r.userId].total += r.amount
      perUser[r.userId].count++
    }

    const total = allRows.length
    const paginatedRows = allRows.slice(offset, offset + limit)

    return success({
      entries: paginatedRows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      totals,
      perUserSummary: Object.entries(perUser)
        .map(([uid, data]) => ({ userId: uid, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20),
    })
  } catch (err) {
    console.error('Admin cashback GET error:', err)
    return error('Failed to fetch cashback entries', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId: adminId,
      targetUserId,
      cashbackType, // entrada, residual, vendas
      amount,
      level,
      percentage,
      description,
      category,
    } = body

    if (!adminId) return error('userId is required', 400)
    if (!targetUserId) return error('targetUserId is required', 400)
    if (!cashbackType) return error('cashbackType is required', 400)
    if (!amount || amount <= 0) return error('amount must be positive', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) return error('Target user not found', 404)

    const insertData: Record<string, unknown> = {
      userId: targetUserId,
      fromUserId: adminId,
      amount,
      level: level || 1,
      percentage: percentage || 0,
      description: description || `Cashback manual (${cashbackType})`,
    }

    if (category) insertData.category = category

    let entry
    if (cashbackType === 'entrada') {
      entry = await prisma.cashbackEntry.create({ data: insertData })
    } else if (cashbackType === 'residual') {
      entry = await prisma.cashbackResidual.create({ data: insertData })
    } else if (cashbackType === 'vendas') {
      insertData.category = category || 'mobility'
      entry = await prisma.cashbackSales.create({ data: insertData })
    } else {
      return error('Invalid cashbackType. Use: entrada, residual, vendas', 400)
    }

    return success(entry, 201)
  } catch (err) {
    console.error('Admin cashback POST error:', err)
    return error('Failed to create cashback entry', 500)
  }
}
