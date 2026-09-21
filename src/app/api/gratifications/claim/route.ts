import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { isKycApproved } from '@/lib/kyc'

function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  const random2 = Math.random().toString(36).substring(2, 10)
  return `c${timestamp}${random}${random2}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, gratificationId, claimType } = body

    if (!userId || !gratificationId) {
      return error('userId e gratificationId são obrigatórios')
    }

    // Validate claimType
    const validClaimTypes = ['balance', 'prize']
    const resolvedClaimType = validClaimTypes.includes(claimType) ? claimType : 'balance'

    // Find the gratification
    const gratification = await db.findOne('Gratification', '"id" = $1', [gratificationId])

    if (!gratification) {
      return error('Gratificação não encontrada', 404)
    }

    if (gratification.userId !== userId) {
      return error('Gratificação não pertence a este usuário', 403)
    }

    if (gratification.isClaimed) {
      return error('Gratificação já foi reivindicada', 400)
    }

    // Find the user
    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) {
      return error('Usuário não encontrado', 404)
    }

    // KYC gate: block gratification/cashback claims if user's KYC is not
    // approved (admins bypass).
    if (user.role !== 'admin' && user.userType !== 'admin' && user.userType !== 'ADMIN') {
      const kycOk = await isKycApproved(user.id as string)
      if (!kycOk) {
        return error(
          'KYC não aprovado. Complete sua verificação de documentos na aba KYC para resgatar gratificações.',
          403
        )
      }
    }

    // Mark as claimed
    await db.update(
      'Gratification',
      '"id" = $1',
      {
        isClaimed: true,
        claimedAt: new Date().toISOString(),
      },
      [gratificationId]
    )

    if (resolvedClaimType === 'balance') {
      // Add to appropriate balance based on category
      let balanceField = 'balanceGratification'
      if (gratification.category === 'mobility') balanceField = 'balanceMobility'
      else if (gratification.category === 'shopping') balanceField = 'balanceShopping'
      else if (gratification.category === 'withdrawal') balanceField = 'balanceWithdrawal'

      const currentBalance = (user as any)[balanceField] as number
      const newBalance = (currentBalance || 0) + (gratification.amount || 0)

      await db.update(
        'User',
        '"id" = $1',
        { [balanceField]: newBalance },
        [userId]
      )

      // Create transaction
      await db.insert('Transaction', {
        id: generateId(),
        userId,
        type: 'gratification',
        amount: gratification.amount,
        status: 'approved',
        category: 'gratification',
        description: `Gratificação resgatada: ${gratification.type} (saldo)`,
      })

      return success({
        gratification: { ...gratification, isClaimed: true, claimedAt: new Date().toISOString() },
        claimType: 'balance',
        balanceField,
        newBalance,
        message: 'Gratificação adicionada ao saldo com sucesso!',
      })
    }

    if (resolvedClaimType === 'prize') {
      // Create a support ticket requesting the prize
      const ticket = await db.insert('Ticket', {
        id: generateId(),
        userId,
        subject: `Solicitação de Prêmio: ${gratification.type}`,
        category: 'gratification',
        status: 'open',
      })

      await db.insert('TicketMessage', {
        id: generateId(),
        ticketId: (ticket as any).id,
        userId,
        message: `Olá! Gostaria de solicitar o prêmio referente à gratificação "${gratification.type}" no valor de ${gratification.amount} centavos. Agradeço desde já!`,
        isAdmin: false,
      })

      // Create transaction record for tracking
      await db.insert('Transaction', {
        id: generateId(),
        userId,
        type: 'gratification',
        amount: gratification.amount,
        status: 'pending',
        category: 'gratification',
        description: `Gratificação resgatada: ${gratification.type} (prêmio solicitado)`,
      })

      return success({
        gratification: { ...gratification, isClaimed: true, claimedAt: new Date().toISOString() },
        claimType: 'prize',
        ticketId: (ticket as any).id,
        message: 'Solicitação de prêmio criada com sucesso! Acompanhe pelo suporte.',
      })
    }

    return error('Tipo de reivindicação inválido')
  } catch (err) {
    console.error('[Gratifications Claim] Error:', err)
    return error('Erro interno do servidor. Tente novamente.', 500)
  }
}
