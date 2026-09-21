// Matrix blocking thresholds (Task 14-F).
//
// Each cashback matrix has a hard earning ceiling. When the logged-in user
// reaches the threshold, the matrix is considered "Bloqueada" and the user
// cannot earn any more from that matrix. The UI uses `getMatrixProgress()`
// to render a progress bar + an optional "Bloqueado" badge.
//
//   - Entrada matrix  → blocks at R$ 96.500,00 total earned
//                       (9.650.000 cents)
//   - Residual matrix → blocks at R$ 750.000,00 total earned
//                       (75.000.000 cents)
//   - Vendas matrix   → blocks at 1.000 vendas (sales count)
//
// The thresholds are deliberately exported as a const record so admin
// tooling / tests can reference the same numbers without re-hardcoding.

export type MatrixType = 'entrada' | 'residual' | 'vendas'

export interface MatrixThresholdEntry {
  /** Cents ceiling when `metric === 'amount'`. */
  amountCents?: number
  /** Count ceiling when `metric === 'count'`. */
  count?: number
  /** Human-friendly label of the ceiling (e.g. "R$ 96.500"). */
  label: string
  /** Whether the threshold is measured in currency (cents) or in count. */
  metric: 'amount' | 'count'
}

export const MATRIX_THRESHOLDS: Record<MatrixType, MatrixThresholdEntry> = {
  entrada: { amountCents: 9_650_000, label: 'R$ 96.500', metric: 'amount' },
  residual: { amountCents: 75_000_000, label: 'R$ 750.000', metric: 'amount' },
  vendas: { count: 1_000, label: '1.000 vendas', metric: 'count' },
}

export interface MatrixProgress {
  /** Percentage of the threshold already reached (0..100, clamped). */
  pct: number
  /** True when `currentValue >= threshold` — matrix is blocked. */
  isBlocked: boolean
  /** Remaining units (cents or count) until the threshold is hit. */
  remaining: number
  /** Human-friendly label of the threshold (e.g. "R$ 96.500"). */
  thresholdLabel: string
  /** The threshold's measurement unit. */
  metric: 'amount' | 'count'
  /** The raw ceiling value (cents for amount metrics, count for count metrics). */
  threshold: number
  /** The current value passed in. */
  current: number
}

/**
 * Compute the progress towards a matrix's blocking threshold.
 *
 * @param matrixType   Which matrix to look up.
 * @param currentValue Current accumulated value for the logged-in user:
 *                       - cents for `entrada` / `residual`
 *                       - integer count for `vendas`
 *                       Non-numeric / negative inputs are coerced to 0.
 */
export function getMatrixProgress(
  matrixType: MatrixType,
  currentValue: number,
): MatrixProgress {
  const threshold = MATRIX_THRESHOLDS[matrixType]
  const max =
    threshold.metric === 'amount'
      ? threshold.amountCents ?? 0
      : threshold.count ?? 0

  const current =
    typeof currentValue === 'number' && !isNaN(currentValue) && isFinite(currentValue)
      ? Math.max(0, currentValue)
      : 0

  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  const isBlocked = current >= max && max > 0
  const remaining = Math.max(0, max - current)

  return {
    pct,
    isBlocked,
    remaining,
    thresholdLabel: threshold.label,
    metric: threshold.metric,
    threshold: max,
    current,
  }
}
