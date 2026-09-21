import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/admin/matrix-config — Manage limites financeiros das 3 matrizes MMN
// ----------------------------------------------------------------------------
// Tarefa 2 (19/09): os 3 limites agora são editáveis em R$ (centavos):
//   - matrix.entrada.limit_cents  → R$ 96.500,00 (default, mantido)
//   - matrix.residual.limit_cents → R$ 750.000,00 (default, mantido)
//   - matrix.vendas.limit_cents   → 0 ("a definir" — cliente vai definir)
//
// Antes: existia só "matrix.vendas.salesLimit" em QUANTIDADE de vendas (1000).
// Essa chave legada foi removida do seed e substituída por limit_cents em R$.
//
// Audit logging: cada alteração cria AuditLog com action específica por matriz.
// ============================================================================

type MatrixKind = 'entrada' | 'residual' | 'vendas'

const LIMIT_CONFIG: Record<MatrixKind, { key: string; action: string; defaultCents: number; label: string }> = {
  entrada: {
    key: 'matrix.entrada.limit_cents',
    action: 'matrix.entrada.limit.update',
    defaultCents: 9650000, // R$ 96.500,00
    label: 'Limite da Matriz de Entrada',
  },
  residual: {
    key: 'matrix.residual.limit_cents',
    action: 'matrix.residual.limit.update',
    defaultCents: 75000000, // R$ 750.000,00
    label: 'Limite da Matriz Residual',
  },
  vendas: {
    key: 'matrix.vendas.limit_cents',
    action: 'matrix.vendas.limit.update',
    defaultCents: 0, // "a definir" — cliente ainda vai enviar o valor
    label: 'Limite da Matriz de Vendas',
  },
}

// GET /api/admin/matrix-config?userId=<adminId>
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // Busca os 3 limites (entrada, residual, vendas) em paralelo
    const [entradaCfg, residualCfg, vendasCfg] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: LIMIT_CONFIG.entrada.key } }),
      prisma.systemConfig.findUnique({ where: { key: LIMIT_CONFIG.residual.key } }),
      prisma.systemConfig.findUnique({ where: { key: LIMIT_CONFIG.vendas.key } }),
    ])

    const parseCents = (cfg: { value: string } | null, def: number) => {
      if (!cfg) return def
      const n = parseInt(cfg.value, 10)
      return Number.isFinite(n) && n >= 0 ? n : def
    }

    // Busca histórico de auditoria dos 3 (últimos 20 de cada)
    const [histEntrada, histResidual, histVendas] = await Promise.all([
      prisma.auditLog.findMany({
        where: { action: LIMIT_CONFIG.entrada.action },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.findMany({
        where: { action: LIMIT_CONFIG.residual.action },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.findMany({
        where: { action: LIMIT_CONFIG.vendas.action },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { name: true, email: true } } },
      }),
    ])

    const mapHistory = (logs: typeof histEntrada) => logs.map(log => {
      let details: { previousValue?: number; newValue?: number } = {}
      try { details = JSON.parse(log.details || '{}') } catch { /* ignore */ }
      return {
        id: log.id,
        adminName: log.user?.name || 'Sistema',
        adminEmail: log.user?.email || '',
        previousValue: details.previousValue,
        newValue: details.newValue,
        timestamp: log.createdAt.toISOString(),
      }
    })

    return success({
      // Limites em centavos de R$ (0 = "a definir")
      entradaLimitCents: parseCents(entradaCfg, LIMIT_CONFIG.entrada.defaultCents),
      residualLimitCents: parseCents(residualCfg, LIMIT_CONFIG.residual.defaultCents),
      vendasLimitCents: parseCents(vendasCfg, LIMIT_CONFIG.vendas.defaultCents),
      // Defaults (para a UI mostrar "padrão: R$ X" como placeholder)
      defaults: {
        entrada: LIMIT_CONFIG.entrada.defaultCents,
        residual: LIMIT_CONFIG.residual.defaultCents,
        vendas: LIMIT_CONFIG.vendas.defaultCents,
      },
      // Histórico de auditoria por matriz
      history: {
        entrada: mapHistory(histEntrada),
        residual: mapHistory(histResidual),
        vendas: mapHistory(histVendas),
      },
    })
  } catch (err) {
    console.error('matrix-config GET error:', err)
    return error('Failed to fetch matrix config', 500)
  }
}

// PUT /api/admin/matrix-config
// Body: { userId, matrix: 'entrada' | 'residual' | 'vendas', limitCents: number }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, matrix, limitCents } = body

    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    // Valida matriz
    if (!matrix || !['entrada', 'residual', 'vendas'].includes(matrix)) {
      return error('matrix deve ser "entrada", "residual" ou "vendas"', 400)
    }

    const cfg = LIMIT_CONFIG[matrix as MatrixKind]

    // Valida valor: deve ser inteiro >= 0 (centavos). Permite 0 = "a definir".
    const parsed = Number(limitCents)
    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      return error('limitCents deve ser um número inteiro >= 0 (em centavos de R$)', 400)
    }

    // Busca valor atual (para audit log)
    const existing = await prisma.systemConfig.findUnique({ where: { key: cfg.key } })
    const previousValue = existing ? parseInt(existing.value, 10) : null

    // Upsert
    const updated = await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: {
        value: String(parsed),
        description: `${cfg.label} em centavos de R$ (teto para cálculo de cashback).`,
        category: 'matrizes',
      },
      create: {
        key: cfg.key,
        value: String(parsed),
        description: `${cfg.label} em centavos de R$ (teto para cálculo de cashback).`,
        category: 'matrizes',
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: cfg.action,
        entityType: 'SystemConfig',
        entityId: updated.id,
        details: JSON.stringify({
          previousValue,
          newValue: parsed,
          matrix,
        }),
      },
    })

    return success({
      message: `${cfg.label} atualizado com sucesso`,
      matrix,
      limitCents: parsed,
      previousValue,
    })
  } catch (err) {
    console.error('matrix-config PUT error:', err)
    return error('Failed to update matrix config', 500)
  }
}
