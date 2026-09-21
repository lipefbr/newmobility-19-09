import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'

/**
 * POST /api/billing/ensure-monthly
 *
 * Garante que todo usuário com plano ativo (não-free) tenha uma fatura mensal
 * pendente para pagar. Se o usuário não tem nenhuma fatura pendente do tipo
 * plan_, cria uma nova com vencimento em 30 dias.
 *
 * "Todo mês ele zera e tem que pagar de novo" — esta rota é o gatilho que
 * pode ser chamado por um cron job mensal ou manualmente pelo admin.
 *
 * Body (opcional): { userId } — restringe a um usuário específico.
 * Quando omitido, verifica TODOS os usuários ativos com plano pago.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession(request)
    if (!session) {
      return error('Unauthorized', 401)
    }

    // Apenas admin pode rodar em lote (sem userId)
    const body = await request.json().catch(() => ({} as any))
    const targetUserId = body?.userId as string | undefined

    const caller = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!caller) {
      return error('User not found', 404)
    }
    const isAdmin = caller.role === 'admin'

    if (!targetUserId && !isAdmin) {
      return error('Admin access required to scan all users', 403)
    }

    // Determinar quais usuários verificar
    const userWhere: any = {
      plan: { not: 'free' },
      isActive: true,
    }
    if (targetUserId) {
      userWhere.id = targetUserId
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, plan: true, userType: true },
    })

    const now = new Date()
    let created = 0
    let skipped = 0
    const createdInvoices: any[] = []

    // Valor mensal por plano (em centavos)
    const PLAN_MONTHLY_FEE: Record<string, number> = {
      blue3: 4990,    // R$ 49,90
      blue5: 9990,    // R$ 99,90
      premium1: 14990, // R$ 149,90
      premium2: 24990, // R$ 249,90
      premium3: 49990, // R$ 499,90
      premium4: 99990, // R$ 999,90
      premium5: 99990, // R$ 999,90
    }

    for (const user of users) {
      try {
        // Verificar se já existe uma fatura pendente do tipo plan_ com vencimento futuro
        const existingPending = await prisma.invoice.findFirst({
          where: {
            userId: user.id,
            status: 'pending',
            type: { startsWith: 'plan_' },
            dueDate: { gt: now },
          },
          select: { id: true },
        })

        if (existingPending) {
          skipped++
          continue
        }

        // Determinar o valor e tipo da fatura
        const planCode = user.plan || 'blue3'
        const amount = PLAN_MONTHLY_FEE[planCode] ?? 9990 // default R$ 99,90
        const invoiceType = `plan_subscription_${planCode}`
        const nextDueDate = new Date(now)
        nextDueDate.setDate(nextDueDate.getDate() + 30)

        const invoice = await prisma.invoice.create({
          data: {
            userId: user.id,
            amount,
            type: invoiceType,
            status: 'pending',
            dueDate: nextDueDate,
            description: `Renovação mensal — Plano ${planCode.toUpperCase()}`,
          },
        })

        // Notificar o usuário
        try {
          await prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Fatura mensal disponível 📅',
              message: `Sua fatura de renovação do plano (${new Intl.NumberFormat(
                'pt-BR',
                { style: 'currency', currency: 'BRL' }
              ).format(amount / 100)}) vence em ${nextDueDate.toLocaleDateString(
                'pt-BR'
              )}. Acesse "Pagar Faturas" para pagar e evitar bloqueios.`,
              type: 'invoice',
            },
          })
        } catch (notifErr) {
          console.warn('[ensure-monthly] notification failed:', notifErr)
        }

        created++
        createdInvoices.push({
          userId: user.id,
          userName: user.name,
          invoiceId: invoice.id,
          amount,
          dueDate: nextDueDate,
        })
      } catch (userErr) {
        console.error(`[ensure-monthly] error for user ${user.id}:`, userErr)
      }
    }

    return success({
      scanned: users.length,
      created,
      skipped,
      createdInvoices: createdInvoices.slice(0, 50), // limit response size
    })
  } catch (err) {
    console.error('POST /api/billing/ensure-monthly error:', err)
    return error('Internal server error', 500)
  }
}
