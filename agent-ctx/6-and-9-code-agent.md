# Task 6 & 9 - Services Page, Portal Lojista, and Support Ticket System

## Summary
Completed both tasks: verified and enhanced the Services page and Portal do Lojista, and fully connected the support ticket system between users and admin panel.

## Files Modified
1. `src/components/newmobility/services/services-page.tsx` - Fixed phone fallback
2. `src/components/newmobility/portals/portal-lojista.tsx` - Complete rewrite with product posting
3. `src/components/newmobility/support/support-page.tsx` - Complete rewrite with API integration
4. `src/components/newmobility/admin/admin-page.tsx` - Connected support tab to API
5. `src/app/api/marketplace/products/route.ts` - Allow lojista users to post products

## Files Created
1. `src/app/api/admin/support/tickets/route.ts` - GET all tickets for admin
2. `src/app/api/admin/support/tickets/[ticketId]/route.ts` - PUT update ticket status
3. `src/app/api/admin/support/tickets/[ticketId]/reply/route.ts` - POST admin reply

## Key Changes
- Support flow is now fully connected: user creates ticket → admin sees in panel → admin replies → user sees reply
- Portal Lojista allows lojista users to add products to marketplace
- All mock data replaced with real API calls
- Marketplace product POST allows lojista/motorista users (not just admin)
