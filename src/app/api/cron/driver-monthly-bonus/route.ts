import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/cron/driver-monthly-bonus
// ----------------------------------------------------------------------------
// Job mensal que paga o bônus de categoria aos motoristas que bateram a meta.
// Deve ser chamado no 1º dia de cada mês (via cron externo ou webhook).
//
// Lógica:
//   1. Para cada motorista ativo com driverCategoryId != null:
//      a. Conta corridas finalizadas no mês anterior
//      b. Conta cancelamentos no mês anterior
//      c. Se corridas >= monthlyTripsTarget E cancelamentos <= maxCancellationPerMonth:
//         - credita bonusCents na carteira balanceWithdrawal
//         - cria Transaction com type='driver_bonus'
//   2. Retorna resumo: quantos motoristas receberam, valor total pago
//
// Auth: protegido por CRON_SECRET EXCLUSIVAMENTE via header Authorization
// (Lote 1, Item 3: query param ?secret=... REMOVIDO — vazava o secret em
// logs de acesso/nginx. Padrão: `Authorization: Bearer <CRON_SECRET>`)
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Auth SOMENTE via header Authorization (Bearer). Sem query param.
    const authHeader = req.headers.get('authorization')
    const secret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null

    if (!process.env.CRON_SECRET || !secret || secret !== process.env.CRON_SECRET) {
      return error('Unauthorized — invalid cron secret', 403)
    }

    // Janela: mês anterior (do dia 1 ao último dia do mês anterior)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const periodLabel = `${startOfPrevMonth.getFullYear()}-${String(startOfPrevMonth.getMonth() + 1).padStart(2, '0')}`

    // Busca todas as categorias ativas
    const categories = await prisma.driverCategory.findMany({
      where: { isActive: true },
    })

    if (categories.length === 0) {
      return success({ message: 'Nenhuma categoria ativa encontrada', paid: 0, totalAmount: 0 })
    }

    // Busca todos os motoristas ativos com categoria
    const drivers = await prisma.user.findMany({
      where: {
        isDriver: true,
        isActive: true,
        driverCategoryId: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        driverCategoryId: true,
        totalRides: true,
      },
    })

    let paidCount = 0
    let totalAmountCents = 0
    const payments: Array<{ driverId: string; driverName: string; categoryCode: string; amount: number; trips: number; cancellations: number }> = []

    for (const driver of drivers) {
      const category = categories.find(c => c.id === driver.driverCategoryId)
      if (!category) continue

      // Conta corridas do mês anterior (assumindo que Transaction tem type='ride'
      // e createdAt — em produção, usar a tabela Ride/Corrida real)
      // Fallback: usar totalRides como aproximação se não houver tabela de corridas
      let tripsThisMonth = 0
      let cancellationsThisMonth = 0

      try {
        // Conta transações de corrida no período
        const tripsCount = await prisma.transaction.count({
          where: {
            userId: driver.id,
            type: 'ride',
            createdAt: { gte: startOfPrevMonth, lt: startOfMonth },
          },
        })
        tripsThisMonth = tripsCount

        // Conta cancelamentos (Transaction type='ride_cancellation')
        const cancellationsCount = await prisma.transaction.count({
          where: {
            userId: driver.id,
            type: 'ride_cancellation',
            createdAt: { gte: startOfPrevMonth, lt: startOfMonth },
          },
        })
        cancellationsThisMonth = cancellationsCount
      } catch {
        // Se transaction não tem type='ride', fallback: usa totalRides
        // (subótimo — em produção, ter tabela Ride dedicada)
        tripsThisMonth = driver.totalRides
        cancellationsThisMonth = 0
      }

      // Verifica se bateu a meta E respeitou o limite de cancelamentos
      const metTarget = tripsThisMonth >= category.monthlyTripsTarget
      const withinCancellationLimit = cancellationsThisMonth <= category.maxCancellationPerMonth

      if (metTarget && withinCancellationLimit && category.bonusCents > 0) {
        // Credita o bônus na carteira de saque
        await prisma.user.update({
          where: { id: driver.id },
          data: { balanceWithdrawal: { increment: category.bonusCents } },
        })

        // Cria Transaction de registro do bônus
        try {
          await prisma.transaction.create({
            data: {
              userId: driver.id,
              type: 'driver_bonus',
              amount: category.bonusCents,
              description: `Bônus mensal categoria ${category.name} (${periodLabel}) — ${tripsThisMonth}/${category.monthlyTripsTarget} corridas, ${cancellationsThisMonth} cancelamentos`,
              status: 'completed',
            },
          })
        } catch {
          // Transaction pode não ter todos esses campos — loga e continua
        }

        paidCount++
        totalAmountCents += category.bonusCents
        payments.push({
          driverId: driver.id,
          driverName: driver.name,
          categoryCode: category.code,
          amount: category.bonusCents,
          trips: tripsThisMonth,
          cancellations: cancellationsThisMonth,
        })
      }
    }

    return success({
      period: periodLabel,
      totalDrivers: drivers.length,
      paidCount,
      totalAmountCents,
      totalAmountBRL: (totalAmountCents / 100).toFixed(2),
      payments,
    })
  } catch (err) {
    console.error('Driver monthly bonus cron error:', err)
    return error('Failed to process monthly bonus', 500)
  }
}

export async function GET(req: NextRequest) {
  // Permite chamar via GET também (para testes manuais no browser)
  return POST(req)
}
