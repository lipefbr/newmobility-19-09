import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/service-types
// ----------------------------------------------------------------------------
// CRUD for the ServiceType table. Admin-only.
//
// GET  ?userId=<adminId>            → list ALL service types (active + inactive)
// POST { userId, name, icon?, isActive?, sortOrder? }  → create a new type
//
// IMPORTANTE: NÃO sedia mais categorias padrão automaticamente. Se a tabela
// estiver vazia, retorna { types: [] } — o admin deve popular manualmente via
// este endpoint. A tela "Escritório Virtual" passa a exibir EXCLUSIVAMENTE
// os serviços cadastrados aqui (não há mais lista hardcoded no código).
// ============================================================================

async function requireAdmin(userId: string | null) {
  if (!userId) return null
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, userType: true },
  })
  if (!admin || (admin.role !== 'admin' && admin.userType !== 'admin')) {
    return null
  }
  return admin
}

// GET — list all service types (admin view, includes inactive)
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    const types = await prisma.serviceType.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return success({ types })
  } catch (err) {
    console.error('Admin service-types GET error:', err)
    return error('Failed to fetch service types', 500)
  }
}

// POST — create a new service type
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, name, icon = null, isActive = true, sortOrder = 99 } = body

    const admin = await requireAdmin(userId)
    if (!admin) return error('Unauthorized', 403)

    if (!name || typeof name !== 'string' || !name.trim()) {
      return error('name é obrigatório', 400)
    }

    const trimmedName = name.trim()

    const existing = await prisma.serviceType.findUnique({ where: { name: trimmedName } })
    if (existing) return error('Já existe um tipo de serviço com este nome', 400)

    const created = await prisma.serviceType.create({
      data: {
        name: trimmedName,
        icon: icon || null,
        isActive: Boolean(isActive),
        sortOrder: Number(sortOrder) || 99,
      },
    })

    return success(created, 201)
  } catch (err) {
    console.error('Admin service-types POST error:', err)
    return error('Failed to create service type', 500)
  }
}
