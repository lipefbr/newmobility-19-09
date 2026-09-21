# Task 2-b: Create Dependent API Routes and Update Profile with PIX

## Work Summary

### Files Created
1. `/src/app/api/dependents/route.ts` - GET (list active dependents) + POST (create dependent with validation)
2. `/src/app/api/dependents/[dependentId]/route.ts` - PUT (update dependent) + DELETE (soft delete)

### Files Modified
1. `/src/app/api/user/profile/route.ts` - Added pixKey and pixKeyType to PUT handler
2. `/src/app/api/auth/login/route.ts` - Added `pix` object to login response with pixKey and pixKeyType
3. `/src/lib/store.ts` - Added `pixKey: string | null` and `pixKeyType: string | null` to UserData interface and mockUser
4. `/src/lib/api.ts` - Added `dependentsApi` with listDependents, addDependent, updateDependent, deleteDependent methods
5. `/src/components/newmobility/auth/login-page.tsx` - Updated mapApiUserToUserData to handle pix data

### Key Implementation Details
- Dependent GET only returns isActive=true records
- Dependent POST validates: required fields (name, relationship), relationship enum (spouse/child/parent/sibling/other), max 5 per user
- Dependent PUT verifies ownership (userId match) before updating
- Dependent DELETE is soft delete (sets isActive=false), verifies ownership
- PIX fields (pixKey, pixKeyType) flow through login response → UserData → store
- All routes use consistent JSON responses via success()/error() helpers
- Lint passes with 0 errors
