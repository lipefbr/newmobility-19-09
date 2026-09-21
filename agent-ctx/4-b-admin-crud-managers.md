# Task 4-b — Admin CRUD Managers (Discount Club, Accredited Network, TalkMobi)

**Agent**: Code Agent (Admin UI — CRUD managers)
**Task ID**: 4-b
**Date**: 2026-06-23

## Summary

Created 3 self-contained admin CRUD manager components for the NewMobility admin panel. Each component loads its own data, exposes full create/read/update/delete + active-toggle functionality, and is ready to be dropped into `<TabsContent>` blocks in `admin-page.tsx` (the main agent will wire them in — no other files were touched).

## Files Created

1. **`src/components/newmobility/admin/discount-club-manager.tsx`** — `export function DiscountClubManager()`
2. **`src/components/newmobility/admin/accredited-network-manager.tsx`** — `export function AccreditedNetworkManager()`
3. **`src/components/newmobility/admin/talkmobi-manager.tsx`** — `export function TalkMobiManager()`

No other files were modified (per task constraints).

## APIs Used (from `@/lib/api`)

- `discountClubApi.getPartners({ userId })` / `createPartner(userId, data)` / `updatePartner(userId, id, data)` / `deletePartner(userId, id)`
- `accreditedNetworkApi.getItems({ userId })` / `createItem` / `updateItem` / `deleteItem`
- `talkMobiApi.getPlans(userId)` / `createPlan` / `updatePlan` / `deletePlan`

All admin actions pass `user.id` from `useStore()` as the `userId` argument; the backend verifies the `admin` role.

## DiscountClubManager — Features

- Header card with gradient accent, refresh button (with spinner) and "Novo Parceiro" button.
- Stats row: Total / Ativos / Em Destaque / Inativos.
- Filters: search input (matches name, description, discount text) + category Select (pet, food, health, auto, beauty, services).
- Desktop table (hidden on mobile): Parceiro, Categoria, Desconto, Cashback, Ordem, Ativo (Switch), Ações (edit / delete).
- Mobile card list (block md:hidden) with same data + motion entrance.
- Create/Edit Dialog with: name*, category*, discountText, cashbackPercent (0-100), description (Textarea), websiteUrl, phone, logoUrl, isFeatured (Switch), isActive (Switch), sortOrder.
- Optimistic active toggle: local state updated immediately, rolled back on API failure.
- AlertDialog delete confirmation with loading state and toast feedback (sonner).
- Loading skeleton (5 rows) + empty state with CTA.
- Featured partner gets a gold star icon in both table and mobile card.

## AccreditedNetworkManager — Features

- Header card (sky theme), refresh + "Novo Estabelecimento" buttons.
- Stats row: Estabelecimentos / Estados (distinct count) / Ativos / Inativos.
- Filters (4-col grid on lg): search + state Select (options from API `states`) + category Select (posto, farmacia, mercado, restaurante, auto, services) + brand Select (options from API `brands`).
- Desktop table (hidden below lg): Estabelecimento (with phone), Marca (Badge), Categoria (Badge), Local (city/state), Desconto, Cashback, Ativo (Switch), Ações.
- Mobile/tablet cards (lg:hidden) with same data, motion entrance.
- Create/Edit Dialog with: name*, category*, brand, city*, state* (auto-uppercase, 2-char max), address, phone, discountText, cashbackPercent, isActive (Switch), sortOrder.
- Optimistic active toggle + AlertDialog delete confirmation + toast feedback.
- Loading skeleton + empty state with CTA.

## TalkMobiManager — Features

- Header card (fuchsia theme) with refresh + "Novo Plano" buttons.
- Stats row: Total / Ativos / Populares / Recomendados.
- **Card grid layout** (1 col mobile, 2 col sm, 3 col xl) instead of a table — each plan shows: name, big dataAmount, price (formatCurrency(priceCents)), cashback box (formatCurrency(cashbackCents)), rewardPoints box, up to 5 features (with "+N outros" overflow), Popular/Recommended badges, isActive Switch + Edit/Delete buttons.
- Plans sorted by `sortOrder` then `priceCents`.
- Recommended plans get a fuchsia border; popular plans get an amber border; inactive plans dimmed to 60% opacity.
- whileHover y:-2 motion effect on cards.
- Create/Edit Dialog with: name*, dataAmount* (e.g. "10GB"), priceCents (with helper "R$ 49,90 = 4990"), cashbackCents (with helper), rewardPoints, features Textarea (one per line → parsed to array), isPopular (Switch), isRecommended (Switch), isActive (Switch), sortOrder.
- Optimistic active toggle + AlertDialog delete confirmation + toast feedback.
- Loading skeleton (3 plan cards) + empty state with CTA.

## Lint Status

Ran `bun run lint 2>&1 | tail -30`:

- **0 errors** in any of the 3 new `.tsx` files.
- All 16 errors reported are **pre-existing** in `.js` / `.cjs` files at the project root (`keep-alive.js`, `persistent-server.js`, `process-manager.js`, `run-forever.js`, `supervisor.js`, `scripts/*.cjs`) — all of type `@typescript-eslint/no-require-imports`. These are out of scope per the task instructions.

## Dev Server Log

Latest `dev.log` shows no compile errors and successful 200 responses for existing endpoints. The new components will compile on first admin navigation to their respective tabs (Next.js webpack on-demand compilation).

## Notes for the Main Agent (wiring into admin-page.tsx)

Each component is a no-props, self-contained section. To wire them in:

```tsx
<TabsContent value="discount-club" className="m-0">
  <DiscountClubManager />
</TabsContent>
<TabsContent value="accredited-network" className="m-0">
  <AccreditedNetworkManager />
</TabsContent>
<TabsContent value="talkmobi" className="m-0">
  <TalkMobiManager />
</TabsContent>
```

Imports needed at the top of `admin-page.tsx`:

```tsx
import { DiscountClubManager } from '@/components/newmobility/admin/discount-club-manager'
import { AccreditedNetworkManager } from '@/components/newmobility/admin/accredited-network-manager'
import { TalkMobiManager } from '@/components/newmobility/admin/talkmobi-manager'
```

The `AdminPageKey` union in `src/lib/store.ts` already includes `'discount-club'`, `'accredited-network'`, and `'talkmobi'` (verified during this task), so the sidebar wiring in `admin-layout.tsx` and the `adminPageToTab` map in `admin-page.tsx` can use the same string values as `TabsContent value`.
