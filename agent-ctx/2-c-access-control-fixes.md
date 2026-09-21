# Task 2-c: Access Control & Admin/Services Fixes

## Summary
Fixed access control for Lojista Portal and Admin Panel, verified admin APIs, added Services page to navigation, and enhanced services content.

## Changes Made

### 1. Lojista Portal Access Control
**File**: `src/components/newmobility/portals/portal-lojista.tsx`
- Added access guard inside the PortalLojista component that checks `user?.userType !== 'lojista'`
- Shows "Acesso Restrito" message with a "Voltar ao Dashboard" button for non-lojista users
- Guard is placed after all hooks to comply with React's rules of hooks
- The sidebar already filters out `portal-lojista` for non-lojista users
- The page.tsx also has a useEffect redirect + synchronous guard

### 2. Admin Panel Access Control
**File**: `src/app/page.tsx`
- Added synchronous access control guards BEFORE the switch statement:
  - `if (activePage === 'admin' && user?.role !== 'admin') return <DashboardPage />`
  - `if (activePage === 'portal-lojista' && user?.userType !== 'lojista') return <DashboardPage />`
- This prevents the brief flash that occurred with only useEffect-based redirects
- The admin page component also has its own `isAdmin` guard (already existed)
- All admin API routes verify admin role server-side

### 3. Admin Panel Verification
- Verified all admin APIs work correctly with proper admin authentication:
  - `/api/admin/stats` - returns user stats, revenue, plan distribution
  - `/api/admin/users` - returns paginated user list with all details
  - `/api/admin/financial` - returns financial overview, transactions, monthly revenue
  - `/api/admin/support/tickets` - returns support tickets with messages
  - `/api/admin/support/tickets/[id]/reply` - allows admin to reply to tickets
  - `/api/admin/config` - returns system configuration
  - `/api/admin/withdrawals` - returns withdrawal requests
  - `/api/admin/cashback` - returns cashback entries
  - `/api/admin/plans` - returns plan list
  - `/api/admin/announcements` - returns announcements
- All APIs properly reject non-admin users with 403 Unauthorized
- Fixed TypeScript error in admin-page.tsx line 1798 (comparison of string|number with number)

### 4. Services Page
**Files modified**:
- `src/lib/store.ts` - Added `'services'` to PageKey type
- `src/app/page.tsx` - Added ServicesPage import and `case 'services'` in switch
- `src/components/newmobility/sidebar.tsx` - Added services menu item with Wrench icon, added Wrench to imports
- `src/components/newmobility/app-layout.tsx` - Added 'services' to sidebarLabelKeys Record
- `src/lib/i18n.ts` - Added 'sidebar.services' translations for all 5 languages (pt, en, es, fr, it)
- `src/components/newmobility/services/services-page.tsx` - Enhanced with new categories and services:
  - Added `automotivo` and `mobilidade` categories with proper colors, icons, and badges
  - Added 5 automotive services: Mecânica Automotiva, Auto Elétrica 24h, Lavagem e Estética, Borracharia, Troca de Vidros
  - Added 5 mobility services: Motorista Particular, Transfer Aeroporto, Entrega de Encomendas, Transporte Escolar, Moto Táxi 24h
  - Added new categories to the service creation dialog SelectItem options
  - Total now 20 services across 8 categories

## Access Control Layers (Defense in Depth)

### Lojista Portal:
1. **Sidebar filtering** - Non-lojista users don't see the menu item
2. **Synchronous page guard** (page.tsx) - Immediately renders Dashboard instead
3. **useEffect redirect** (page.tsx) - Sets activePage to 'dashboard'
4. **Component-level guard** (PortalLojista) - Shows "Acesso Restrito" screen

### Admin Panel:
1. **Sidebar filtering** - Non-admin users don't see the menu item
2. **Synchronous page guard** (page.tsx) - Immediately renders Dashboard instead
3. **useEffect redirect** (page.tsx) - Sets activePage to 'dashboard'
4. **Component-level guard** (AdminPage) - Shows "Acesso Restrito" screen
5. **API-level verification** - All admin API routes check user.role === 'admin'
