import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/gratifications-config/benefit
// ----------------------------------------------------------------------------
// Tarefa (22/09): editar nome, valor e descrição de um benefício individual.
// PUT body: { userId, benefitType, name, amount, description }
// ============================================================================

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, benefitType, name, amount, description } = body

    if (!userId) return error('userId is required', 400)
    if (!benefitType) return error('benefitType is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // Armazena a edição do benefício como SystemConfig
    // Chave: metas.benefit.{benefitType}.name, .amount, .description
    const updates = [
      { key: `metas.benefit.${benefitType}.name`, value: String(name || ''), description: `Nome do benefício ${benefitType}` },
      { key: `metas.benefit.${benefitType}.amount`, value: String(Math.floor(Number(amount) || 0)), description: `Valor do benefício ${benefitType} em centavos` },
      { key: `metas.benefit.${benefitType}.description`, value: String(description || ''), description: `Descrição do benefício ${benefitType}` },
    ]

    for (const u of updates) {
      await prisma.systemConfig.upsert({
        where: { key: u.key },
        update: { value: u.value, description: u.description, category: 'metas' },
        create: { key: u.key, value: u.value, description: u.description, category: 'metas' },
      })
    }

    return success({ benefitType, name, amount: Number(amount) || 0, description })
  } catch (err) {
    console.error('Benefit edit error:', err)
    return error('Failed to update benefit', 500)
  }
}
