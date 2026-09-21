# Task 6-a - Admin API Endpoints (Vouchers, Bets, Matrix, Cashback Config)

**Agent**: Code Agent (API Backend)
**Task ID**: 6-a
**Date**: 2026-06-23

## Summary

Created 9 new admin API endpoints (and modified 1 existing) for the NewMobility admin panel:
- Voucher management (list/create/update/delete with status workflow)
- Games & bets management (list with stats, settle won/lost, cancel with refund)
- MLM matrix tree viewer (5-level deep traversal of MatrixPosition tree)
- Cashback configuration (per-level percentages for entrada/residual/vendas matrices)
- Points configuration (referral, daily login, plan upgrade, etc.)
- Release balance (admin manual credit to a specific user wallet)
- Enhanced admin user list (optional includeMatrix + includeBets counts)

All endpoints validate `user.role === 'admin'` and return JSON via the shared `success()`/`error()` helpers.

## Files Created

1. `src/app/api/admin/vouchers/route.ts` — GET (paginated list with derived status) + POST (create with auto-generated `VOUCHER-XXXX-XXXX` code if not provided)
2. `src/app/api/admin/vouchers/[id]/route.ts` — DELETE + PUT (status workflow: active/redeemed/expired/disabled mapped to schema fields `isUsed`/`usedAt`/`expiresAt`)
3. `src/app/api/admin/bets/route.ts` — GET with pagination + aggregate stats (`totalBets`, `pendingBets`, `wonBets`, `lostBets`, `totalStaked`, `totalPaid`); response includes both `potentialPayoutInCents` (spec name) and `potentialWinInCents` (schema field) for compatibility
4. `src/app/api/admin/bets/[id]/route.ts` — PUT to settle bet (`won` credits `potentialWinInCents` to `balanceWithdrawal`; `lost` just marks status). Creates a `bet_win`/`bet_loss` transaction record.
5. `src/app/api/admin/bets/[id]/cancel/route.ts` — POST to cancel a pending bet, refunding the stake to `balanceWithdrawal` and creating a `bet_refund` transaction record.
6. `src/app/api/admin/users/[id]/matrix/route.ts` — GET full matrix tree starting from the user's MatrixPosition for the given `matrixType` (`entrada`/`residual`/`vendas`), traversing `parentId` chain up to 5 levels deep. Returns nested tree + stats (`totalPositions`, `filledPositions`, `emptyPositions`, `totalLevels`, `levelCounts`).
7. `src/app/api/admin/cashback-config/route.ts` — GET returns `{entrada, residual, vendas}` each mapping `levelN -> percentage`; PUT accepts the same shape and upserts `cashback_${type}_level_${N}` rows in SystemConfig. Falls back to default values when no config exists.
8. `src/app/api/admin/points-config/route.ts` — GET returns 9 default points config keys (`referralPoints`, `planUpgradePoints`, `dailyLoginPoints`, etc.); PUT upserts `points_${key}` rows in SystemConfig.
9. `src/app/api/admin/users/[id]/release-balance/route.ts` — POST admin manual credit ("Liberar Saldo"). Accepts `wallet` (one of 6 balance fields) and positive `amount` in cents. Uses `$transaction` to atomically update the user's balance and create a `deposit`/`approved` transaction record with description prefixed `[Admin Liberação]`.

## Files Modified

10. `src/app/api/admin/users/route.ts` — Added optional `?includeMatrix=true` and `?includeBets=true` query params. When true, uses `prisma.{matrixPosition,bet}.groupBy()` to attach `matrixPositionCount` and `betCount` to each user record. Existing response shape preserved; new fields are additive.

## Schema Mapping Decisions

The Prisma schema differs slightly from the task spec. Here's how I mapped fields:

| Task Spec | Actual Schema Field | Resolution |
|---|---|---|
| `Voucher.status` (string) | `Voucher.isUsed` (boolean) + `expiresAt` | Derived `status` from `isUsed`/`expiresAt` in GET response; PUT maps abstract `status` back to concrete field updates |
| `Voucher.description` | (no field) | Accepted in POST body but not persisted (returned in response for client display only) |
| `Voucher.redeemedAt` | `Voucher.usedAt` | Returned as `usedAt`; mapped from `redeemed` status via `usedAt = now` |
| `Bet.potentialPayoutInCents` | `Bet.potentialWinInCents` | Returns BOTH names in the response for client compatibility; settle uses `potentialWinInCents` from schema |

## Authorization Pattern

Every endpoint follows the same admin check pattern:
```ts
const admin = await prisma.user.findUnique({ where: { id: userId } })
if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)
```

## Testing

Tested all endpoints with `curl` against the running dev server (admin userId: `cmpskrkr50000o8bubki2cgqw`):

**Vouchers:**
- `GET /api/admin/vouchers?userId=X` → 200 `{vouchers:[], total:0, page:1, totalPages:0}`
- `POST /api/admin/vouchers` with `targetUserId` + `type` + `amount` → 201 with auto-generated `VOUCHER-XXXX-XXXX` code
- `POST /api/admin/vouchers` without `targetUserId` → 201 (assigns to admin so FK is satisfied)
- `PUT /api/admin/vouchers/{id}` `{status:"redeemed"}` → 200 (sets `isUsed:true`, `usedAt:now`)
- `PUT /api/admin/vouchers/{id}` `{status:"active"}` → 200 (clears `isUsed`, `usedAt`)
- `DELETE /api/admin/vouchers/{id}?userId=X` → 200 `{message:"Voucher deleted successfully"}`

**Bets:**
- `GET /api/admin/bets?userId=X` → 200 with `stats: {totalBets, pendingBets, wonBets, lostBets, totalStaked, totalPaid}`
- `PUT /api/admin/bets/{id}` `{result:"won"}` → 200; verified Carlos's `balanceWithdrawal` increased by `potentialWinInCents` (1250 → won 1250 cent payout). Transaction record created with `type:"bet_win"`, `status:"approved"`, description prefixed `[Admin]`.
- `POST /api/admin/bets/{id}/cancel` `{reason}` → 200; verified stake refunded to `balanceWithdrawal` (1000 cents). Transaction record created with `type:"bet_refund"`.
- `PUT /api/admin/bets/{id}` on already-settled bet → 400 `Bet already settled with status: won`
- `POST /api/admin/bets/{id}/cancel` on already-cancelled bet → 400 `Only pending bets can be cancelled (current: cancelled)`
- `GET /api/admin/bets?userId={nonAdmin}` → 403 `Unauthorized`

**Matrix:**
- `GET /api/admin/users/cmpskrltc0005o8buerndtjhn/matrix?userId=X&matrixType=entrada` → 200 with nested tree (Carlos at level 0, Ana Paula at level 1, ... 5 levels deep). Each node has `{id, userId, userName, userEmail, level, position, isFilled, parentId, children:[]}`. Stats object includes `totalPositions`, `filledPositions`, `emptyPositions`, `totalLevels`, `levelCounts: [{level, count}]`.

**Cashback Config:**
- `GET /api/admin/cashback-config?userId=X` → 200 with `{entrada: {level1..level5}, residual: {level1..level7}, vendas: {level1..level9}, raw:{...}}`. Falls back to default values when SystemConfig rows missing.
- `PUT /api/admin/cashback-config` `{configs:{entrada:{level1:7,level2:12}, vendas:{level1:0.15}}}` → 200 `{message:"Cashback configuration updated successfully", updated:3}`. Verified GET returns the new values.

**Points Config:**
- `GET /api/admin/points-config?userId=X` → 200 with 9 default points keys + `raw:{}`.
- `PUT /api/admin/points-config` `{configs:{referralPoints:15, dailyLoginPoints:2}}` → 200 `{message:"Points configuration updated successfully", updated:2}`. Verified GET returns the new values.

**Release Balance:**
- `POST /api/admin/users/{id}/release-balance` `{wallet:"balanceMobility", amount:1000, description:"Bônus de teste"}` → 200 with sanitized user object. Verified Carlos's `mobility` balance increased by 1000 cents and a transaction record with `type:"deposit"`, `status:"approved"`, `description:"[Admin Liberação] Bônus de teste"` was created.
- Negative `amount` → 400 `amount must be a positive number (in cents)`
- Invalid `wallet:"balanceBad"` → 400 `wallet must be one of: balanceWithdrawal, balanceMobility, balanceShopping, balanceFood, balancePharmacy, balanceGratification`

**Enhanced User List:**
- `GET /api/admin/users?userId=X&includeMatrix=true&includeBets=true` → 200 with each user object now including `matrixPositionCount` and `betCount` fields (verified CLAUDINEI user has `matrixPositionCount:3, betCount:0`)

## Linting

`npx eslint` on all 10 modified/new files → **0 errors, 0 warnings**. Pre-existing 16 errors in unrelated `.js`/`.cjs` files (keep-alive.js, persistent-server.js, process-manager.js, run-forever.js, scripts/*.cjs, supervisor.js) remain unchanged.

## Cleanup

After testing, deleted the 2 test bets, all test transactions (release, win, refund), reset Carlos's balances back to 0, deleted all `cashback_*_level_*` SystemConfig override rows (defaults are now back), deleted all `points_*` SystemConfig override rows, and deleted all test vouchers. Verified via curl that all endpoints return clean/empty/default state after cleanup.

## Stage Summary

- ✅ All 9 new admin endpoints implemented and tested end-to-end
- ✅ Existing `/api/admin/users` enhanced with optional `includeMatrix` + `includeBets` query params (additive, no breaking changes)
- ✅ Admin authorization enforced on every endpoint (`user.role === 'admin'` check, returns 403 if not admin)
- ✅ Voucher status workflow (`active`/`redeemed`/`expired`/`disabled`) correctly maps to schema's `isUsed`/`usedAt`/`expiresAt` fields
- ✅ Bet settlement credits `potentialWinInCents` to `balanceWithdrawal` (matches task spec) — different from the user-facing `/api/bets/[id]/settle` which credits `balanceFree`. Admin settle goes to `balanceWithdrawal` per task spec.
- ✅ Bet cancel refunds stake to `balanceWithdrawal` (admin side) and creates `bet_refund` transaction
- ✅ Matrix tree returns full nested structure 5 levels deep with per-level counts
- ✅ Cashback config keys stored as `cashback_${type}_level_${N}` in SystemConfig (new namespace, distinct from existing `cashback_${type}_pct` keys used by `/api/admin/percentages`)
- ✅ Points config keys stored as `points_${key}` in SystemConfig
- ✅ Release balance endpoint semantically distinct from `/wallet` (only positive credits, prefix `[Admin Liberação]` in description, always `type:"deposit"` + `status:"approved"`)
- ✅ All test data cleaned up; database restored to pre-test state
- ✅ No modifications to user-facing API endpoints, admin-page.tsx, or Prisma schema (per task constraints)
