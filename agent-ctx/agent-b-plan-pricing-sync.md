# Agent-B — Plan Pricing Sync + Simulator Cashback Bases

## Task IDs
- BACK-6: Meu Plano Comparação de Planos não sincronizado com Admin
- BACK-13: Simulador valores errados

## Files Modified
1. `src/lib/utils.ts` — `getPlanPrice` map updated (blue3 → R$ 149,00, blue5 → R$ 999,90).
2. `src/components/newmobility/myplan/myplan-page.tsx` — FALLBACK_PLANS prices synced with admin seed; Blue3 cashbackEntrada='3 níveis', cashbackSales='Bloqueado'; Premium5/Blue3 active card now dynamic with all level potentials + dynamic mensalidade; Mensalidade card uses API price; comparison table renders 'Bloqueado' with Lock icon + tooltip.
3. `src/components/newmobility/simulator/earnings-simulator.tsx` — Fixed CashBack base constants added (99900/139900/19990 cents); simulate() now uses these bases instead of planPriceCents/avgSpend for the 3 matrices; breakdown labels and card text updated to show "CashBack X fixo: R$ Y × % por nível"; stale header comment fixed.

## Canonical Prices (Admin seed — src/app/api/admin/plans/route.ts)
- blue3: R$ 149,00 (14900 cents)
- blue5: R$ 999,90 (99990 cents)
- free: R$ 0,00

## Fixed CashBack Bases (BACK-13)
- CashBack Entrada: R$ 999,00 (99900 cents)
- CashBack Residual: R$ 1.399,00 (139900 cents)
- CashBack Vendas: R$ 199,90 (19990 cents)

## Per-Level Potential Earnings (matrix 4-wide)
- Nível 1: 4 posições × R$ 50  = R$ 200,00
- Nível 2: 16 posições × R$ 100 = R$ 1.600,00
- Nível 3: 64 posições × R$ 100 = R$ 6.400,00
- Nível 4: 256 posições × R$ 50 = R$ 12.800,00 (Premium 5 only)
- Nível 5: 1024 posições × R$ 50 = R$ 51.200,00 (Premium 5 only)

## Plan Differentiation
- Free: 0 níveis entrada, 0 níveis residual, vendas —
- Blue3: 3 níveis entrada, 7 níveis residual, vendas Bloqueado (liberado após pagar fatura)
- Blue5: 5 níveis entrada, 7 níveis residual, 9 níveis vendas

## Lint Status
- 0 errors in modified files.
- 14 pre-existing errors in unrelated files (root .js scripts + payment-method-dialog.tsx).

## Not Modified (per instructions)
- prisma/schema.prisma
- No test files created
