# Task ID: 7 — Marketplace: bidirectional reviews + favorites + remove fake testimonials

## Summary
Removed ALL hardcoded/fictional testimonials from the marketplace, added a real bidirectional review system (buyer ↔ seller) backed by a new `MarketplaceReview` Prisma model, added a favorite/wishlist system backed by `MarketplaceFavorite`, and wired both into the marketplace UI (cards, detail modal, Favoritos tab, Minhas Vendas tab, post-purchase review flow, and seller reputation display).

## Files changed

### 1. `prisma/schema.prisma` (+~50 lines)
- Added `MarketplaceReview` model with fields: `id, productId, orderId, reviewerId, revieweeId, direction ("buyer_to_seller" | "seller_to_buyer"), rating (Int 1-5), comment (String?), createdAt, updatedAt`. Includes `@@unique([orderId, direction])` so each direction can only be reviewed once per order, plus indexes on `productId`, `revieweeId`, `reviewerId`.
- Added `MarketplaceFavorite` model with fields: `id, userId, productId, createdAt`. Includes `@@unique([userId, productId])` so each user can favorite a product at most once.
- Added back-relations on `MarketplaceProduct` (`reviews`, `favorites`) and on `User` (`marketplaceReviewsWritten`, `marketplaceReviewsReceived`, `marketplaceFavorites`).
- All foreign keys use `onDelete: Cascade` so reviews/favorites are cleaned up when their parent product or user is removed.

### 2. `src/app/api/marketplace/reviews/route.ts` (NEW, ~190 lines)
- **GET** `/api/marketplace/reviews?productId=X` — returns real `buyer_to_seller` reviews for a product (no fakes). Includes reviewer name + image.
- **POST** `/api/marketplace/reviews` — creates a review. Validates:
  - `direction` is `buyer_to_seller` or `seller_to_buyer`
  - `rating` is an integer 1-5
  - The order exists and has `status` of `paid` or `delivered` (no reviewing incomplete orders)
  - The product belongs to the order
  - For `buyer_to_seller`: the reviewer must be the order's buyer; reviewee is resolved via `sellerName → User.findFirst`
  - For `seller_to_buyer`: the reviewer must be the seller (resolved via `sellerName → User`); reviewee is `order.userId`
  - Self-reviews are blocked
  - The `@@unique([orderId, direction])` constraint catches double-reviews (returns 409)
- After a successful `buyer_to_seller` review, recomputes and caches the product's `rating` + `reviewCount` so the marketplace grid shows real aggregate data.

### 3. `src/app/api/marketplace/reviews/seller/route.ts` (NEW, ~75 lines)
- **GET** `/api/marketplace/reviews/seller?userId=X` — returns the seller's aggregate reputation: `avgRating, count, distribution {5,4,3,2,1}, recent[5]`. Used to display seller reputation on their public profile / product listing header.

### 4. `src/app/api/marketplace/favorites/route.ts` (NEW, ~75 lines)
- **GET** `/api/marketplace/favorites?userId=X` — returns the user's favorited products (with full product data) sorted newest-first.
- **POST** `/api/marketplace/favorites` — toggles favorite (creates if absent, deletes if present). Returns `{ favorited: boolean, favorite? }`. Validates user and product exist.

### 5. `src/app/api/marketplace/orders/route.ts` (+2/-2 lines)
- Updated the buyer-side GET handler to include `sellerName` in each order item (was previously dropped from the product select). This is required by the marketplace UI to display the "Avaliar vendedor" button on each item.

### 6. `src/lib/api.ts` (+33 lines)
- Added `marketplaceReviewsApi` with `listForProduct`, `sellerReputation`, `create` methods.
- Added `marketplaceFavoritesApi` with `list` and `toggle` methods.

### 7. `src/components/newmobility/marketplace/marketplace-page.tsx` (+~700/-80 lines, file went from 1432 → 2253 lines)
Major surgical changes:

**Removed:**
- `mockReviews` constant (5 fictional testimonials — Ana Carolina S., Roberto M., Juliana P., Carlos A., Mariana R.).
- Hardcoded rating-summary percentages (`60/25/10/3/2`) in the detail modal — now computed from real fetched reviews.
- `mockReviews.slice(0, 3)` rendering in the detail modal — replaced with real fetched reviews.

**Added (state):**
- `favoriteIds: Set<string>` + `favoritedProducts: Product[]` + `favoritesLoading`
- `productReviews: Record<productId, ProductReview[]>` + `reviewsLoading`
- `sellerReputations: Record<sellerName, {avgRating, count, loading}>`
- Review dialog state: `reviewDialog`, `reviewRating`, `reviewHoverRating`, `reviewComment`, `reviewSubmitting`
- `submittedReviews: Set<"${orderId}:${direction}">` — hides the "Avaliar" button after success
- `sales: any[]` (for the Minhas Vendas tab)

**Added (handlers):**
- `fetchFavorites()` — loads user's favorites on mount + when Favoritos tab is opened
- `toggleFavorite(product, e)` — optimistic UI update + API call + rollback on error
- `fetchProductReviews(productId)` — loads real reviews when a product modal opens
- `fetchSellerReputation(sellerName)` — computes seller's aggregate reputation from cached product ratings
- `fetchSales()` — loads orders containing the current user's products (via `?sellerName=`)
- `openReviewDialog()`, `closeReviewDialog()`, `submitReview()` — full review submission flow
- `renderStarPicker()` — interactive 1-5 star picker with hover state

**Added (UI):**
- **4 tabs** instead of 2: `Produtos` | `Favoritos` (with ❤ icon + count badge) | `Meus Pedidos` | `Minhas Vendas`
- **Favorite button on every product card** — heart icon overlay (top-right corner of image). Filled rose when favorited, outline when not. Toggles via POST /api/marketplace/favorites with optimistic update.
- **Favorite button in product detail modal** — larger heart button next to the rating, same toggle behavior.
- **Favoritos tab** — grid of favorited products (same card layout as the products tab, but with filled heart to indicate favorited state). Empty state: "Você ainda não favoritou nenhum produto" + CTA to explore marketplace.
- **Minhas Vendas tab** — seller's view of orders containing their products. Same order card layout as Meus Pedidos but with "Avaliar comprador" button on delivered/paid orders.
- **Real reviews display in detail modal**:
  - Rating summary computed from fetched reviews (real distribution %).
  - Loading state with spinner.
  - Empty state: "Ainda não há avaliações para este produto." + "Compre e avalie para ser o primeiro!"
  - Each review shows reviewer avatar, name, "Compra verificada" badge, stars, comment, date.
- **Seller reputation in detail modal** — avg stars + count, shown under the seller name in the seller info card.
- **"Avaliar vendedor" button** on each item of delivered/paid orders (Meus Pedidos tab).
- **"Avaliar comprador" button** on delivered/paid sales (Minhas Vendas tab).
- **Post-purchase Review Dialog** — star picker (1-5) + comment textarea (max 500 chars) + submit/cancel buttons. Used for both directions.

## Verification
- `bun run lint` → 13 errors, ALL pre-existing in root `.js` helper scripts (keep-alive.js, persistent-server.js, process-manager.js, run-forever.js, supervisor.js — documented in DEPLOY-FIX-LIPEHOST-1). **0 new lint errors in any of my files.**
- `npx eslint` on my 6 modified/created files → 0 errors, 0 warnings.
- `npx tsc --noEmit --skipLibCheck` on my files → 0 errors. (Pre-existing errors in `seed-marketplace-v2/route.ts`, `lib/api.ts:163` duplicate `getWithdrawals`, and 4 missing-export errors in admin components — all unrelated to this task.)
- `bunx prisma generate` was run to regenerate the Prisma Client types (does NOT touch the database — only regenerates TypeScript types in `node_modules/@prisma/client`).

## Does `bun run db:push` need to be run?
**YES.** The schema was updated with 2 new models (`MarketplaceReview`, `MarketplaceFavorite`) and new relation fields on `MarketplaceProduct` and `User`. Until `bun run db:push` is executed, the physical database tables won't exist and any attempt to read/write reviews or favorites will fail at runtime with a Prisma error ("Table marketplace_review does not exist" or similar). The instructions said NOT to run `db:push` in this sandbox — so it must be run before this feature is usable in production.

After `db:push`, the feature is fully functional:
1. Buyers can favorite products (heart icon on cards + modal).
2. Buyers see their favorites in the Favoritos tab.
3. After a delivered/paid order, buyers can rate the seller (1-5 stars + comment) via the "Avaliar vendedor" button.
4. Sellers can rate buyers via the "Avaliar comprador" button on the Minhas Vendas tab.
5. Real reviews (no fakes) appear on product detail modals.
6. Seller reputation (avg stars + count) appears in the detail modal's seller info card.
7. The product's cached `rating` + `reviewCount` are auto-updated when a buyer_to_seller review is submitted.
