import { db } from '@/lib/db'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { randomBytes } from 'crypto'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId } = body
    if (!userId) return error('userId is required', 400)

    const user = await db.findOne('User', '"id" = $1', [userId])
    if (!user) return error('User not found', 404)

    // Generate a secret key for TOTP
    const secret = randomBytes(20).toString('base64').replace(/[=+/]/g, '').substring(0, 16)
    const secretKey = `NM-${secret.substring(0, 4)}-${secret.substring(4, 8)}-${secret.substring(8, 12)}-${secret.substring(12, 16)}`

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => {
      const code = randomBytes(4).toString('hex').toUpperCase()
      return `NM-${code.substring(0, 4)}-${code.substring(4, 8)}`
    })

    // Store the setup temporarily in SystemConfig using upsert
    const setupKey = `2fa_setup_${userId}`
    const setupValue = JSON.stringify({ secretKey, backupCodes, enabled: false })
    const description = `2FA setup for user ${userId}`

    await prisma.systemConfig.upsert({
      where: { key: setupKey },
      update: { value: setupValue, description },
      create: { key: setupKey, value: setupValue, description },
    })

    return success({
      secretKey,
      backupCodes,
      otpauthUrl: `otpauth://totp/NewMobility:${(user as any).email}?secret=${secret}&issuer=NewMobility`,
    })
  } catch (err) {
    return error('Failed to setup 2FA', 500)
  }
}
