import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

/**
 * TalkMobi subscription request API.
 *
 *   POST /api/talkmobi/subscribe        — user submits/updates their subscription request
 *   GET  /api/talkmobi/subscribe?userId=X — fetches the user's most recent request
 *
 * Mirrors the Telemedicina activation flow: a user picks a TalkMobi plan and
 * asks the admin to activate it. The admin reviews in the panel and approves
 * (attaching an ICCID / eSIM link / activation URL) or rejects with a reason.
 *
 * A user may have at most ONE active (status === 'pending') request per plan
 * at a time. If they submit again while a pending request exists for the same
 * plan, we update it in place (so they can correct typos). If a previous
 * request was approved or rejected, a new submission creates a new row.
 */

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    // Return the user's most recent subscription request across all plans,
    // plus any other active ones (so the UI can show "you already have a
    // pending request for X" if they try to subscribe to a second plan).
    const rows = await prisma.talkMobiSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    if (!rows.length) {
      return success({ request: null, requests: [] })
    }

    return success({
      // The "primary" request shown in the status card — most recent one.
      request: serialize(rows[0]),
      // All of the user's requests, for the UI to dedupe / show history.
      requests: rows.map(serialize),
    })
  } catch (err) {
    console.error('TalkMobi subscribe GET error:', err)
    return error('Failed to fetch TalkMobi subscription request', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      planId,
      fullName,
      cpf,
      birthDate,
      phone,
      email,
      zipCode,
      street,
      number,
      complement,
      district,
      city,
      state,
      notes,
    } = body ?? {}

    if (!userId) return error('userId is required', 400)
    if (!planId) return error('planId is required', 400)
    if (!fullName || !cpf || !phone || !email) {
      return error('fullName, cpf, phone e email são obrigatórios', 400)
    }

    // Verify the user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return error('Usuário não encontrado', 404)

    // Look up the plan so we can snapshot its price / cashback / reward points
    // at request time. This protects us if the admin edits the plan later.
    const plan = await prisma.talkMobiPlan.findUnique({ where: { id: String(planId) } })
    if (!plan || !plan.isActive) {
      return error('Plano TalkMobi não encontrado ou inativo', 404)
    }

    // Block new subscription requests for free-plan users (they must pay their
    // own platform subscription first). Admins bypass this check.
    if (user.plan === 'free' && user.role !== 'admin') {
      return error('Você precisa assinar um plano da NewMobility antes de contratar o TalkMobi. Acesse "Meu Plano".', 403)
    }

    // Check for an existing PENDING request for the SAME plan — update in
    // place instead of creating duplicates. (Approved/rejected requests stay
    // archived; a new submission creates a fresh row in those cases.)
    const existing = await prisma.talkMobiSubscription.findFirst({
      where: { userId, planId: plan.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })

    const baseData = {
      planId: plan.id,
      planName: plan.name,
      dataAmount: plan.dataAmount,
      priceCents: plan.priceCents,
      cashbackCents: plan.cashbackCents,
      rewardPoints: plan.rewardPoints,
      fullName: String(fullName),
      cpf: String(cpf),
      birthDate: birthDate ? String(birthDate) : null,
      phone: String(phone),
      email: String(email),
      zipCode: zipCode ? String(zipCode) : null,
      street: street ? String(street) : null,
      number: number ? String(number) : null,
      complement: complement ? String(complement) : null,
      district: district ? String(district) : null,
      city: city ? String(city) : null,
      state: state ? String(state) : null,
      notes: notes ? String(notes) : null,
    }

    if (existing) {
      const updated = await prisma.talkMobiSubscription.update({
        where: { id: existing.id },
        data: baseData,
      })
      return success({ request: serialize(updated), message: 'Pedido de assinatura atualizado com sucesso.' })
    }

    const created = await prisma.talkMobiSubscription.create({
      data: { ...baseData, userId, status: 'pending' },
    })

    // Notify admins in-app (best-effort; not all admin notification flows
    // read this, but it leaves an audit trail). Non-fatal if it fails.
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'admin' },
        select: { id: true },
        take: 50,
      })
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: 'system',
            title: 'Novo pedido de assinatura TalkMobi 📱',
            message: `${String(fullName)} solicitou o plano ${plan.name} (${plan.dataAmount}). Abra "Assinaturas TalkMobi" no painel admin para revisar.`,
            isRead: false,
          })),
        })
      }
    } catch (nErr) {
      console.error('Failed to notify admins of new TalkMobi subscription (non-fatal):', nErr)
    }

    return success(
      { request: serialize(created), message: 'Pedido de assinatura enviado com sucesso! Nossa equipe irá analisar.' },
      201,
    )
  } catch (err) {
    console.error('TalkMobi subscribe POST error:', err)
    return error('Failed to submit TalkMobi subscription request', 500)
  }
}

function serialize(r: any) {
  return {
    id: r.id,
    userId: r.userId,
    planId: r.planId,
    planName: r.planName,
    dataAmount: r.dataAmount,
    priceCents: r.priceCents,
    cashbackCents: r.cashbackCents,
    rewardPoints: r.rewardPoints,
    fullName: r.fullName,
    cpf: r.cpf,
    birthDate: r.birthDate ?? null,
    phone: r.phone,
    email: r.email,
    zipCode: r.zipCode ?? null,
    street: r.street ?? null,
    number: r.number ?? null,
    complement: r.complement ?? null,
    district: r.district ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    notes: r.notes ?? null,
    status: r.status,
    adminNotes: r.adminNotes ?? null,
    activationLink: r.activationLink ?? null,
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    rejectedAt: r.rejectedAt ? r.rejectedAt.toISOString() : null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
  }
}
