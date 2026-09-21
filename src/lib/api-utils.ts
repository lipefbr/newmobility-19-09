import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const hashPassword = (password: string) =>
  createHash('sha256').update(password).digest('hex')

export const verifyPassword = (password: string, hash: string) =>
  hashPassword(password) === hash

export function generateReferralCode(name: string): string {
  const base = name
    .split(' ')
    .map((n) => n.toUpperCase())
    .slice(0, 2)
    .join('')
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${base}${num}`
}

export function success(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function centsToReais(cents: number): number {
  return cents / 100
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}

export function formatTimeSince(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (years > 0) return `${years} ano${years > 1 ? 's' : ''}`
  if (months > 0) return `${months} mês${months > 1 ? 'es' : ''}`
  if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`
  return 'Hoje'
}

// Default cashback level percentages (used as fallback if SystemConfig has no entries).
// These mirror the defaults baked into the admin cashback-config route.
// Per client spec (Índice.docx):
//   - Entrada 4x5:   L1=5%, L2=10%, L3=10%, L4=5%, L5=5%
//   - Residual 4x7:  L1=10%, L2=9%, L3=5%, L4=5%, L5=4%, L6=3%, L7=2%
//   - Vendas 4x9:    all 9 levels = 0.10% (uniform, total 0.90%)
export const DEFAULT_ENTRADA_LEVELS: number[] = [5, 10, 10, 5, 5]
export const DEFAULT_RESIDUAL_LEVELS: number[] = [10, 9, 5, 5, 4, 3, 2]
export const DEFAULT_VENDAS_LEVELS: number[] = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]

// Backward-compat structured exports (kept so other files that still import the
// old constants — e.g. /api/simulator/calculate/route.ts — don't break).
// New code should prefer the async helpers below.
//
// The `users` per level reflects the 4-wide matrix structure (4^level).
// Percentages come from DEFAULT_*_LEVELS above and may be overridden at runtime
// by SystemConfig (admin-configurable).
export const ENTRADA_LEVELS = [
  { level: 1, percentage: DEFAULT_ENTRADA_LEVELS[0], users: Math.pow(4, 1) },
  { level: 2, percentage: DEFAULT_ENTRADA_LEVELS[1], users: Math.pow(4, 2) },
  { level: 3, percentage: DEFAULT_ENTRADA_LEVELS[2], users: Math.pow(4, 3) },
  { level: 4, percentage: DEFAULT_ENTRADA_LEVELS[3], users: Math.pow(4, 4) },
  { level: 5, percentage: DEFAULT_ENTRADA_LEVELS[4], users: Math.pow(4, 5) },
]

export const RESIDUAL_LEVELS = [
  { level: 1, percentage: DEFAULT_RESIDUAL_LEVELS[0], users: Math.pow(4, 1) },
  { level: 2, percentage: DEFAULT_RESIDUAL_LEVELS[1], users: Math.pow(4, 2) },
  { level: 3, percentage: DEFAULT_RESIDUAL_LEVELS[2], users: Math.pow(4, 3) },
  { level: 4, percentage: DEFAULT_RESIDUAL_LEVELS[3], users: Math.pow(4, 4) },
  { level: 5, percentage: DEFAULT_RESIDUAL_LEVELS[4], users: Math.pow(4, 5) },
  { level: 6, percentage: DEFAULT_RESIDUAL_LEVELS[5], users: Math.pow(4, 6) },
  { level: 7, percentage: DEFAULT_RESIDUAL_LEVELS[6], users: Math.pow(4, 7) },
]

export const VENDAS_LEVELS = [
  { level: 1, percentage: DEFAULT_VENDAS_LEVELS[0], category: 'mobility', users: Math.pow(4, 1) },
  { level: 2, percentage: DEFAULT_VENDAS_LEVELS[1], category: 'mobility', users: Math.pow(4, 2) },
  { level: 3, percentage: DEFAULT_VENDAS_LEVELS[2], category: 'mobility', users: Math.pow(4, 3) },
  { level: 4, percentage: DEFAULT_VENDAS_LEVELS[3], category: 'mobility', users: Math.pow(4, 4) },
  { level: 5, percentage: DEFAULT_VENDAS_LEVELS[4], category: 'mobility', users: Math.pow(4, 5) },
  { level: 6, percentage: DEFAULT_VENDAS_LEVELS[5], category: 'mobility', users: Math.pow(4, 6) },
  { level: 7, percentage: DEFAULT_VENDAS_LEVELS[6], category: 'mobility', users: Math.pow(4, 7) },
  { level: 8, percentage: DEFAULT_VENDAS_LEVELS[7], category: 'mobility', users: Math.pow(4, 8) },
  { level: 9, percentage: DEFAULT_VENDAS_LEVELS[8], category: 'mobility', users: Math.pow(4, 9) },
]

/**
 * Live cashback level percentages read from the SystemConfig table.
 * Keys are stored as `cashback_{type}_level_{n}` (1-indexed) by the admin
 * cashback-config route. Falls back to the hardcoded defaults on any error
 * or when no rows are configured.
 *
 * Returns a plain number[] of percentages indexed 0..N-1.
 */
export async function getEntradaLevels(): Promise<number[]> {
  const defaults = DEFAULT_ENTRADA_LEVELS
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'cashback_entrada_level_' } },
    })
    if (configs.length === 0) return defaults
    // Start from defaults so partially-configured admins still get sensible values
    const levels = [...defaults]
    let hasAny = false
    for (const c of configs) {
      const idx = parseInt(c.key.replace('cashback_entrada_level_', '')) - 1
      if (idx >= 0 && idx < 5) {
        const v = parseFloat(c.value)
        if (!isNaN(v)) {
          levels[idx] = v
          hasAny = true
        }
      }
    }
    return hasAny ? levels : defaults
  } catch {
    return defaults
  }
}

export async function getResidualLevels(): Promise<number[]> {
  const defaults = DEFAULT_RESIDUAL_LEVELS
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'cashback_residual_level_' } },
    })
    if (configs.length === 0) return defaults
    const levels = [...defaults]
    let hasAny = false
    for (const c of configs) {
      const idx = parseInt(c.key.replace('cashback_residual_level_', '')) - 1
      if (idx >= 0 && idx < 7) {
        const v = parseFloat(c.value)
        if (!isNaN(v)) {
          levels[idx] = v
          hasAny = true
        }
      }
    }
    return hasAny ? levels : defaults
  } catch {
    return defaults
  }
}

export async function getVendasLevels(): Promise<number[]> {
  const defaults = DEFAULT_VENDAS_LEVELS
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'cashback_vendas_level_' } },
    })
    if (configs.length === 0) return defaults
    const levels = [...defaults]
    let hasAny = false
    for (const c of configs) {
      const idx = parseInt(c.key.replace('cashback_vendas_level_', '')) - 1
      if (idx >= 0 && idx < 9) {
        const v = parseFloat(c.value)
        if (!isNaN(v)) {
          levels[idx] = v
          hasAny = true
        }
      }
    }
    return hasAny ? levels : defaults
  } catch {
    return defaults
  }
}

// Career pins per client spec (Índice.docx §6):
// "NÃO TEM O PLANO DE CARREIRA É PARA TODOS OS USUÁRIOS EM GERAL" — the plan
// applies to ALL users (not just drivers). Each pin is a MONTHLY bonus paid
// every month as long as the user maintains that graduation:
//   - PIN SAFIRA    — Categoria 3 — R$ 2.000/mês
//   - PIN RUBI      — Categoria 2 — R$ 3.000/mês
//   - PIN ESMERALDA — Categoria 1 — R$ 4.000/mês
//   - PIN DIAMANTE  — Categoria 4 — R$ 5.000/mês
//   - PIN IMPERIAL  — Categoria 5 — R$ 6.000/mês
// (`monthlyBonusCents` is the bonus amount in centavos.)
export const CAREER_RANKS = [
  { name: 'Safira',    minPoints: 100,  stars: 1, monthlyBonusCents: 200000,  category: 3 }, // R$2.000
  { name: 'Rubi',      minPoints: 250,  stars: 2, monthlyBonusCents: 300000,  category: 2 }, // R$3.000
  { name: 'Esmeralda', minPoints: 500,  stars: 3, monthlyBonusCents: 400000,  category: 1 }, // R$4.000
  { name: 'Diamante',  minPoints: 1000, stars: 4, monthlyBonusCents: 500000,  category: 4 }, // R$5.000
  { name: 'Imperial',  minPoints: 2500, stars: 5, monthlyBonusCents: 600000,  category: 5 }, // R$6.000
]

// Virtual "Associado" rank returned by getCareerRank() when the user has not
// yet reached the lowest pin (Safira, 100 points). Kept out of CAREER_RANKS
// so the UI timeline only renders the 5 real jewel pins.
export const ASSOCIADO_RANK = {
  name: 'Associado',
  minPoints: 0,
  stars: 0,
  monthlyBonusCents: 0,
  category: 0,
}

// Returns the highest pin whose minPoints <= points, or the virtual
// "Associado" rank if the user hasn't reached Safira yet.
export function getCareerRank(points: number) {
  let rank = ASSOCIADO_RANK
  for (const r of CAREER_RANKS) {
    if (points >= r.minPoints) rank = r
  }
  return rank
}

// Returns the next pin above the user's current points, or null if the user
// is already at the top (Imperial).
export function getNextRank(points: number) {
  for (const r of CAREER_RANKS) {
    if (points < r.minPoints) return r
  }
  return null
}

export function sanitizeUser(user: Record<string, unknown>) {
  const { password: _, ...safeUser } = user
  return safeUser
}
