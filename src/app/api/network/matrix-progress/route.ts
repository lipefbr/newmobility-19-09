import { db } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import {
  MATRIX_THRESHOLDS,
  getMatrixProgress,
  type MatrixType,
} from '@/lib/matrix-thresholds'

// Task 14-F — Per-matrix blocking progress for the logged-in user.
//
// Returns the 3 matrix progress objects (entrada / residual / vendas) with:
//   - current value (cents for amount metrics, integer count for count metrics)
//   - threshold (max)
//   - percentage (0..100, clamped)
//   - isBlocked flag (true when current >= threshold)
//   - remaining units
//   - thresholdLabel (e.g. "R$ 96.500")
//
// Strictly per-user — every sum is filtered by `session.userId`.
//
// The matrix thresholds are hardcoded in `MATRIX_THRESHOLDS` (see
// src/lib/matrix-thresholds.ts) per the task spec:
//   - Entrada  → R$ 96.500 (9.650.000 cents)
//   - Residual → R$ 750.000 (75.000.000 cents)
//   - Vendas   → 1.000 vendas (count of CashbackSales records)

export async function GET(request: Request) {
  try {
    const session = await getSession(request)
    if (!session) return error('Unauthorized', 401)

    const userId = session.userId

    // Pull the user's OWN cashback records for each matrix type.
    // Entrada + Residual are summed in cents; Vendas is summed in count
    // (each CashbackSales row = one sale).
    const [entradaRecords, residualRecords, vendasRecords] = await Promise.all([
      db.find('CashbackEntry', '"userId" = $1', [userId]),
      db.find('CashbackResidual', '"userId" = $1', [userId]),
      db.find('CashbackSales', '"userId" = $1', [userId]),
    ])

    const entradaEarned = (entradaRecords as Array<{ amount?: number }>).reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    )
    const residualEarned = (residualRecords as Array<{ amount?: number }>).reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    )
    const vendasCount = vendasRecords.length
    const vendasAmount = (vendasRecords as Array<{ amount?: number }>).reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0,
    )

    const matrixTypes: MatrixType[] = ['entrada', 'residual', 'vendas']
    const progress = matrixTypes.map((type) => {
      const currentValue =
        type === 'entrada'
          ? entradaEarned
          : type === 'residual'
            ? residualEarned
            : vendasCount
      const p = getMatrixProgress(type, currentValue)
      return {
        type,
        metric: p.metric,
        current: p.current,
        threshold: p.threshold,
        thresholdLabel: p.thresholdLabel,
        pct: p.pct,
        isBlocked: p.isBlocked,
        remaining: p.remaining,
        // Convenience for the vendas matrix: also return the total R$ amount
        // earned (count metric, but the UI can still show "R$ X vendidos").
        amountLabel:
          type === 'vendas'
            ? vendasAmount
            : type === 'entrada'
              ? entradaEarned
              : residualEarned,
      }
    })

    return success({
      thresholds: MATRIX_THRESHOLDS,
      progress,
    })
  } catch (err) {
    console.error('Matrix progress error:', err)
    return error('Internal server error', 500)
  }
}
