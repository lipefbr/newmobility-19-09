# Task 3c — Matrix system: 5-wide + spillover + paying filter

## Summary
Fixed Bug 5 — changed the matrix system from 4-wide (flat list, no spillover) to 5-wide with BFS spillover and a paying-member-only filter for the Entrada matrix.

## Files modified
1. `prisma/schema.prisma` — `MatrixType.width` default 4 → 5 (line 507). Pushed to Neon DB via `bunx prisma db push`.
2. `src/app/api/auth/register/route.ts` — added `findSpilloverPosition()` BFS helper + 5-wide placement with spillover for all 3 matrices + paying-member-only filter for entrada (free members skip entrada entirely).
3. `src/app/api/cashback/entrada/route.ts` — reads `matrixWidth`/`matrixDepth` live from `MatrixType` table; `maxUsers = Math.pow(width, level)`; `maxMatrixSize = (5^6-1)/4 = 3906` (was 1364); response now includes `matrixWidth`/`matrixDepth`.
4. `src/app/api/cashback/residual/route.ts` — same pattern; `maxMatrixSize = (5^8-1)/4 = 97656` (was 21844).
5. `src/app/api/cashback/vendas/route.ts` — same pattern; `maxMatrixSize = (5^10-1)/4 = 2441406` (was 349524).
6. `src/components/newmobility/cashback/matrix-visualization.tsx` — FALLBACK_MATRIX_CONFIG positions 4-based → 5-based (5, 25, 125, 625, 3125, …); MATRIX_META descriptions "4xN" → "5xN"; `Math.pow(4, levelNum)` → `Math.pow(5, levelNum)`. Did NOT touch earnings display (per task constraint).
7. `src/lib/api-utils.ts` — `ENTRADA_LEVELS.users` 4-based → 5-based; added `users` field to `RESIDUAL_LEVELS` and `VENDAS_LEVELS` with 5-based values.

## DB changes
- `prisma db push` applied (schema width default 4 → 5).
- Ran one-off script to update all 4 existing `MatrixType` rows to `width=5` (entrada_4x5, residual_4x7, vendas_4x9, entrada_6x6_teste).
- Note: the `code`/`name`/`description` columns still SAY "4x5" etc. — these are string identifiers, not the actual width value. Did NOT rename them because they're referenced as foreign-key-like identifiers by Plan table + seed constants in `/api/plans/route.ts` and `/api/admin/plans/route.ts`.

## Verification
- `GET /api/cashback/entrada?userId=cmpskrkr50000o8bubki2cgqw` → 200, returns `levels[].maxUsers: [5, 25, 125, 625, 3125]`, `maxMatrixSize: 3906`, `matrixWidth: 5`, `matrixDepth: 5`.
- `GET /api/cashback/residual?userId=...` → `maxUsers: [5, 25, 125, 625, 3125, 15625, 78125]`, `maxMatrixSize: 97656`.
- `GET /api/cashback/vendas?userId=...` → `maxUsers: [5, 25, 125, 625, 3125, 15625, 78125, 390625, 1953125]`, `maxMatrixSize: 2441406`.
- Spillover verified end-to-end: registered 6 paying users under referrer `ADMIN2025` (who had 2 existing entrada children). The 6th correctly spilled to level 2 via BFS (skipped the level-1 child at position 0 which already had 7 children from old 4-wide code; placed under position 1 which had 0 children).
- Paying filter verified: a free user registered under `ADMIN2025` (after level-1 was full) got NO entrada position (dev log shows `Skipping entrada matrix for free member`), but was still placed in residual + vendas matrices (with spillover).
- `bun run lint` → 13 errors, all pre-existing in `.js` utility files. ZERO new errors.

## Test data created
Several test users in the Neon DB: `spill-test-*`, `spill-paying-*` (4 users), `free-skip-*`. These demonstrate the spillover behavior. Safe to delete with:
```ts
prisma.user.deleteMany({ where: { email: { startsWith: 'spill-' } } })
prisma.user.deleteMany({ where: { email: { startsWith: 'free-skip-' } } })
```

## Notes for other agents
- The simulator route `/api/simulator/calculate/route.ts` STILL uses `Math.pow(4, level.level - 1)` (lines 29, 44, 58, 89, 90, 91). NOT in my task scope. If a future agent wants to make the simulator 5-aware, change those to `Math.pow(5, …)` or read from `level.users` (now 5-based in api-utils.ts).
- The cashback API responses now include `matrixWidth` and `matrixDepth` fields. Frontend components that want to render the structure dynamically should prefer these over hardcoded `Math.pow(5, level)`.
- The `findSpilloverPosition` helper in register/route.ts uses BFS with a visited Set (cycle-safe) and honours `MATRIX_DEPTH[matrixType]`. If the entire downline is full (returns null), the caller falls back to placing under the referrer directly (with a warning log) — registration never fails, but in a fully-full matrix, positions can end up at level > maxDepth.
- Did NOT touch `financial-cards.tsx`, `dashboard-page.tsx`, `gamification-page.tsx`, `leaderboard-page.tsx`, `profile-page.tsx`, `referrals-page.tsx`, `cashback-page.tsx` (per task constraints — other agents handle those).
