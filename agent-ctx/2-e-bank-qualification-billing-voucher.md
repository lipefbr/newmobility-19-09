# Task 2-e — Bank update + Qualificação + Pagar Fatura + Voucher

**Agent:** Main Agent (Item 3 + Item 4 + Item 5 + Item 12)
**Date:** 2026-08-20
**Branch:** main (no git branch — direct edits)

## Scope

Four backlog items in one task:

- **Item 3** — "Atualizar Banco" not saving bank data
- **Item 4** — "Qualificação" field missing in Admin Edit User + only 6 options
- **Item 5** — "Pagar Fatura" marks paid without real payment + R$999 invoice missing
- **Item 12** — "Voucher de Boas-Vindas" redemption logic review/fix

## Files changed (11)

### New files (2)

1. **`src/lib/qualifications.ts`** — shared `QUALIFICATION_OPTIONS` constant
   with the 10 business-relevant qualifications per the client spec
   (Motorista, Entregador, Cliente, Lojista, Mototaxista, Motofretista,
   Motorista de App, Taxista, Caminhoneiro, Outros). Also exports
   `LEGACY_QUALIFICATION_OPTIONS` (passageiro / passageiro_60 /
   passageiro_pcd / comercio) so the `qualificationLabel()` helper can
   still render friendly labels for users registered before this task
   expanded the dropdown.

2. **`src/app/api/asaas/status/route.ts`** — public GET endpoint that
   returns `{ configured: boolean }` indicating whether an admin has
   saved an Asaas API key in SystemConfig. Used by the billing page to
   decide between the real Asaas payment flow and the
   "Pagamento não disponível" notice. Does NOT require admin — only
   the boolean flag is exposed (no API key, no environment, no balance).

### Modified files (9)

3. **`src/components/newmobility/portals/bank-page.tsx`** — Item 3.
   Verified the existing bank save flow works end-to-end (PUT
   `/api/user/profile` persists bankCode/bankAgency/bankAccount/bankType/
   pixKey/pixEnabled; GET returns the saved values; the form hydrates
   from the API response on save and on mount). No code changes needed —
   the bug report appears to have been from before a previous fix. Added
   a small comment block documenting the verified flow.

4. **`src/components/newmobility/admin/admin-users-panel.tsx`** — Item 4.
   Removed the local 6-option `QUALIFICATION_OPTIONS` constant and
   replaced it with the shared `QUALIFICATION_OPTIONS` import from
   `@/lib/qualifications` (10 options). The "Editar Usuário" dialog
   now offers all 10 qualifications. The `qualificationLabel()`
   helper was renamed to `getQualificationLabel()` and delegates to
   the shared helper so legacy codes also resolve correctly.

5. **`src/components/newmobility/profile/personal-data-section.tsx`** —
   Item 4. Same change as admin-users-panel: replaced the local 6-option
   constant with the shared import. The backoffice "Dados Pessoais"
   card now offers all 10 qualifications and renders legacy codes
   with friendly labels.

6. **`src/components/newmobility/auth/register-page.tsx`** — Item 4.
   Replaced the local 6-option `qualificationOptions` with the shared
   import. The self-registration dropdown now offers all 10
   qualifications, keeping the registration form in sync with the
   admin and backoffice forms.

7. **`src/components/newmobility/billing/billing-page.tsx`** — Item 5.
   Major refactor of the "Pagar Fatura" flow:
   - Fetches Asaas status on mount via the new `/api/asaas/status`
     endpoint (parallel to the billing list fetch, non-blocking).
   - `handlePay` now has 4 cases:
     1. Invoice has `asaasPaymentId` → open AsaasPaymentDialog (view
        existing payment).
     2. Asaas is configured → open AsaasPaymentDialog (create real
        PIX/Boleto payment). Invoice stays pending until Asaas webhook
        confirms.
     3. Asaas NOT configured + admin → open PaymentMethodDialog as a
        manual "Marcar como pago (admin)" override (records the chosen
        paymentMethod for audit).
     4. Asaas NOT configured + non-admin → open a new
        "Pagamento não disponível" notice dialog. The invoice is NOT
        marked as paid. The user is pointed to support to settle
        out-of-band.
   - Added the new "Pagamento não disponível" Dialog at the bottom of
     the page. Shows the invoice summary + a clear "entre em contato
     com o suporte" message + a "Nenhum valor foi cobrado" reassurance.

8. **`src/components/newmobility/billing/payment-method-dialog.tsx`** —
   Item 5. Updated the dialog copy to make it explicitly an admin-only
   "Marcar como pago (admin)" action:
   - Title changed to "Marcar como pago (admin)".
   - Description explains this is an administrative action that does
     NOT process a real payment.
   - Helper text under the payment-method selector now says "esta ação
     é administrativa e NÃO processa um pagamento real" and points the
     admin to configure Asaas in Admin → Asaas for real payments.
   - Confirm button label changed to "Marcar como Pago" with an amber
     color (instead of the emerald "Confirmar Pagamento") so the admin
     visually distinguishes this from a real payment.

9. **`src/components/newmobility/myplan/myplan-page.tsx`** — Item 5.
   Replaced the hardcoded `mockInvoices` array (which contained a fake
   pending R$999 plan_blue5 row) with the real `/api/invoices` data
   the page already fetches for the cashback-vendas block check. Added
   a `userInvoices` state variable populated in the same effect. The
   "Histórico de Faturas" section now renders the user's REAL invoices
   (paid + pending), or a friendly empty-state when none exist. This
   fixes the "R$999 invoice missing from Pagar Faturas" report — the
   invoice the user saw on their profile was mock data that never
   existed in the DB, so the billing page (which queries the DB) had
   nothing to show.

10. **`src/app/api/vouchers/redeem/route.ts`** — Item 12. Added
    `signup_bonus` and `plan_bonus` cases to the `getBalanceField()`
    mapping (both credit `balanceShopping`). Previously these two types
    returned null, causing a "Tipo de voucher inválido: signup_bonus"
    error when a user tried to redeem the welcome voucher by code. This
    brings the by-code endpoint into agreement with the by-id endpoint
    (which already credits balanceShopping for all types).

11. **`src/components/newmobility/voucher/voucher-page.tsx`** — Item 12.
    Three changes:
    - Updated the welcome voucher banner copy from "em Mobilidade" to
      "em Saldo Compras" (accurate — signup_bonus credits
      balanceShopping, not balanceMobility).
    - Changed `handleApplyWelcomeVoucher` to call `handleRedeemById`
      directly (using the voucher's database ID) instead of opening the
      redeem-by-code dialog. This skips a dialog round-trip and uses
      the more reliable by-id endpoint.
    - Added a loading state to the "Aplicar" button (spinner + disabled)
      while the redeem request is in-flight.
    - Added `refreshWelcomeVoucher()` call after a successful
      `handleRedeemById` so the welcome banner hides once the
      signup_bonus voucher has been redeemed (the GET
      /voucher/generate-signup-bonus endpoint only returns UNUSED
      signup_bonus vouchers).

## Verification

### Item 3 — Bank update

```
PUT /api/user/profile { userId, bankCode:"341", bankAgency:"1234",
  bankAccount:"56789-0", bankType:"cc", pixKey:"test@pix.com",
  pixEnabled:true } → 200, returns saved values.

GET /api/user/profile?userId=... → returns the saved bank data
  (bankCode:"341", bankAgency:"1234", etc.)

GET /api/user/profile?userId=admin → returns null bank fields after
  reset (bankCode:null, etc.)
```

The PUT /api/user/profile route already accepts all 6 bank fields and
includes them in the Prisma `update` call. The bank-page.tsx frontend
already sends them correctly and hydrates from the PUT response. The
flow works end-to-end — the original bug report appears to have been
from before a previous fix (commit `eba84a0`).

### Item 4 — Qualification

```
PUT /api/admin/users/[id] { qualification:"mototaxista" } → 200,
  returns user with qualification:"mototaxista".

PUT /api/admin/users/[id] { qualification:null } → 200, returns
  qualification:null.

The admin "Editar Usuário" dialog now shows 10 options in the
Qualificação dropdown (verified by reading the rendered SelectContent).
```

### Item 5 — Pagar Fatura

```
GET /api/asaas/status?userId=admin → { configured:false } (Asaas not
  configured in this environment, so the "Pagamento não disponível"
  notice is shown to non-admin users; admins get the manual
  "Marcar como pago (admin)" PaymentMethodDialog).

GET /api/asaas/status (no userId) → 401 Unauthorized (session
  resolution rejects unauthenticated callers).

GET /api/billing?userId=admin → 0 invoices (admin has no plan fee).
  Confirmed the billing list returns ALL invoices regardless of type
  — no filter that would hide a "R$999" invoice.

POST /api/billing { type:"plan_test", amount:99900, dueDate:... } →
  201, creates the R$999 invoice.

GET /api/billing?userId=admin → 1 pending invoice (the R$999 one).

POST /api/billing/pay/[id] { paymentMethod:"pix" } → 200, marks the
  invoice as paid (admin manual override). Also auto-creates the next
  month's renewal invoice (existing behavior).
```

The mockInvoices array in myplan-page.tsx (which contained the fake
R$999 row) has been replaced with the real /api/invoices data.

### Item 12 — Voucher

```
POST /api/voucher/generate-signup-bonus { userId } → 201, creates a
  signup_bonus voucher (R$10,00 for "usuario" userType).

POST /api/vouchers/redeem { userId, code:"NM-2VGM-95B8" } → 200,
  marks voucher as used, credits 1000 cents to balanceShopping.
  (Previously returned 400 "Tipo de voucher inválido: signup_bonus".)

POST /api/vouchers/[id]/redeem { userId } → 200, same behavior via
  the by-id endpoint (already worked before this task).

GET /api/voucher/generate-signup-bonus?userId=... → returns null
  after the voucher is redeemed (because the endpoint only returns
  UNUSED signup_bonus vouchers). This is what hides the welcome
  banner's "Aplicar" button after a successful redeem.
```

## Lint / TypeScript

- `bun run lint` on all changed files: 0 new errors. (Pre-existing
  errors in keep-alive.js / persistent-server.js / process-manager.js /
  run-forever.js / supervisor.js are unrelated CommonJS files that
  predate this task.)
- `bun x tsc --noEmit` on changed files: 0 errors. (Pre-existing
  errors in other files are unrelated.)
- Dev server compiles all changed routes cleanly (verified via
  `tail dev.log` — no compile errors, all routes return 200/201).

## Schema

- `prisma/schema.prisma` was NOT modified (provider kept as `sqlite`
  per task instructions). All 4 items were addressable with code
  changes only — no DB schema changes needed:
  - `User.bankCode/bankAgency/bankAccount/bankType/pixKey/pixEnabled`
    already existed.
  - `User.qualification` already existed (String?).
  - `Invoice` model already had `paymentMethod` column.
  - `Voucher` model already had `type` column.
- Test data created during verification (2 test invoices for the admin
  user, 2 used vouchers for the test user) was cleaned up after
  testing. The test user's bank data and qualification were reset to
  null/motorista respectively.

## Issues / Notes

- The bank save flow (Item 3) was already correct in the current code.
  The bug report appears to have been from before commit `eba84a0`
  ("feat: fix 13 backoffice + 7 admin issues"). I verified end-to-end
  that the PUT persists, the GET returns the saved values, and the
  form hydrates correctly. No code changes were needed — just
  verification and a clarifying comment.
- The "R$999 invoice missing" (Item 5) was a UI artifact: the
  myplan-page.tsx hardcoded a `mockInvoices` array (with a pending
  R$999 plan_blue5 row) that was never backed by a real DB invoice.
  The billing page correctly showed 0 invoices because there were 0
  invoices in the DB. The fix replaces the mock array with the real
  /api/invoices data, so the user's "Histórico de Faturas" now shows
  their actual invoices and there's no more confusion about a
  "missing" R$999 invoice.
- The voucher signup_bonus type was missing from the
  `getBalanceField()` mapping in /api/vouchers/redeem/route.ts. The
  by-id endpoint (/api/vouchers/[id]/redeem) already credited
  balanceShopping for all types — this task brings the by-code
  endpoint into agreement. Going forward, both endpoints handle
  signup_bonus and plan_bonus identically.
- The PaymentMethodDialog is now admin-only (non-admin users never
  see it — they get the "Pagamento não disponível" notice instead).
  The dialog's copy was updated to make the administrative nature
  explicit ("Marcar como pago (admin)", amber color, helper text
  explaining it doesn't process a real payment).
