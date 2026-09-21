import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error, hashPassword } from '@/lib/api-utils'

// Generate a random 10-character password using a safe alphabet (no
// ambiguous chars like O/0, l/1, I). Used when the admin clicks "Gerar
// senha" or when no explicit newPassword is provided in the request body.
function generateRandomPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  // Use crypto.randomValues for cryptographic-quality randomness so the
  // generated password is not predictable.
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

// POST /api/admin/users/[id]/reset-password
//
// Body:
//   { userId: string (admin id), newPassword?: string }
//
// - If `newPassword` is provided and >= 6 chars, it is hashed and stored.
// - If `newPassword` is omitted/empty, a random 10-char password is generated,
//   hashed, and stored.
//
// Response:
//   { password: string, message: string }
//
// The plaintext password is returned ONLY in this response so the admin can
// copy it and share it with the user out-of-band. It is never stored in
// plaintext in the database (only the sha256 hash is persisted).
//
// ADM-4 — Item 4 (Permissões login/password): lets the admin reset a user's
// password and immediately see the new credentials, without having to ask
// the dev team to dig into the database.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const { userId, newPassword } = body as {
      userId?: string
      newPassword?: string
    }

    if (!userId) return error('userId is required', 400)

    // Verify admin
    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!targetUser) return error('User not found', 404)

    // Decide on the plaintext password to set.
    let plainPassword: string
    if (typeof newPassword === 'string' && newPassword.length >= 6) {
      plainPassword = newPassword
    } else if (typeof newPassword === 'string' && newPassword.length > 0) {
      // Provided but too short — reject so the admin knows the password
      // they typed isn't acceptable rather than silently replacing it.
      return error('A senha deve ter pelo menos 6 caracteres', 400)
    } else {
      // No password provided — auto-generate a secure one.
      plainPassword = generateRandomPassword(10)
    }

    const hashed = hashPassword(plainPassword)

    await prisma.user.update({
      where: { id },
      data: { password: hashed },
    })

    return success({
      password: plainPassword,
      email: targetUser.email,
      name: targetUser.name,
      message: 'Senha redefinida com sucesso. Compartilhe as credenciais abaixo com o usuário.',
    })
  } catch (err) {
    console.error('Reset password error:', err)
    return error('Failed to reset password', 500)
  }
}
