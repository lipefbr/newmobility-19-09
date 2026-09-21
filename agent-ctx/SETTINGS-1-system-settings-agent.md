# Task: SETTINGS-1 — Comprehensive "System Settings" admin page

**Agent:** System Settings Agent
**Date:** 2026-09-03
**Status:** ✅ Complete

## Summary

Implemented a comprehensive "Configurações do Sistema" admin tab where the admin can edit EVERYTHING in the system — matrix values (Entrada 4x5, Residual 4x7, Vendas 4x9), cashback percentages, plan prices, withdrawal limits, points config, vouchers, metas, platform support email, and any custom value they want to add at runtime. Backed by the existing `SystemConfig` table (no schema changes — sqlite provider preserved).

## Files changed

| File | Status | Purpose |
|---|---|---|
| `src/lib/store.ts` | modified | Added `'system-settings'` to `AdminPageKey` union |
| `src/app/api/admin/system-settings/route.ts` | NEW | GET (list + seed 52 defaults) + POST (create) |
| `src/app/api/admin/system-settings/[id]/route.ts` | NEW | PUT (update) + DELETE (delete) |
| `src/components/newmobility/admin/admin-layout.tsx` | modified | Added nav item with Settings icon (system group) |
| `src/components/newmobility/admin/admin-page.tsx` | modified | Added tab + state + handlers + grouped table + dialog |

## What was implemented

### 1. API routes (idempotent seed + CRUD)

`/api/admin/system-settings` (GET + POST):
- **GET** (admin-only, `?userId=<adminId>&category=<optional>`): on first call, idempotently seeds 52 default entries across 8 categories, then returns the full list ordered by `[category asc, key asc]`.
- **POST** (admin-only): validates key (allows `[a-z0-9_.]` so both snake_case `menu_dashboard` and dotted `matrix.entrada.pct_level_1` work), value, optional description, optional category (defaults to `geral`). Returns 409 on duplicate.

`/api/admin/system-settings/[id]` (PUT + DELETE):
- **PUT**: updates value/description/category (key immutable). 404 if not found. 400 if no fields provided.
- **DELETE**: 404 if not found.

### 2. Seed catalog (52 entries across 8 categories)

- **matrizes (22)** — Entrada 4x5 (5 levels, 5 pcts L1=5%/L2=10%/L3=10%/L4=5%/L5=5%, base R$999,00), Residual 4x7 (7 levels, pcts L1=10%→L7=2%, base R$1.399,00), Vendas 4x9 (9 levels, 0.10%/level, base R$199,90, salesLimit 1000)
- **cashback (4)** — entrada 35%, residual 45%, vendas 0.9%, direct referral 10%
- **planos (11)** — free/blue3/blue5 names + prices (R$999,90 in cents) + cashback level counts (Blue3=3 entrada, Blue5=5 entrada/7 residual/9 vendas) + mensalidade R$999,90
- **saques (3)** — min R$50, max R$5.000, fee 2%
- **pontos (5)** — per_referral 100, per_purchase 1, per_cashback_claim 50, daily_login 1, per_star 2
- **vouchers (2)** — welcome R$10, signup R$10
- **metas (4)** — daily 18 rides, monthly 384, daily bonus R$5, monthly bonus R$30
- **geral (1)** — platform.support_email (the platform_name/tagline/description already exist via the content-texts seed, so we only add support_email here to avoid key collision)

### 3. Admin UI

The new "Configurações do Sistema" tab in the admin sidebar (system group, right after "Conteúdo e Textos") shows:
- Header card with title + count badge + "Nova Configuração" button
- Search input + category filter dropdown (10 categories + "all")
- Grouped list: each category becomes its own Card with a header badge (PT-BR label + count) and a table (Chave + description, Valor — Badge for numeric, text for strings, Atualizado em, Ações: edit + delete)
- Loading / empty states with the Settings icon
- Create/Edit Dialog:
  - Key input (disabled on edit, font-mono, allows dots + underscores)
  - Value field: **numeric `<Input type="number" step="any">` when editing a known numeric key** (auto-detected via `isNumericSetting()` regex matching `_cents|_pct|levels|width|salesLimit|per_*|_goal_rides|_bonus_cents|_levels_*`), Textarea otherwise
  - Description Input
  - Category Select (10 options minus "all")
  - Save button with Loader2 spinner

## Verification

- `bun run db:push` — schema already in sync (provider = sqlite, untouched). ✅
- `bunx prisma generate` — client regenerated cleanly. ✅
- Manual seed via `bun -e` (mirroring the route's seedDefaults()): inserted all 52 default entries; verified counts by category match the spec. ✅
- `bunx eslint <changed files>` — 0 errors in any new/modified file. ✅
- `bun run lint` (full project): only 13 pre-existing `require()` warnings in root `.js` helper scripts (keep-alive.js, persistent-server.js, etc.) — unrelated and not touched. ✅

## Notes

- The new `system-settings` route uses **dot-style keys** (`matrix.entrada.pct_level_1`, `cashback.entrada_pct`) while the existing `content-texts` route uses **snake_case** (`platform_name`, `menu_dashboard`, `plan_blue3_name`). Both sets are visible in the new tab — the admin can edit either. The two routes don't collide because the keys are different.
- Existing admin-configured SystemConfig rows (e.g. `cashback_entrada_level_1` from the cashback-config route, `matrix.vendas.salesLimit` from the matrix-config route) are untouched — the seed only inserts missing keys.
- The `Settings` icon is reused for both the legacy `'settings'` page (label "Configurações") and the new `'system-settings'` page (label "Configurações do Sistema") per the task spec. The labels are different so there's no confusion in the sidebar.
- Prisma schema was NOT modified (provider kept as `sqlite` per task instructions).

## Issues

None. All deliverables complete and verified.
