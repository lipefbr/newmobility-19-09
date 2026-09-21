# Task ID: AGENT-G
# Agent: Sub-agent (Admin ADM-4 / ADM-6 / ADM-3 fixer)

## Task
Fix THREE admin issues:
1. ADM-4 — Admin Permissões: how a user enters the panel with LOGIN/SENHA (Create User dialog + Role select + info boxes)
2. ADM-6 — Admin Plano de Carreira / Streak Rewards: admin Streak Rewards panel display only (career plan form left to AGENT-E)
3. ADM-3 — Admin Telemedicina: verify item 2 of backoffice (payment method + price display in approve dialog)

## Files Modified

### ISSUE 1 (ADM-4)
- `src/components/newmobility/admin/admin-users-panel.tsx`
- `src/components/newmobility/admin/admin-permissions-panel.tsx`
- `src/lib/api.ts`
- `src/components/newmobility/admin/admin-page.tsx`

### ISSUE 2 (ADM-6, admin side only)
- `src/components/newmobility/admin/admin-page.tsx` (Streak Rewards list cards + dialog amount preview)

### ISSUE 3 (ADM-3)
- `src/components/newmobility/admin/admin-telemedicina-panel.tsx`

## Summary of Changes

### admin-users-panel.tsx
- Added `role: string` to `EditFormData` interface and `EMPTY_EDIT` default (`'user'`).
- Added `role: u.role || 'user'` mapping in `openEdit`.
- Added new constants: `ROLE_OPTIONS_BASE` (user/admin/support), `roleLabel()` helper, `roleBadgeClass()` helper.
- Added `CreateFormData` interface + `EMPTY_CREATE` default.
- Added new state: `createOpen`, `createForm`, `creating`, `customRoles`, plus a `roleOptions` memo that merges `ROLE_OPTIONS_BASE` with custom roles fetched from `/admin/permissions`.
- Added `useEffect` that loads custom roles once on mount via `GET /admin/permissions?userId=...`.
- Added `openCreate()` and `handleCreate()` handlers. `handleCreate` validates name/email/password, calls `POST /admin/users/create` with `{ userId, name, email, password, phone, cpf, plan, role, userType, referredByCode }`, shows toast "Usuário criado! Ele pode fazer login com email + senha.", resets to page 1 and reloads the user list.
- Added a "Criar Usuário" button (UserPlus icon, emerald) at the end of the filter bar.
- Added a new "Role" column to the user table header (visible on `lg` screens) + matching cells with role badges.
- Updated `colSpan` of loading/empty rows from 8 to 9 to account for the new Role column.
- Added a Role Select (with Shield icon) to the edit dialog's "Tipo & Plano" tab, listing `roleOptions` (base + custom). Helper text explains admin/support/custom roles grant panel access.
- Added "Role" Detail row to the read-only View dialog using `roleLabel()`.
- Added a new Create User Dialog (`sm:max-w-lg`) with:
  - Info box (emerald-themed) explaining the login flow.
  - Required fields: Nome completo, Email (with hint "Será usado para login"), Senha (with KeyRound icon).
  - Optional fields: Telefone, CPF, Tipo de Usuário (USER_TYPES), Role (roleOptions), Plano (free/blue3/blue5), Código de indicante.
  - Cancelar + "Criar Usuário" footer buttons with loading spinner.

### admin-permissions-panel.tsx
- Added `Info` and `KeyRound` to lucide-react imports.
- Added an info Card at the top of the panel (above the existing header card) explaining how the login flow works:
  "Cada usuário criado no sistema tem seu próprio email e senha. Usuários com role 'admin' ou 'support' (ou roles customizados) podem acessar o painel admin, limitado às páginas permitidas abaixo. Para criar um novo usuário com acesso ao painel, vá na aba Usuários e clique em 'Criar Usuário'."

### lib/api.ts
- Added a `createUser` method to the `adminApi` object. Accepts `(userId, data)` where `data` has `{ name, email, password, phone?, cpf?, plan?, role?, userType?, referredByCode? }`. POSTs to `/admin/users/create`.

### admin-page.tsx (inline users tab)
- Imported `useMemo` from react and `UserPlus`, `KeyRound` from lucide-react.
- Added new state: `createUserDialogOpen`, `creatingNewUser`, `newUserForm` (name/email/password/phone/cpf/userType/role/plan/referredByCode), `customRoles`, and `roleSelectOptions` memo (base roles + custom roles merged).
- Added `useEffect` that fetches `/admin/permissions?userId=...` on mount and populates `customRoles`.
- Added `handleOpenCreateUser()` and `handleCreateUser()` handlers. `handleCreateUser` validates the form and POSTs to `/admin/users/create`, shows success toast, resets to page 1, and reloads users.
- Added a "Criar Usuário" button (UserPlus icon, emerald) next to the Exportar CSV button in the inline users tab filter bar.
- Added a new Create User Dialog (similar to admin-users-panel.tsx) with the info box + all fields.
- Updated the existing inline Role Select in the Edit User dialog (was just user/admin) to use `roleSelectOptions` (base + custom roles) instead.

### admin-page.tsx (Streak Rewards list — ADM-6)
- Rewrote the `streakRewards.map` callback to compute `isCashback`, `rewardTypeLabel` ('Cashback' / 'Pontos'), and `rewardAmountStr` (either `formatCurrency(amount)` or `"${amount} pts"`).
- Replaced the plain `<p>` showing the raw `rewardType` with a Badge showing a Wallet icon (for cashback) or Star icon (for points) + the friendly label.
- Updated the amber bottom card to clearly read "Recompensa: R$ X,XX (Cashback)" or "Recompensa: 500 pts (Pontos)".

### admin-page.tsx (Streak Reward dialog amount field — ADM-6)
- Added a preview label below the amount Input: "Será exibido no backoffice como: [R$ X,XX] ou [X pts]" based on the current `rewardType` selection. The bracketed value updates live as the admin types.
- Verified the existing amount Input correctly handles both types: cashback uses `step="0.01"` and displays `rewardAmount / 100` (R$ value), points uses `step="1"` and displays the raw integer.
- Verified the existing `handleSaveStreakReward` correctly sends `rewardType` and `rewardAmount` (cents for cashback, raw int for points) — no change needed.

### admin-telemedicina-panel.tsx (ADM-3)
- Verified the payment-method badge is already shown on each request card (added by AGENT-C). No change needed.
- Added a fixed "R$ 49,90/mês" price Badge next to the payment-method badge on every request list card (emerald outline, font-semibold) so the admin sees the activation amount at a glance.
- Added a prominent price + payment-method banner to the top of the approve/reject dialog body:
  - Left side: CreditCard icon + "Valor da ativação" label + "Pagamento: <method>" sub-line (parsed from notes via `parsePaymentFromNotes`).
  - Right side: bold "R$ 49,90" + "por mês" hint.
- Updated the Details dialog (read-only):
  - Added a dedicated "Valor da ativação" row showing "R$ 49,90/mês" (bold emerald).
  - Removed the small "(R$ 49,90/mês)" hint that was previously inline next to the payment method label.
  - The Forma de Pagamento row now shows just the method label + CreditCard icon.

## Lint / Type-check
- `bun run lint`: 13 errors, ALL pre-existing in root .js files (keep-alive.js, persistent-server.js, process-manager.js, run-forever.js, supervisor.js). ZERO errors in any of my modified files.
- `bunx eslint <my-files>`: clean (no warnings, no errors) for all 5 modified files.
- `bunx tsc --noEmit --skipLibCheck` errors in admin-page.tsx are all pre-existing (`raw`/`code`/`amount` property type mismatches on AdminPlan/AdminVoucher/SystemConfigs interfaces, originally reported by AGENT-D at lines 237/1832/2566/2570/4242). After my added ~165 lines these shifted to 237/1995/2738/2742/4409 but are otherwise unchanged. No NEW TypeScript errors introduced by my changes.
- Dev server log: clean (only the pre-existing `./src/lib/db.ts` Critical dependency warning, which is a Prisma client initialization concern unrelated to my changes). Page compiles and returns HTTP 200.

## Coordination Notes
- AGENT-E is handling the CareerPlan admin form changes (rewardWithdrawalCents, rewardShoppingCents, rewardPoints, gratification) — I did NOT touch that.
- AGENT-F is handling the user-side gamification-page.tsx display fix for streak reward amounts — I did NOT touch that.
- AGENT-C previously added the payment-method badge to admin-telemedicina-panel.tsx — I built on top of their work (kept the badge, added the price badge + dialog banners).

## Stage Summary
- ✅ ADM-4: Admin can now create new users with login + password via a "Criar Usuário" button in BOTH the standalone AdminUsersPanel component AND the inline users tab in admin-page.tsx. The dialog includes all required fields (Nome, Email, Senha, Telefone, CPF, Tipo, Role, Plano, referredByCode) plus an info box explaining the login flow. On success, the new user can immediately log in.
- ✅ ADM-4: Admin can now edit a user's `role` (admin/support/user or any custom role from the Permissões tab) via a new Role Select in the Edit User dialog. The existing PUT `/api/admin/users/[id]` route already accepted `role` (AGENT-D added it); I only added the UI to use it. Custom roles are auto-loaded from `/admin/permissions` so they appear in both the Create and Edit Role selects.
- ✅ ADM-4: The Permissões tab now has an info box at the top explaining how login + roles + permissions work together, including a pointer to the "Criar Usuário" button in the Users tab.
- ✅ ADM-4: Added `adminApi.createUser()` method to `src/lib/api.ts` for the new endpoint.
- ✅ ADM-6 (admin side): Streak Rewards list cards now clearly show the type via a Badge (Cashback / Pontos) and the reward reads "Recompensa: R$ X,XX (Cashback)" or "Recompensa: 500 pts (Pontos)". The dialog amount field has a live preview label showing exactly how the value will be rendered in the backoffice. The dialog already correctly handled cents-for-cashback vs raw-int-for-points (verified — no change needed to the save handler).
- ✅ ADM-3: Telemedicina admin panel now shows the R$ 49,90/mês price badge on every request list card, plus a prominent price + payment-method banner at the top of the approve/reject dialog, plus a dedicated "Valor da ativação" row in the read-only Details dialog. Admin can see all details: holder info (name/CPF/email/phone/birthdate), dependents, notes (with payment-method prefix stripped), payment method, and price.
- Did NOT modify prisma/schema.prisma.
- Did NOT create any test files.
