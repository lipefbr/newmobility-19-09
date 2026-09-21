# Task 3 - Fix Login Infinite Loading & Register Page Issues

**Agent**: Code Agent  
**Status**: Completed

## Summary
Fixed the infinite loading bug on the login page when clicking "Cadastre-se" or "ADMIN" demo buttons, and fixed the register page to properly handle referral links.

## Files Changed
1. **`src/lib/api.ts`** - Added AbortController-based 10s timeout to all API calls, plus `ApiTimeoutError` and `ApiNetworkError` classes for user-friendly Portuguese error messages
2. **`src/components/newmobility/auth/login-page.tsx`** - Added 15s safety timeout in `handleLogin` to guarantee loading state resets; proper `clearTimeout` in catch/finally
3. **`src/components/newmobility/auth/register-page.tsx`** - Removed `disabled={hasReferral}` from Name field (users need to enter their own name); kept referralCode locked; added safety timeout to registration; fixed `err: any` → `err: unknown`

## Key Decisions
- Name field should be editable even from referral links (referral link only provides referral code, not user's name)
- Referral code field stays locked when coming from referral link to prevent users from changing who referred them
- 10s API timeout + 15s safety timeout provides defense-in-depth against infinite loading
- Portuguese error messages for timeout/network errors to match the app's language
