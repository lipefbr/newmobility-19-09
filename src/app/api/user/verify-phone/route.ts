import { db } from '@/lib/db'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId } = body
    if (!userId) return error('userId is required', 400)

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) return error('User not found', 404)

    // Simulate phone verification - create a notification
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    await db.insert('Notification', {
      userId,
      title: 'Verificação de Telefone',
      message: `Seu código de verificação SMS é: ${code}. Use este código para verificar seu telefone.`,
      type: 'info',
    })

    // Store verification code using upsert
    const verifyKey = `phone_verify_${userId}`
    const verifyValue = JSON.stringify({ code, verified: false, sentAt: new Date().toISOString() })
    const description = `Phone verification for user ${userId}`

    await prisma.systemConfig.upsert({
      where: { key: verifyKey },
      update: { value: verifyValue, description },
      create: { key: verifyKey, value: verifyValue, description },
    })

    return success({ message: 'Verification SMS sent (simulated)', code: code })
  } catch (err) {
    return error('Failed to send verification SMS', 500)
  }
}
