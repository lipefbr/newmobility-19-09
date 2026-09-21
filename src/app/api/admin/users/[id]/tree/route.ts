import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

interface AdminReferralNode {
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
  children: AdminReferralNode[]
}

// GET /api/admin/users/[id]/tree?userId=X&depth=5
// Returns the referral tree for a user (the user themselves as the root,
// with nested `children` for each direct referral, recursively up to `depth`
// levels deep). Used by the admin "Árvore de Indicações" panel.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminId = req.nextUrl.searchParams.get('userId')
    if (!adminId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const depth = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get('depth') || '5', 10) || 5, 1),
      10
    )

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return error('User not found', 404)

    // Recursive tree builder. The target user is level 0; their direct
    // referrals are level 1, and so on, up to `depth` levels deep.
    const buildTree = async (userId: string, level: number): Promise<AdminReferralNode | null> => {
      if (level > depth) return null

      const u = await prisma.user.findUnique({
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
      if (!u) return null

      const directReferrals = await prisma.user.findMany({
        where: { referredById: userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, plan: true, isActive: true },
      })

      const children: AdminReferralNode[] = []
      for (const ref of directReferrals) {
        const child = await buildTree(ref.id, level + 1)
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

    const tree = await buildTree(id, 0)

    // Count totals per level using an iterative BFS so the UI can show
    // a per-level breakdown without walking the tree again.
    const levelCounts: { level: number; count: number }[] = []
    let currentLevelIds = [id]
    for (let lvl = 1; lvl <= depth; lvl++) {
      const referrals = await prisma.user.findMany({
        where: { referredById: { in: currentLevelIds } },
        select: { id: true },
      })
      if (referrals.length === 0) break
      levelCounts.push({ level: lvl, count: referrals.length })
      currentLevelIds = referrals.map((r) => r.id)
    }

    const countNodes = (node: AdminReferralNode | null): number => {
      if (!node) return 0
      let n = 0
      for (const c of node.children) n += 1 + countNodes(c)
      return n
    }
    const totalNodes = countNodes(tree)

    return success({
      tree,
      levelCounts,
      totalNodes,
      maxDepth: depth,
    })
  } catch (err) {
    console.error('Admin user tree GET error:', err)
    return error('Failed to fetch user tree', 500)
  }
}
