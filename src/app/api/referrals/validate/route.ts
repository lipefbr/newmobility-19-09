import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return error('Código não informado', 400)
    }

    const referrer = await db.findOne('User', '"referralCode" = $1', [code.toUpperCase()])

    return success({
      valid: !!referrer,
      referrerName: referrer ? referrer.name : null,
    })
  } catch (err) {
    console.error('[Referrals/Validate] Error:', err)
    return success({ valid: false, referrerName: null })
  }
}
