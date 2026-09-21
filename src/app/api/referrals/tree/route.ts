import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

interface ReferralNode {
  id: string
  name: string
  email: string
  plan: string
  isActive: boolean
  referralCode: string | null
  profileImage: string | null
  createdAt: string
  level: number
  referralCount: number
  children: ReferralNode[]
}

// GET /api/referrals/tree?userId=X&depth=5
// Returns the user's referral tree (the user themselves as the root, with
// nested `children` for each direct referral, recursively up to `depth`).
// Used by the "Árvore de Indicações" panel in both the user backoffice
// (NetworkModal) and the admin backoffice.
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const depth = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get('depth') || '5', 10) || 5, 1),
      10
    )

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        isActive: true,
        referralCode: true,
        profileImage: true,
        createdAt: true,
      },
    })
    if (!user) return error('User not found', 404)

    // Recursive tree builder. The root user is level 0; their direct referrals
    // are level 1, and so on, up to `depth` levels deep.
    const buildNode = async (
      parentId: string,
      level: number
    ): Promise<ReferralNode | null> => {
      if (level > depth) return null

      const u = await prisma.user.findUnique({
        where: { id: parentId },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          isActive: true,
          referralCode: true,
          profileImage: true,
          createdAt: true,
        },
      })
      if (!u) return null

      const directReferrals = await prisma.user.findMany({
        where: { referredById: parentId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })

      const children: ReferralNode[] = []
      for (const ref of directReferrals) {
        const child = await buildNode(ref.id, level + 1)
        if (child) children.push(child)
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        plan: u.plan,
        isActive: u.isActive,
        referralCode: u.referralCode,
        profileImage: u.profileImage,
        createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt ?? ''),
        level,
        referralCount: children.length,
        children,
      }
    }

    const tree = await buildNode(userId, 0)

    // Count totals per level using an iterative BFS so the UI can show
    // a per-level breakdown without walking the tree again.
    const levelCounts: { level: number; count: number }[] = []
    let currentLevelIds = [userId]
    for (let lvl = 1; lvl <= depth; lvl++) {
      const referrals = await prisma.user.findMany({
        where: { referredById: { in: currentLevelIds } },
        select: { id: true },
      })
      if (referrals.length === 0) break
      levelCounts.push({ level: lvl, count: referrals.length })
      currentLevelIds = referrals.map((r) => r.id)
    }

    // Count total nodes in the tree (excluding the root user).
    const countNodes = (node: ReferralNode | null): number => {
      if (!node) return 0
      let n = 0
      for (const c of node.children) n += 1 + countNodes(c)
      return n
    }
    const totalNodes = countNodes(tree)

    return success({
      rootUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        referralCode: user.referralCode,
        isActive: user.isActive,
      },
      tree,
      levelCounts,
      totalNodes,
      maxDepth: depth,
    })
  } catch (err) {
    console.error('Referral tree error:', err)
    return error('Internal server error', 500)
  }
}
