import { db } from '@/lib/db'
import { success, error, hashPassword } from '@/lib/api-utils'
import { resetCodes } from '@/lib/reset-codes'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, code, newPassword } = body

    if (!email || !code || !newPassword) {
      return error('Email, code, and newPassword are required')
    }

    if (newPassword.length < 6) {
      return error('Password must be at least 6 characters')
    }

    // Verify code
    const stored = resetCodes.get(email)
    if (!stored) {
      return error('No reset code found. Please request a new one.')
    }

    if (stored.code !== code) {
      return error('Invalid reset code')
    }

    if (Date.now() > stored.expires) {
      resetCodes.delete(email)
      return error('Reset code expired. Please request a new one.')
    }

    // Find user
    const user = await db.findOne('User', '"email" = $1', [email])
    if (!user) {
      return error('User not found', 404)
    }

    // Update password
    const hashedPassword = hashPassword(newPassword)
    await db.update('User', '"id" = $1', { password: hashedPassword }, [user.id])

    // Clear used code
    resetCodes.delete(email)

    return success({ message: 'Password has been reset successfully.' })
  } catch (err) {
    console.error('Reset password error:', err)
    return error('Internal server error', 500)
  }
}
