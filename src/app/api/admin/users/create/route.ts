import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error, hashPassword, generateReferralCode, sanitizeUser } from '@/lib/api-utils'
import { placeUserInAllMatrices } from '@/lib/matrix-placement'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId, name, email, phone, cpf, plan, role, password, referredByCode,
      // ADM-USERTYPE — new fields: qualification (UserType code) + matrix
      // levels. When qualification matches a UserType row, its defaults are
      // applied unless the admin explicitly overrides them in the request.
      qualification,
      entradaLevel,
      residualLevel,
      vendasLevel,
    } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!name || !email || !password) {
      return error('name, email, and password are required', 400)
    }

    // Check email uniqueness
    const emailExists = await prisma.user.findUnique({ where: { email } })
    if (emailExists) return error('Email already in use', 400)

    // Check cpf uniqueness if provided
    if (cpf) {
      const cpfExists = await prisma.user.findUnique({ where: { cpf } })
      if (cpfExists) return error('CPF already in use', 400)
    }

    // Generate unique referral code
    let referralCode = generateReferralCode(name)
    let codeExists = await prisma.user.findUnique({ where: { referralCode } })
    let attempts = 0
    while (codeExists && attempts < 10) {
      referralCode = generateReferralCode(name)
      codeExists = await prisma.user.findUnique({ where: { referralCode } })
      attempts++
    }
    if (codeExists) return error('Failed to generate unique referral code', 500)

    // Resolve referral relationship
    let referredById: string | null = null
    if (referredByCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: referredByCode } })
      if (!referrer) return error('Referral code not found', 400)
      referredById = referrer.id
    }

    const hashedPassword = hashPassword(password)

    // ADM-USERTYPE — if qualification matches a UserType row, apply its
    // default matrix levels (entradaLevel/residualLevel/vendasLevel) when
    // the admin did not explicitly pass those values. This lets the admin
    // pick "Motorista" and automatically get the right level config.
    let resolvedEntradaLevel = Number(entradaLevel)
    let resolvedResidualLevel = Number(residualLevel)
    let resolvedVendasLevel = Number(vendasLevel)
    if (qualification) {
      const userType = await prisma.userType.findUnique({ where: { code: qualification } })
      if (userType) {
        if (Number.isNaN(resolvedEntradaLevel)) resolvedEntradaLevel = userType.defaultEntradaLevel
        if (Number.isNaN(resolvedResidualLevel)) resolvedResidualLevel = userType.defaultResidualLevel
        if (Number.isNaN(resolvedVendasLevel)) resolvedVendasLevel = userType.defaultVendasLevel
        // Also auto-set isDriver/isDelivery flags based on the type code
        // so the backoffice "Metas" card shows up for these users.
      }
    }
    if (Number.isNaN(resolvedEntradaLevel)) resolvedEntradaLevel = 0
    if (Number.isNaN(resolvedResidualLevel)) resolvedResidualLevel = 0
    if (Number.isNaN(resolvedVendasLevel)) resolvedVendasLevel = 0

    // Derive isDriver/isDelivery from qualification for backoffice "Metas"
    // visibility (item 7 — Metas card only for motorista/entregador and
    // equivalent conductor categories). The conductor categories that
    // should see the driver-goals/metas module are:
    //   - motorista (car/moto passenger transport)
    //   - entregador (package/food delivery)
    //   - mototaxista (moto passenger transport)
    //   - motofretista (moto package delivery)
    //   - motorista_app (ride-hailing app driver)
    //   - taxista (licensed taxi driver)
    //   - caminhoneiro (truck driver — cargo transport)
    // These are the "driver-like" profiles. Non-conductor categories
    // (cliente, lojista, outros) have isDriver=false / isDelivery=false.
    const DRIVER_QUALIFICATIONS = [
      'motorista',
      'mototaxista',
      'motorista_app',
      'taxista',
    ]
    const DELIVERY_QUALIFICATIONS = [
      'entregador',
      'motofretista',
      'caminhoneiro',
    ]
    const isDriver = DRIVER_QUALIFICATIONS.includes(qualification)
    const isDelivery = DELIVERY_QUALIFICATIONS.includes(qualification)

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        cpf: cpf || null,
        password: hashedPassword,
        plan: plan || 'free',
        role: role || 'user',
        referralCode,
        referredById,
        isActive: true,
        // ADM-USERTYPE — persist qualification + matrix levels so the admin
        // can pre-configure a user's network position at creation time.
        qualification: qualification || null,
        entradaLevel: resolvedEntradaLevel,
        residualLevel: resolvedResidualLevel,
        vendasLevel: resolvedVendasLevel,
        isDriver,
        isDelivery,
      },
    })

    // Tarefa 1 (19/09) — Posiciona o usuário nas matrizes (residual + vendas
    // sempre; entrada só se for plano pago). Antes o admin-create não chamava
    // essa lógica, deixando o usuário sem posição na matriz. Agora usa a mesma
    // lógica de spillover FIFO do registro público.
    if (referredById) {
      const isPayingMember = (plan === 'blue3' || plan === 'blue5')
      await placeUserInAllMatrices(newUser.id, referredById, isPayingMember).catch((e) => {
        console.warn('[admin-create] Failed to place user in matrices:', e)
      })
    }

    return success(sanitizeUser(newUser), 201)
  } catch (err) {
    return error('Failed to create user', 500)
  }
}
