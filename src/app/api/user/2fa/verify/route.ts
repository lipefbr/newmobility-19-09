import { db } from '@/lib/db'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, code } = body
    if (!userId || !code) return error('userId and code are required', 400)

    // Get the 2FA setup data
    const setupKey = `2fa_setup_${userId}`
    const setupConfig = await db.findOne('SystemConfig', '"key" = $1', [setupKey])

    if (!setupConfig) return error('2FA setup not found. Please start setup first.', 400)

    const setupData = JSON.parse((setupConfig as any).value)

    // In a real app, we would verify the TOTP code here
    // For demo, accept any 6-digit code
    if (code.length !== 6) return error('Invalid code. Please enter a 6-digit code.', 400)

    // Mark 2FA as enabled - upsert the setup config
    setupData.enabled = true
    const setupValue = JSON.stringify(setupData)
    const description = `2FA setup for user ${userId}`

    await prisma.systemConfig.upsert({
      where: { key: setupKey },
      update: { value: setupValue, description },
      create: { key: setupKey, value: setupValue, description },
    })

    // Also store a 2FA enabled flag - upsert
    const enabledKey = `2fa_enabled_${userId}`
    await prisma.systemConfig.upsert({
      where: { key: enabledKey },
      update: { value: 'true' },
      create: { key: enabledKey, value: 'true', description: `2FA enabled for user ${userId}` },
    })

    return success({
      enabled: true,
      backupCodes: setupData.backupCodes,
    })
  } catch (err) {
    return error('Failed to verify 2FA', 500)
  }
}
