# Task: fix-sync-2a — fullstack-fixer

## Summary
Implemented the full fix for the critical data-sync bug identified in `bug-investigation-1` (investigator).
Admin-side user updates (balances, plan, profile, activation, points, stars) now propagate to the user's
browser without requiring a re-login.

## What was done (high level)
1. Added `refreshUser()` action to the Zustand store (`src/lib/store.ts`) — re-fetches the user profile
   from `/api/user/profile` and merges into `state.user`.
2. Wired up `refreshUser()` in `AppLayout` to run on mount, on `visibilitychange` (debounced 10s), and
   on a 60s interval. Also fixed Bug D (language switch) to call `userApi.updateLanguage()` then
   `refreshUser()`.
3. Replaced optimistic-only `updateUser(...)` calls with `await refreshUser()` after every real user-side
   mutation: profile save, bank save, password change, withdrawal, transfer, plan upgrade, gratification
   claim.
4. Fixed the four silently-no-op save handlers in `profile-page.tsx` (Bugs A, B, C) — they now call the
   real API endpoints. The existing `/api/user/profile` PUT already accepts bank fields, so no server
   changes were needed.
5. Removed mock data fallbacks: deleted `mockWithdrawals`, replaced with a real
   `/api/financial/withdrawals` fetch + empty state; beneficiary fetch fallback is `[]`; personal-info
   and bank forms no longer seed hardcoded fake data; `points-page.tsx` and `career-page.tsx` use `0`
   instead of `42`/`18`/`3`.
6. Fixed Bug H in `dashboard-page.tsx` — `balanceFree` no longer used as fallback for the withdrawal
   stat (uses `0` instead).
7. Also fixed `.env` — replaced the stale SQLite URL with the Neon PostgreSQL URL so `bun run db:push`
   (run by `.zscripts/dev.sh`) stops failing with P1012 and blocking the dev server.

## Files modified
- `src/lib/store.ts`
- `src/components/newmobility/app-layout.tsx`
- `src/components/newmobility/profile/profile-page.tsx`
- `src/components/newmobility/financial/financial-page.tsx`
- `src/components/newmobility/myplan/myplan-page.tsx`
- `src/components/newmobility/gratifications/gratifications-page.tsx`
- `src/components/newmobility/points/points-page.tsx`
- `src/components/newmobility/career/career-page.tsx`
- `src/components/newmobility/dashboard/dashboard-page.tsx`
- `.env` (DATABASE_URL fix — supporting change so dev.sh can run)
- `worklog.md` (appended full work record under Task ID `fix-sync-2a`)

## Intentionally NOT modified
- `src/components/newmobility/games/games-page.tsx` — no real API mutation that affects user balances.
- `src/components/newmobility/voucher/voucher-page.tsx` — `handleConfirmPurchase` is purely simulated
  locally (no real API call), so no `refreshUser()` was added.
- `src/app/api/user/profile/route.ts` — already accepts the bank fields needed for Bug B.
- `src/app/api/user/password/route.ts` and `src/app/api/user/language/route.ts` — already correct.

## Verification
- `bun run lint` — passes for every file I touched. Remaining 15 lint errors are all in pre-existing
  `.js` files (keep-alive.js, persistent-server.js, process-manager.js, run-forever.js, supervisor.js)
  and `src/lib/db.ts` (touched by Task 4 in a prior session, not by me). All unrelated per the task
  description.
- `bunx tsc --noEmit` — 147 pre-existing TypeScript errors across the project; ZERO in any file I
  touched.
- `bun run db:push` (with corrected `.env`) — connects to Neon PostgreSQL successfully.

## Notes for the next agent
- The dev server may not be currently running. The `.env` fix should allow `.zscripts/dev.sh` to
  start it cleanly on the next run. (The shell environment still has a stale SQLite DATABASE_URL
  exported; if you run `bun run db:push` directly you'll need to `export
  DATABASE_URL=postgresql://...` or rely on the runtime `ensureEnvLoaded()` in `src/lib/db.ts` for
  `bun run dev`.)
- `refreshUser()` is intentionally silent on failure (only `console.warn` in non-production) so that
  network blips don't break the UI.
- The 60s polling interval skips if the tab is hidden or if the last refresh was <30s ago (so it
  doesn't fight with the 10s-debounced visibility handler).
