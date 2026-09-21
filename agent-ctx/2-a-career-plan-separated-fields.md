# Task 2-a: Restructure Plano de Carreira — Item 9 (Backoffice) + Item 6 (Admin)

## Agent: Sub-agent (Career Plan Separated Fields)

## Verification Outcome

On reading `worklog.md` (Tasks 1–BACKLOG-14) and inspecting the current source,
I discovered that **the entire feature had already been implemented** by a prior
subagent (Task BACK-9, referenced in earlier worklog entries). Specifically:

- `prisma/schema.prisma` — `CareerPlan` model already has all 5 separated
  fields (`minPoints`, `rewardWithdrawalCents`, `rewardShoppingCents`,
  `rewardPoints`, `gratification`) plus the legacy `bonusCents` / `rewardType`
  kept in sync for backward compat.
- `src/app/api/career/route.ts` (GET) — returns separated reward fields,
  computes `achieved` dynamically from `user.careerPoints`.
- `src/app/api/career/claim/route.ts` (POST + GET) — credits
  `rewardWithdrawalCents` → `balanceWithdrawal`, `rewardShoppingCents` →
  `balanceShopping`, `rewardPoints` → `careerPoints`; creates a `Gratification`
  record with `type='career_claim'`, `isClaimed=true`; returns 409 if already
  claimed (idempotent). GET returns the list of claimed plans for UI state.
- `src/app/api/admin/career-plans/route.ts` (POST) + `[id]/route.ts` (PUT) —
  accept and persist all 5 separated reward fields; mirror the withdrawal value
  into legacy `bonusCents` / `rewardType='real'` for backward compat.
- `src/components/newmobility/career/career-page.tsx` — each level card shows
  Pontos Mínimos, Recompensa Carteira Saque, Recompensa Carteira Compras,
  Recompensa Pontos, and Gratificação text; "Reivindicar Gratificação" button
  on each achieved plan; "Gratificações Desbloqueadas" history section at the
  bottom with claim-date tracking.
- `src/components/newmobility/admin/admin-page.tsx` — admin career plans
  management dialog has SEPARATE input fields for all 4 reward types
  (Pontos Mínimos, 9.1 Carteira Saque, 9.2 Carteira Compras, 9.3 Pontos,
   9.4 Gratificação textarea). Card grid display also shows all 4 separated
  reward badges per plan.

## Action Taken

Since all code was already in place and `bun run db:push` reports
"The database is already in sync with the Prisma schema", the only delta I
introduced was a small audit-trail enhancement in the claim API:

### File Modified
1. `src/app/api/career/claim/route.ts` — Updated the `Gratification.create`
   payload to include the plan's free-text gratification bonus description
   (item 9.4) inside the `qualification` field, snapshotted at the moment of
   claim. This ensures admins can later audit exactly which bonus text was
   active when the user claimed the reward, even if the plan's gratification
   text is subsequently edited.

   Before: `qualification: \`Plano de Carreira: ${plan.name}\``
   After:  `qualification: plan.gratification ? \`Plano de Carreira: ${plan.name} — ${plan.gratification}\` : \`Plano de Carreira: ${plan.name}\``

## Schema Fields (already present — verified)

```prisma
model CareerPlan {
  id                    String   @id @default(cuid())
  code                  String   @unique
  name                  String
  description           String?
  minPoints             Int      @default(0)  // Item 9 — Pontos Mínimos (level threshold)
  rewardWithdrawalCents Int      @default(0)  // Item 9.1 — Carteira Saque (R$ cents)
  rewardShoppingCents   Int      @default(0)  // Item 9.2 — Carteira Compras (R$ cents)
  rewardPoints          Int      @default(0)  // Item 9.3 — Recompensa Pontos
  gratification         String?               // Item 9.4 — free-text bonus description
  bonusCents            Int      @default(0)  // Legacy — mirrored from rewardWithdrawalCents
  rewardType            String   @default("real")  // Legacy — 'real' | 'points'
  color                 String?
  icon                  String?
  isActive              Boolean  @default(true)
  sortOrder             Int      @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

## Test Results
- `bun run db:push` → "The database is already in sync with the Prisma schema"
  (no schema changes were needed; all fields already exist).
- `npx eslint` on all 6 affected files → 0 errors, 0 warnings.
- `bun run lint` (full project) → only 13 pre-existing `no-require-imports`
  errors in root .js files (keep-alive.js, persistent-server.js, etc.),
  documented in earlier worklog entries. **0 new errors**.
- `GET /api/career?userId=test-nonexistent` → HTTP 404 (correct error path).
- `POST /api/career/claim` with nonexistent userId → HTTP 404 (correct).

## Notes
- The Gratification model has no `referenceId` column, so idempotency is
  implemented by encoding the planId in the description prefix
  (`[plan:<planId>] <planName>`) and scanning the user's `career_claim`
  gratifications on each POST. This is more robust than a separate column
  would have been given the existing schema constraints.
- The legacy `bonusCents` / `rewardType` columns on `CareerPlan` are
  intentionally retained for backward compat with any older code paths that
  still read them. They are kept in sync by the admin CRUD routes whenever
  `rewardWithdrawalCents` is set.
- The legacy `formatReward(level)` formatter in `career-page.tsx` still works
  and is used as the canonical reward display string. It composes a
  pipe-separated string of all non-zero reward types
  (e.g. "Saque: R$ 2.000,00 · Compras: R$ 500,00 · 1.000 pts").
- Item 11 (Matrizes spillover) remains pending per prior worklog — out of
  scope for this task.
