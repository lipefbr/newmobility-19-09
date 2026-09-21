import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const adminId = req.nextUrl.searchParams.get('userId')
    if (!adminId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // Get all users with their referral info (single query)
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, plan: true, isActive: true,
        referralCode: true, referredById: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Build a parent -> children map in memory (single pass, no N+1 queries)
    const childrenMap: Record<string, string[]> = {}
    for (const u of users) {
      if (u.referredById) {
        if (!childrenMap[u.referredById]) childrenMap[u.referredById] = []
        childrenMap[u.referredById].push(u.id)
      }
    }

    // For each user, walk the referral tree using the in-memory map
    // (no DB queries in the loop — pure in-memory traversal)
    const userMatrices = []

    for (const user of users) {
      const byLevel: Record<number, number> = {}
      let total = 0
      let currentLevel: string[] = [user.id]

      for (let level = 1; level <= 9; level++) {
        if (currentLevel.length === 0) break
        // Gather all children at this level from the in-memory map
        const nextLevel: string[] = []
        for (const parentId of currentLevel) {
          const kids = childrenMap[parentId]
          if (kids) nextLevel.push(...kids)
        }
        if (nextLevel.length === 0) break
        byLevel[level] = nextLevel.length
        total += nextLevel.length
        currentLevel = nextLevel
      }

      const entradaTotal = [1, 2, 3, 4, 5].reduce((s, l) => s + (byLevel[l] || 0), 0)
      const residualTotal = [1, 2, 3, 4, 5, 6, 7].reduce((s, l) => s + (byLevel[l] || 0), 0)
      const vendasTotal = [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((s, l) => s + (byLevel[l] || 0), 0)

      // Only include users who have at least 1 referral
      if (total > 0) {
        userMatrices.push({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          plan: user.plan,
          isActive: user.isActive,
          referralCode: user.referralCode,
          entradaByLevel: { 1: byLevel[1] || 0, 2: byLevel[2] || 0, 3: byLevel[3] || 0, 4: byLevel[4] || 0, 5: byLevel[5] || 0 },
          residualByLevel: { 1: byLevel[1] || 0, 2: byLevel[2] || 0, 3: byLevel[3] || 0, 4: byLevel[4] || 0, 5: byLevel[5] || 0, 6: byLevel[6] || 0, 7: byLevel[7] || 0 },
          vendasByLevel: { 1: byLevel[1] || 0, 2: byLevel[2] || 0, 3: byLevel[3] || 0, 4: byLevel[4] || 0, 5: byLevel[5] || 0, 6: byLevel[6] || 0, 7: byLevel[7] || 0, 8: byLevel[8] || 0, 9: byLevel[9] || 0 },
          entradaTotal,
          residualTotal,
          vendasTotal,
          networkTotal: total,
        })
      }
    }

    // Sort by network total descending
    userMatrices.sort((a, b) => b.networkTotal - a.networkTotal)

    // Platform-wide totals
    const platformTotals = {
      entrada: userMatrices.reduce((s, u) => s + u.entradaTotal, 0),
      residual: userMatrices.reduce((s, u) => s + u.residualTotal, 0),
      vendas: userMatrices.reduce((s, u) => s + u.vendasTotal, 0),
      totalUsers: userMatrices.length,
      totalNetwork: userMatrices.reduce((s, u) => s + u.networkTotal, 0),
    }

    return success({ userMatrices, platformTotals })
  } catch (err) {
    console.error('Admin matrix overview error:', err)
    return error('Failed to fetch matrix overview', 500)
  }
}
