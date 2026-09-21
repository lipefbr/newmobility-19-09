import { prisma } from '@/lib/db'
import { success, error, sanitizeUser } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return error('User not found', 404)
    }

    // Fetch referrals (users whose referredById matches this user's id)
    const referrals = await prisma.user.findMany({
      where: { referredById: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isActive: true,
        plan: true,
      },
    })

    const safeUser = sanitizeUser(user as unknown as Record<string, unknown>)

    return success({ ...safeUser, referrals })
  } catch (err) {
    console.error('Profile fetch error:', err)
    return error('Internal server error', 500)
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      // Existing editable fields
      name,
      username,
      phone,
      address,
      city,
      state,
      bankCode,
      bankAgency,
      bankAccount,
      bankType,
      language,
      pixKey,
      pixEnabled,
      // New personal data fields
      birthDate,
      rg,
      maritalStatus,
      gender,
      education,
      zipCode,
      sponsorId,
      qualification,
      // Emergency contact
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      // Auto-debit opt-in for monthly fee (Task 13-B §4)
      autoDebitEnabled,
    } = body

    if (!userId) {
      return error('userId is required')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return error('User not found', 404)
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (username !== undefined) updateData.username = username
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (bankCode !== undefined) updateData.bankCode = bankCode
    if (bankAgency !== undefined) updateData.bankAgency = bankAgency
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount
    if (bankType !== undefined) updateData.bankType = bankType
    if (language !== undefined) updateData.language = language
    if (pixKey !== undefined) updateData.pixKey = pixKey
    if (pixEnabled !== undefined) updateData.pixEnabled = pixEnabled

    // New personal data fields
    if (birthDate !== undefined) {
      // Accept either an ISO string or null. Empty string -> null.
      if (birthDate === null || birthDate === '') {
        updateData.birthDate = null
      } else {
        const parsed = new Date(birthDate)
        if (!isNaN(parsed.getTime())) {
          updateData.birthDate = parsed
        }
      }
    }
    if (rg !== undefined) updateData.rg = rg === '' ? null : rg
    if (maritalStatus !== undefined) updateData.maritalStatus = maritalStatus === '' ? null : maritalStatus
    if (gender !== undefined) updateData.gender = gender === '' ? null : gender
    if (education !== undefined) updateData.education = education === '' ? null : education
    if (zipCode !== undefined) updateData.zipCode = zipCode === '' ? null : zipCode
    if (sponsorId !== undefined) updateData.sponsorId = sponsorId === '' ? null : sponsorId
    // Tarefa (21/09): qualification (tipo de usuário) NÃO pode ser alterado
    // pelo próprio usuário via este endpoint — só o admin pode mudar via
    // /api/admin/users/[id]. Se o usuário final enviar qualification, é
    // ignorado silenciosamente.
    // if (qualification !== undefined) updateData.qualification = qualification === '' ? null : qualification
    // ↑ linha acima comentada para bloquear auto-troca de tipo.

    // Emergency contact
    if (emergencyName !== undefined) updateData.emergencyName = emergencyName === '' ? null : emergencyName
    if (emergencyPhone !== undefined) updateData.emergencyPhone = emergencyPhone === '' ? null : emergencyPhone
    if (emergencyRelation !== undefined) updateData.emergencyRelation = emergencyRelation === '' ? null : emergencyRelation

    // Auto-debit opt-in (boolean toggle)
    if (autoDebitEnabled !== undefined) {
      updateData.autoDebitEnabled = Boolean(autoDebitEnabled)
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    return success(sanitizeUser(updatedUser as unknown as Record<string, unknown>))
  } catch (err) {
    console.error('Profile update error:', err)
    return error('Internal server error', 500)
  }
}
