import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/system-settings/[id] — UPDATE and DELETE for one setting
// ----------------------------------------------------------------------------
// CONFIG-EXPAND — added:
//   1. Validation for value before saving. The validation rule is selected by
//      the setting's KEY (not its category) so it works for any custom entry
//      the admin creates via POST as well:
//        - key contains "pct"          → 0 <= float(value) <= 100
//        - key contains "cents"        → non-negative integer (>= 0)
//        - key contains "_levels" or
//          "levels"                    → non-negative integer (>= 0)
//      ("non-negative" instead of strictly "positive" because the seed uses
//       0 as a sentinel for "disabled"/"not unlocked" — e.g.
//       plan.blue3.cashback_levels_residual = "0" means Blue3 doesn't unlock
//       residual, saque.auto_approve_below_cents = "0" disables auto-approve,
//       plan.free.max_withdrawals = "0" means the free plan can't withdraw.)
//   2. AuditLog entry on every UPDATE / DELETE — records the admin's userId,
//      the action ('system_settings.update' / 'system_settings.delete'),
//      the affected SystemConfig id, and a JSON details payload with the
//      previous + new value so a future audit trail can reconstruct any
//      change. Failures writing the audit row are logged to stderr but do
//      NOT break the user-facing response.
// ============================================================================

// ----------------------------------------------------------------------------
// validateSettingValue
// Returns an error message string if validation fails, or null if the value
// is acceptable (or if no rule applies to this key).
// ----------------------------------------------------------------------------
function validateSettingValue(key: string, value: string): string | null {
  const v = value.trim()
  if (v === '') return 'Valor não pode ser vazio'

  const lower = key.toLowerCase()

  // Percentage: 0–100 inclusive, decimals allowed (e.g. vendas 0.9%).
  if (lower.includes('pct')) {
    const n = Number(v)
    if (!Number.isFinite(n)) return `Valor de porcentagem inválido para "${key}": "${v}" não é um número`
    if (n < 0 || n > 100) return `Porcentagem para "${key}" deve estar entre 0 e 100 (recebido: ${v})`
    return null
  }

  // Cents (money amounts in centavos): non-negative integer.
  if (lower.includes('cents')) {
    if (!/^\d+$/.test(v)) return `Valor em centavos para "${key}" deve ser um inteiro não-negativo (recebido: "${v}")`
    const n = Number(v)
    if (!Number.isInteger(n) || n < 0) return `Valor em centavos para "${key}" deve ser um inteiro não-negativo (recebido: ${v})`
    return null
  }

  // Levels (matrix levels / cashback levels unlocked): non-negative integer.
  if (lower.includes('_levels') || lower.includes('levels')) {
    if (!/^\d+$/.test(v)) return `Quantidade de níveis para "${key}" deve ser um inteiro não-negativo (recebido: "${v}")`
    const n = Number(v)
    if (!Number.isInteger(n) || n < 0) return `Quantidade de níveis para "${key}" deve ser um inteiro não-negativo (recebido: ${v})`
    return null
  }

  return null
}

// ----------------------------------------------------------------------------
// writeAuditLog
// Writes a single AuditLog row. Failures are swallowed (logged to stderr)
// so the user-facing API response is never broken just because the audit
// row couldn't be saved.
// ----------------------------------------------------------------------------
async function writeAuditLog(params: {
  userId: string
  action: string
  entityId: string
  details: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: 'SystemConfig',
        entityId: params.entityId,
        details: JSON.stringify(params.details),
      },
    })
  } catch (e) {
    console.error('Failed to write system-settings audit log:', e)
  }
}

// PUT /api/admin/system-settings/[id]
// Body: { userId, value?, description?, category? }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { userId, value, description, category } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.systemConfig.findUnique({ where: { id } })
    if (!existing) return error('Configuração não encontrada', 404)

    const data: Record<string, unknown> = {}
    if (typeof value === 'string' && value.trim()) {
      // Validate the new value against the rule for this key.
      const validationError = validateSettingValue(existing.key, value)
      if (validationError) return error(validationError, 400)
      data.value = value.trim()
    }
    if (description !== undefined) {
      data.description =
        typeof description === 'string' && description.trim() ? description.trim() : null
    }
    if (category !== undefined) {
      data.category =
        typeof category === 'string' && category.trim() ? category.trim() : 'geral'
    }

    if (Object.keys(data).length === 0) {
      return error('Nenhum campo para atualizar', 400)
    }

    const updated = await prisma.systemConfig.update({ where: { id }, data })

    // Audit log: capture the previous value (only when value actually changed)
    // so a future audit trail can reconstruct what was edited.
    await writeAuditLog({
      userId,
      action: 'system_settings.update',
      entityId: id,
      details: {
        key: existing.key,
        category: existing.category,
        previousValue: existing.value,
        newValue: updated.value,
        valueChanged: existing.value !== updated.value,
        descriptionChanged: existing.description !== updated.description,
        categoryChanged: existing.category !== updated.category,
      },
    })

    return success({
      message: 'Configuração atualizada com sucesso',
      item: {
        id: updated.id,
        key: updated.key,
        value: updated.value,
        description: updated.description,
        category: updated.category,
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    console.error('Admin system-settings PUT error:', err)
    return error('Failed to update system setting', 500)
  }
}

// DELETE /api/admin/system-settings/[id]?userId=<adminId>
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const existing = await prisma.systemConfig.findUnique({ where: { id } })
    if (!existing) return error('Configuração não encontrada', 404)

    await prisma.systemConfig.delete({ where: { id } })

    // Audit log: snapshot the deleted row so we can recover what was removed.
    await writeAuditLog({
      userId,
      action: 'system_settings.delete',
      entityId: id,
      details: {
        key: existing.key,
        category: existing.category,
        deletedValue: existing.value,
        deletedDescription: existing.description,
      },
    })

    return success({ message: 'Configuração excluída com sucesso' })
  } catch (err) {
    console.error('Admin system-settings DELETE error:', err)
    return error('Failed to delete system setting', 500)
  }
}
