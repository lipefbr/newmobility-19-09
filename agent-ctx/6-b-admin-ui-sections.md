# Task 6-b - Admin UI Sections (Vouchers, Bets, Matrices, Cashback Config, Gratifications, Release Balance)

**Agent**: Code Agent (Admin UI Frontend)
**Task ID**: 6-b
**Date**: 2026-06-23

## Summary

Added 4 new top-level admin sidebar items and 4 new `TabsContent` sections in the admin panel, plus enhanced existing Users and Gratifications sections. All sections consume the admin API endpoints created in Task 6-a (vouchers, bets, matrix, cashback-config, points-config, release-balance).

## Files Modified

1. **`src/lib/store.ts`** — Extended `AdminPageKey` type with 4 new keys: `'vouchers' | 'bets' | 'matrices' | 'cashback-config'`
2. **`src/components/newmobility/admin/admin-layout.tsx`** — Added 4 new sidebar nav items with new Lucide icon imports (`Ticket`, `Gamepad2`, `Network`, `Percent`)
3. **`src/lib/api.ts`** — Added 15 new methods to `adminApi` object (vouchers CRUD, bets settle/cancel, matrix, cashback config, points config, release balance, user tree) + enhanced `getUsers()` with optional `includeMatrix`/`includeBets` params
4. **`src/components/newmobility/admin/admin-page.tsx`** — Major additions:
   - New imports (`adminApi`, 8 new Lucide icons)
   - New interfaces (`AdminVoucher`, `AdminVoucherData`, `AdminBet`, `AdminBetData`, `MatrixNode`, `MatrixData`, `ReferralTreeNode`, `CashbackConfigData`, `PointsConfigData`)
   - Extended `adminPageToTab` mapping for new tabs
   - Added `setAdminActivePage` from useStore (used to programmatically switch to matrices tab from View User dialog)
   - ~30 new state vars, ~15 new handlers, 2 recursive render helpers (`renderMatrixNode`, `renderReferralNode`)
   - 4 new `TabsContent` sections (vouchers, bets, matrices, cashback-config)
   - 5 new Dialogs (Create Voucher, Settle Bet, Cancel Bet, Release Balance, Create Gratification)
   - Enhanced View User dialog: added "Ver Matriz" + "Liberar Saldo" action buttons
   - Enhanced Gratifications section: added "Criar Gratificação" button in section header

## New UI Sections

### Vouchers Tab (`<TabsContent value="vouchers">`)
- Header card with "Criar Voucher" button
- 4 stat cards: Total / Ativos / Resgatados / Valor Total (BRL)
- Filter buttons: Todos / Ativos / Resgatados / Expirados / Desativados
- Table columns: Código, Usuário, Tipo, Valor (R$), Status, Validade, Ações (disable, delete)
- Pagination + empty state
- Create Voucher dialog: type select (6 types), BRL amount with live preview, optional target user/code/expiry date/description

### Bets Tab (`<TabsContent value="bets">`)
- Header card
- 6 stat cards: Total Apostas / Pendentes / Ganhas / Perdidas / Total Apostado (BRL) / Total Pago (BRL)
- Filter buttons: Todas / Pendentes / Ganhas / Perdidas / Canceladas
- Table columns: Usuário, Evento, Seleção, Odds, Aposta, Potencial, Status, Data, Ações (Finalizar, Cancelar — only for pending bets)
- Pagination + empty state
- Settle Bet dialog: shows event info + big Ganha/Perdida buttons
- Cancel Bet dialog: warning box + optional reason + confirm button

### Matrices Tab (`<TabsContent value="matrices">`)
- Header card
- User search box with results dropdown
- Selected user header card with "Trocar Usuário" button
- Matrix type selector: Entrada / Residual / Vendas
- 4 stat cards: Total Posições / Preenchidas / Vazias / Níveis
- Level distribution badges
- **Recursive matrix tree visualization** — each node shows L{level}·P{position} label + user name/email + filled/empty badge; children indented with left border
- **Recursive referral tree visualization** — each node shows avatar circle + name/email + plan badge; children indented with green left border
- Empty states for no user selected / no matrix positions / no referrals
- useEffect re-fetches matrix when `matrixType` or `matrixSelectedUser` changes (uses cancellation flag to prevent race conditions)

### Cashback Config Tab (`<TabsContent value="cashback-config">`)
- Header card
- 3 cards side-by-side:
  - Cashback Entrada: 5 levels (level1 to level5) with percentage inputs + "Salvar Entrada" button
  - Cashback Residual: 7 levels + "Salvar Residual" button
  - Cashback Vendas: 9 levels + "Salvar Vendas" button
- Points Configuration card: 9 point types (referralPoints, planUpgradePoints, dailyLoginPoints, betPlacedPoints, betWonPoints, marketplacePurchasePoints, ticketResolvedPoints, rideCompletedPoints, challengeCompletedPoints) with int inputs + "Salvar Pontos" button
- Loading spinner while configs fetch; toast.success on save

## Enhanced Existing Sections

### Users Tab — View User Dialog
Added 2 quick-action buttons at the bottom of the dialog (after Referral Info section):
- **"Ver Matriz"** button (blue outline with Network icon): closes the dialog and switches admin to the matrices tab with that user pre-selected (calls `setAdminActivePage('matrices')` + `selectUserForMatrix(u)`)
- **"Liberar Saldo"** button (emerald outline with Coins icon): opens a Release Balance dialog with wallet select (6 wallets), BRL amount, required description

### Gratifications Tab
Added **"Criar Gratificação"** button in the section header card (next to the description). Opens Create Gratification dialog:
- User search input with results dropdown (uses `adminApi.getUsers({ search })`)
- Type select: leadership / retirement_fund / telemedicine / tow_truck / custom
- Category select: gratification / withdrawal / mobility / food / pharmacy / shopping
- BRL amount with live preview
- Description input
- Submit calls `apiFetch('/admin/gratifications/assign', ...)` (existing endpoint from prior task) with `userId`, `targetUserId`, `type`, `amount` (in cents), `category`, `description`

## BRL ↔ Cents Convention

All database amounts are in CENTS. The UI:
- **Display**: `formatCurrency(cents)` from `@/lib/utils` (divides by 100, formats as pt-BR currency "R$ X.XXX,XX")
- **Input**: user types BRL reais (e.g., "100,00" or "100.00")
- **Conversion on submit**: `Math.round(parseFloat(input.replace(',', '.')) * 100)` — handles both comma and decimal point separators

## Lint

`bun run lint`:
- 0 errors / 0 warnings in `src/` TypeScript files (my changes)
- 16 pre-existing errors in unrelated `.js`/`.cjs` files (keep-alive.js, persistent-server.js, process-manager.js, run-forever.js, scripts/*.cjs, supervisor.js) — unchanged from baseline

## Dev Server

Dev server remains healthy. All requests return 200. No compile errors after hot-reload picked up the changes (verified via `dev.log`).

## Notes

- All API endpoints called (`/admin/vouchers`, `/admin/bets`, `/admin/users/[id]/matrix`, `/admin/users/[id]/tree`, `/admin/cashback-config`, `/admin/points-config`, `/admin/users/[id]/release-balance`, `/admin/gratifications/assign`) already exist and were verified working in Task 6-a
- The mobile bottom nav bar in admin-layout.tsx was intentionally left with the original 4 items (dashboard, users, financial, settings) per task instructions
- No backend changes were needed (Task 6-a already created all required endpoints)
- No Prisma schema changes
- No existing functionality was removed or broken

## Stage Summary

- ✅ 4 new admin sidebar items added with proper Lucide icons
- ✅ 4 new top-level admin TabsContent sections (Vouchers, Bets, Matrices, Cashback Config) fully implemented with stats, filters, tables, pagination, empty states
- ✅ 5 new Dialogs (Create Voucher, Settle Bet, Cancel Bet, Release Balance, Create Gratification)
- ✅ View User dialog enhanced with "Ver Matriz" + "Liberar Saldo" buttons
- ✅ Gratifications section enhanced with "Criar Gratificação" button + dialog
- ✅ All amounts handled correctly (BRL input → cents for API; cents → BRL display via formatCurrency)
- ✅ Loading states (spinners) and empty states for all new sections
- ✅ Toast notifications for all user actions
- ✅ Framer Motion animations on stat cards
- ✅ Lint clean (only pre-existing errors in unrelated files)
- ✅ Dev server healthy, no compile errors
