'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronLeft, Search, ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// MobileCategoryLayout + helpers
// ----------------------------------------------------------------------------
// Reusable scaffolding for the 7 shopping-style category pages (shopping,
// alimentacao, mercado, medidrop, etc.). Each page provides:
//   - title (header text)
//   - accentColor (used for the header tint and CTA buttons)
//   - searchPlaceholder
//   - category (the marketplace category filter — passed to /api/marketplace)
//   - children (optional extra content rendered above the product grid)
//   - emptyHint (shown when no products match)
//
// The layout itself:
//   1. Sticky header (colored gradient) with back button + title + search icon.
//   2. Search bar (collapses on scroll later — for now always visible).
//   3. Featured products grid (fetched from /api/marketplace/products).
//   4. Empty state.
// ============================================================================

const PRIMARY = '#155EEF'
const MINT_BG = '#EAF7EF'

export interface Product {
  id: string
  name: string
  description?: string | null
  price: number
  originalPrice?: number | null
  category: string
  imageUrl?: string | null
  sellerName?: string | null
  cashbackPercent?: number
  isFeatured?: boolean
  stock?: number
}

interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  totalPages: number
}

interface CategoryLayoutProps {
  title: string
  accentColor?: string
  searchPlaceholder?: string
  category?: string
  emptyHint?: string
  children?: ReactNode
  /** Optional hero banner rendered above the search bar. */
  hero?: ReactNode
}

export function MobileCategoryLayout({
  title,
  accentColor = PRIMARY,
  searchPlaceholder = 'Buscar nesta categoria...',
  category,
  emptyHint = 'Nenhum produto disponível nesta categoria ainda.',
  children,
  hero,
}: CategoryLayoutProps) {
  const router = useRouter()
  const { loading: authLoading } = useMobileAuth()
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [fetching, setFetching] = useState(true)

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const params = new URLSearchParams({ limit: '24' })
      if (category) params.set('category', category)
      if (query.trim()) params.set('search', query.trim())
      const resp = await apiFetch<ProductsResponse>(
        `/marketplace/products?${params.toString()}`
      )
      setProducts(resp.products || [])
    } catch (err) {
      // Most categories don't have real products yet — silent fail is OK,
      // we show the empty state.
      setProducts([])
    } finally {
      setFetching(false)
    }
  }, [category, query])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  return (
    <MobileAppShell>
      {/* ════════════════ HEADER ════════════════ */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: `linear-gradient(160deg, ${accentColor} 0%, ${shade(accentColor, -10)} 100%)`,
        }}
      >
        <div style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="px-3 h-14 flex items-center gap-2">
          <button
            onClick={() => router.push('/mobile/inicio')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors min-w-[44px] min-h-[44px]"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5 text-white" strokeWidth={2.5} />
          </button>
          <h1 className="flex-1 text-base font-bold text-white truncate text-center">
            {title}
          </h1>
          <button
            onClick={() => toast.info('Busca avançada em breve')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors min-w-[44px] min-h-[44px]"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-white text-sm font-medium text-gray-900 focus:outline-none min-h-[44px]"
            />
          </div>
        </div>
      </header>

      {/* Hero content (optional) */}
      {hero && <div className="px-4 pt-4">{hero}</div>}

      {/* Page-specific content above product grid */}
      {children && <div className="px-4 pt-4">{children}</div>}

      {/* ════════════════ PRODUCT GRID ════════════════ */}
      <section className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">
            {query.trim() ? 'Resultados' : 'Destques'}
          </h2>
          {!fetching && products.length > 0 && (
            <span className="text-[11px] text-gray-500">
              {products.length} produto(s)
            </span>
          )}
        </div>

        {fetching ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: accentColor }} />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-3"
              style={{ backgroundColor: MINT_BG }}
            >
              <ShoppingBag className="h-7 w-7" style={{ color: '#059669' }} />
            </div>
            <p className="text-sm font-bold text-gray-900">Nada por aqui ainda</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[260px] mx-auto">
              {emptyHint}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="relative h-32 bg-gray-100">
                  {product.imageUrl ? (
                     
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="h-full w-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${MINT_BG} 0%, #F0FDF4 100%)`,
                      }}
                    >
                      <ShoppingBag className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  {product.sellerName && (
                    <p className="text-[10px] text-gray-400 mb-0.5 truncate">
                      {product.sellerName}
                    </p>
                  )}
                  <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    R$ {formatBRL(product.price)}
                  </p>
                  {product.cashbackPercent && product.cashbackPercent > 0 && (
                    <p className="text-[9px] font-semibold mt-0.5" style={{ color: '#22C55E' }}>
                      {product.cashbackPercent}% cashback
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <div className="h-4" />
    </MobileAppShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// shade — darken/lighten a hex color by a percentage (-100..100).
// Used to compute the header gradient bottom color from the accent.
// ─────────────────────────────────────────────────────────────────────────────
function shade(hex: string, percent: number): string {
  try {
    const h = hex.replace('#', '')
    const num = parseInt(h, 16)
    const r = Math.max(0, Math.min(255, (num >> 16) + (percent * 255) / 100))
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + (percent * 255) / 100))
    const b = Math.max(0, Math.min(255, (num & 0xff) + (percent * 255) / 100))
    return `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
      .toString(16)
      .slice(1)}`
  } catch {
    return hex
  }
}
