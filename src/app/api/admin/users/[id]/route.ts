import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'

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

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { referrals: true } },
        referredBy: { select: { id: true, name: true, email: true } },
      },
    })
    if (!user) return error('User not found', 404)

    const safeUser = sanitizeUser(user as unknown as Record<string, unknown>)

    return success({
      ...safeUser,
      _count: { referrals: user._count.referrals },
      referrer: user.referredBy || null,
    })
  } catch (err) {
    console.error('Get user error:', err)
    return error('Failed to fetch user', 500)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      userId,
      name, email, phone, cpf,
      plan, isActive,
      balanceWithdrawal, balanceMobility, balanceShopping,
      balanceFood, balancePharmacy, balanceGratification,
      careerPoints, personalPoints, stars,
      city, state, country,
      bankCode, bankAgency, bankAccount, bankType,
      pixKey, pixEnabled,
      isDriver, isDelivery,
      qualification,
      role,
      // Item 13 (sponsor validation): allow the admin to assign a sponsor
      // (referredById) to a user that was created without one. Pass `null`
      // to clear the sponsor link (admin only — non-admins should always
      // have one, but the admin is the trust root here).
      referredById,
    } = body

    if (!userId) return error('userId is required', 400)

    // Verify admin
    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return error('User not found', 404)

    // Build update data - all editable fields
    const updateData: Record<string, unknown> = {}

    // Personal info
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (cpf !== undefined) updateData.cpf = cpf

    // Plan & status
    if (plan !== undefined) updateData.plan = plan
    if (isActive !== undefined) updateData.isActive = isActive

    // All balances
    if (balanceWithdrawal !== undefined) updateData.balanceWithdrawal = balanceWithdrawal
    if (balanceMobility !== undefined) updateData.balanceMobility = balanceMobility
    if (balanceShopping !== undefined) updateData.balanceShopping = balanceShopping
    if (balanceFood !== undefined) updateData.balanceFood = balanceFood
    if (balancePharmacy !== undefined) updateData.balancePharmacy = balancePharmacy
    if (balanceGratification !== undefined) updateData.balanceGratification = balanceGratification

    // Career info
    if (careerPoints !== undefined) updateData.careerPoints = careerPoints
    if (personalPoints !== undefined) updateData.personalPoints = personalPoints
    if (stars !== undefined) updateData.stars = stars

    // Location
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (country !== undefined) updateData.country = country

    // Bank details
    if (bankCode !== undefined) updateData.bankCode = bankCode
    if (bankAgency !== undefined) updateData.bankAgency = bankAgency
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount
    if (bankType !== undefined) updateData.bankType = bankType
    if (pixKey !== undefined) updateData.pixKey = pixKey
    if (pixEnabled !== undefined) updateData.pixEnabled = pixEnabled

    // Driver / delivery
    if (isDriver !== undefined) updateData.isDriver = isDriver
    if (isDelivery !== undefined) updateData.isDelivery = isDelivery

    // BACK-4 — qualification. Task 2-e (Item 4) expanded the dropdown to 10
    // business-relevant options per the client spec: motorista, entregador,
    // cliente, lojista, mototaxista, motofretista, motorista_app, taxista,
    // caminhoneiro, outros. Mirrors the shared QUALIFICATION_OPTIONS in
    // `@/lib/qualifications` (used by the registration dropdown + backoffice
    // personal-data-section). Legacy codes (passageiro / passageiro_60 /
    // passageiro_pcd / comercio) are still accepted and rendered with their
    // friendly labels by `qualificationLabel()`. Allow clearing by sending
    // an empty string.
    if (qualification !== undefined) updateData.qualification = qualification || null

    // Role
    if (role !== undefined) updateData.role = role

    // Item 13 (sponsor validation): allow the admin to set or clear the
    // user's sponsor (referredById). Validates that:
    //   - the target sponsor exists in the User table
    //   - the sponsor is not the user themselves (would create a self-loop)
    //   - the sponsor is not already a descendant of this user (would create
    //     a cycle in the referral tree) — we check this with a depth-limited
    //     BFS over the upline chain of the candidate sponsor.
    if (referredById !== undefined) {
      if (referredById === null) {
        // Clear the sponsor. Only allow if the target user is an admin
        // (the seed admin is the only legitimate sponsor-less user).
        if (targetUser.role !== 'admin') {
          return error('Apenas administradores podem ficar sem patrocinador.', 400)
        }
        updateData.referredById = null
      } else if (typeof referredById === 'string' && referredById.trim() !== '') {
        // Resolve sponsor by id (also accept email or referralCode for
        // convenience, since the admin UI looks up sponsors by email/code).
        const trimmed = referredById.trim()
        let sponsor = await prisma.user.findUnique({ where: { id: trimmed } })
        if (!sponsor) {
          sponsor = await prisma.user.findUnique({ where: { email: trimmed.toLowerCase() } })
        }
        if (!sponsor) {
          sponsor = await prisma.user.findUnique({ where: { referralCode: trimmed.toUpperCase() } })
        }
        if (!sponsor) {
          return error('Patrocinador não encontrado. Verifique o email ou código de indicação.', 400)
        }
        if (sponsor.id === id) {
          return error('O usuário não pode ser patrocinador de si mesmo.', 400)
        }
        // Cycle check: walk the candidate sponsor's upline and bail if we hit
        // the target user id (which would mean `sponsor` is a descendant of
        // `targetUser` — making the assignment create a cycle).
        let cursor: string | null = sponsor.id
        const visited = new Set<string>()
        let depth = 0
        while (cursor && depth < 50 && !visited.has(cursor)) {
          visited.add(cursor)
          if (cursor === id) {
            return error(
              'Este patrocinador é um downline do usuário — isso criaria um ciclo na rede.',
              400,
            )
          }
          const node: any = await prisma.user.findUnique({
            where: { id: cursor },
            select: { referredById: true },
          })
          cursor = node?.referredById ?? null
          depth += 1
        }
        updateData.referredById = sponsor.id
      } else {
        return error('referredById inválido.', 400)
      }
    }

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 400)
    }

    const updated = await prisma.user.update({ where: { id }, data: updateData })

    // Remove password from response
    const { password: _password, ...safeUser } = updated

    return success(safeUser)
  } catch (err) {
    console.error('Update user error:', err)
    return error('Failed to update user', 500)
  }
}
