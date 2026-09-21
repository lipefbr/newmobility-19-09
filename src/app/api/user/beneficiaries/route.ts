import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { NextRequest } from 'next/server'

// GET /api/user/beneficiaries?userId=xxx - List beneficiaries for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return error('userId is required')
    }

    const beneficiaries = await prisma.beneficiary.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })

    return success({ beneficiaries })
  } catch (err) {
    console.error('Beneficiaries GET error:', err)
    return error('Erro ao buscar beneficiários', 500)
  }
}

// POST /api/user/beneficiaries - Create a new beneficiary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, cpf, relationship, percentage, age } = body

    if (!userId || !name || !relationship || percentage === undefined) {
      return error('userId, nome, relação e percentual são obrigatórios')
    }

    if (percentage < 1 || percentage > 100) {
      return error('Percentual deve ser entre 1 e 100')
    }

    // Check total percentage doesn't exceed 100
    const existing = await prisma.beneficiary.findMany({
      where: { userId },
      select: { percentage: true },
    })
    const currentTotal = existing.reduce(
      (sum: number, b: { percentage: number }) => sum + (b.percentage || 0),
      0
    )

    if (currentTotal + percentage > 100) {
      return error(
        `Total de percentuais excederia 100%. Disponível: ${100 - currentTotal}%`
      )
    }

    // Verify the user exists before creating beneficiary
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return error('Usuário não encontrado', 404)
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        userId,
        name,
        cpf: cpf || null,
        relationship,
        percentage,
        age: age !== undefined && age !== null ? Number(age) : null,
      },
    })

    return success({ beneficiary }, 201)
  } catch (err) {
    console.error('Beneficiary POST error:', err)
    return error('Erro ao criar beneficiário', 500)
  }
}

// PUT /api/user/beneficiaries - Update a beneficiary
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, userId, name, cpf, relationship, percentage, age } = body

    if (!id || !userId) {
      return error('id e userId são obrigatórios')
    }

    // Verify ownership (must match both id and userId)
    const existing = await prisma.beneficiary.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return error('Beneficiário não encontrado', 404)
    }

    if (percentage !== undefined) {
      // Check total percentage doesn't exceed 100 (excluding current)
      const allBeneficiaries = await prisma.beneficiary.findMany({
        where: { userId },
        select: { id: true, percentage: true },
      })
      const otherTotal = allBeneficiaries
        .filter((b: { id: string }) => b.id !== id)
        .reduce(
          (sum: number, b: { percentage: number }) => sum + (b.percentage || 0),
          0
        )

      if (otherTotal + percentage > 100) {
        return error(
          `Total de percentuais excederia 100%. Disponível: ${100 - otherTotal}%`
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (cpf !== undefined) updateData.cpf = cpf || null
    if (relationship !== undefined) updateData.relationship = relationship
    if (percentage !== undefined) updateData.percentage = percentage
    if (age !== undefined) updateData.age = age === null ? null : Number(age)

    const updated = await prisma.beneficiary.update({
      where: { id },
      data: updateData,
    })

    return success({ beneficiary: updated })
  } catch (err) {
    console.error('Beneficiary PUT error:', err)
    return error('Erro ao atualizar beneficiário', 500)
  }
}

// DELETE /api/user/beneficiaries?id=xxx&userId=xxx - Delete a beneficiary
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!id || !userId) {
      return error('id e userId são obrigatórios')
    }

    // Verify ownership before deleting
    const existing = await prisma.beneficiary.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return error('Beneficiário não encontrado', 404)
    }

    await prisma.beneficiary.delete({ where: { id } })

    return success({ message: 'Beneficiário removido com sucesso' })
  } catch (err) {
    console.error('Beneficiary DELETE error:', err)
    return error('Erro ao remover beneficiário', 500)
  }
}
