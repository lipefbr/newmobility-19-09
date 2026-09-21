# Task 3-b: Financial Withdrawal Bug Fix

## Summary
Fixed the financial withdrawal dialog where:
1. Fee was hardcoded as R$3.50 (350 cents) instead of dynamic 2%
2. Balance didn't update after withdrawal, so negative balance wasn't visible
3. Input was unclear about being in Reais vs cents

## Changes Made

### `src/components/newmobility/financial/financial-page.tsx`
- **Fee calculation**: Replaced hardcoded 350 cents with 2% dynamic fee (`Math.round(withdrawCents * 2 / 100)`)
- **Balance update**: Added `updateUser({ balanceWithdrawal: currentBalance - withdrawCents })` after successful withdrawal
- **Negative balance warning**: Added amber warning box when withdrawal results in negative balance
- **Input clarity**: Added "R$" prefix inside input, "(valor em R$)" label hint, `step="0.01"`, `min="0"`
- **Preset formatting**: Quick presets use `toLocaleString('pt-BR')` for proper number formatting
- **Removed `Math.max(0, ...)`**: Net amount shows actual value, color-coded (red for negative, green for positive)
- **Destructured `updateUser`** from `useStore()`

### `src/app/api/financial/withdraw/route.ts`
- No changes needed - already allows negative balances (no insufficient balance check)

## Testing
- Lint passes with no new errors
- All existing lint errors are in pre-existing utility files, not in modified code
