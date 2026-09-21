import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { resetCodes } from '@/lib/reset-codes'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return error('Email is required')
    }

    const user = await db.findOne('User', '"email" = $1', [email])
    if (!user) {
      // Don't reveal if email exists - always return success for security
      return success({ message: 'If an account with this email exists, a reset code has been sent.' })
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = Date.now() + 15 * 60 * 1000 // 15 minutes

    resetCodes.set(email, { code, expires })

    // Mock: In production, send email with the code
    console.log(`[MOCK EMAIL] Reset code for ${email}: ${code}`)

    return success({
      message: 'If an account with this email exists, a reset code has been sent.',
      // In development, return the code for testing
      ...(process.env.NODE_ENV === 'development' && { _code: code }),
    })
  } catch (err) {
    console.error('Forgot password error:', err)
    return error('Internal server error', 500)
  }
}
