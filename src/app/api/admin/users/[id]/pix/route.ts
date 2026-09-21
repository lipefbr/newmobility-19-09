import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUserId = req.nextUrl.searchParams.get('userId')
    if (!adminUserId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        pixKey: true,
        pixKeyType: true,
      },
    })

    if (!user) return error('User not found', 404)

    return success(user)
  } catch (err) {
    return error('Failed to fetch PIX info', 500)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId: adminUserId, pixKey, pixKeyType } = body

    if (!adminUserId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: adminUserId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) return error('User not found', 404)

    const validPixTypes = ['cpf', 'cnpj', 'phone', 'email', 'random']
    if (pixKeyType && !validPixTypes.includes(pixKeyType)) {
      return error('Invalid pixKeyType. Must be: cpf, cnpj, phone, email, random', 400)
    }

    const data: { pixKey?: string | null; pixKeyType?: string | null } = {}
    if (pixKey !== undefined) data.pixKey = pixKey || null
    if (pixKeyType !== undefined) data.pixKeyType = pixKeyType || null

    // If setting a pixKey, ensure pixKeyType is provided or already set
    if (pixKey && !pixKeyType && !existingUser.pixKeyType) {
      data.pixKeyType = 'cpf' // default to CPF
    }

    // If clearing pixKey, also clear pixKeyType
    if (!pixKey) {
      data.pixKeyType = null
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        pixKey: true,
        pixKeyType: true,
      },
    })

    return success(updatedUser)
  } catch (err) {
    return error('Failed to update PIX settings', 500)
  }
}
