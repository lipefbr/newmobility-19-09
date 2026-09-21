'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Search,
  X,
  ShoppingBag,
  Store,
  Plus,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/procurar — Search products across the marketplace.
// ----------------------------------------------------------------------------
// - Auto-focused search bar at the top.
// - Debounced (300ms) calls to GET /api/marketplace/products?search=X.
// - Recent searches stored in localStorage.
// - Popular categories chips to jump-start searches.
// - Results grid: image, name, store, price, add-to-cart (toast for now).
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'

interface Product {
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
}

interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  totalPages: number
}

const POPULAR_CATEGORIES = [
  'Eletrônicos',
  'Alimentação',
  'Mercado',
  'Farmácia',
  'Moda',
  'Casa',
]

const RECENT_KEY = 'newmobility-mobile-recent-searches'

function loadRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.slice(0, 8) : []
  } catch {
    return []
  }
}

function saveRecent(term: string) {
  if (typeof window === 'undefined') return
  const cur = loadRecent().filter((t) => t !== term)
  const next = [term, ...cur].slice(0, 8)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function clearRecent() {
  if (typeof window) localStorage.removeItem(RECENT_KEY)
}

export default function ProcurarPage() {
  const router = useRouter()
  const { user, loading } = useMobileAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus search on mount
  useEffect(() => {
    inputRef.current?.focus()
    setRecent(loadRecent())
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const resp = await apiFetch<ProductsResponse>(
          `/marketplace/products?search=${encodeURIComponent(query.trim())}&limit=24`
        )
        setResults(resp.products || [])
        setHasSearched(true)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro na busca')
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const onSearch = (term: string) => {
    setQuery(term)
    if (term.trim()) {
      saveRecent(term.trim())
      setRecent(loadRecent())
    }
  }

  const onAddToCart = (product: Product) => {
    toast.success(`${product.name} adicionado à sacola`)
  }

  if (loading && !user) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Procurar" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
        </div>
      </MobileAppShell>
    )
  }

  return (
    <MobileAppShell>
      <MobilePageHeader title="Procurar" />

      {/* Search bar */}
      <div className="px-4 pt-4 sticky top-14 z-20 bg-white pb-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) onSearch(query.trim())
            }}
            placeholder="Buscar produtos, lojas..."
            className="w-full h-12 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-500 min-h-[44px]"
            style={{ borderColor: PRIMARY }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px]"
              aria-label="Limpar"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4">
        {/* Recent searches (only when no active query) */}
        {!query.trim() && recent.length > 0 && (
          <section className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Buscas recentes
              </h2>
              <button
                onClick={() => {
                  clearRecent()
                  setRecent([])
                }}
                className="text-[11px] font-semibold text-gray-500 min-h-[44px] min-w-[44px] text-right"
              >
                Limpar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => onSearch(r)}
                  className="px-3 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-700 min-h-[44px] flex items-center"
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Popular categories (only when no active query) */}
        {!query.trim() && (
          <section className="mb-4">
            <h2 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Categorias populares
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {POPULAR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSearch(cat)}
                  className="px-2 py-3 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow text-xs font-semibold text-gray-700 min-h-[44px] flex items-center justify-center text-center"
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Search results */}
        {query.trim() && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-gray-700">
                {searching
                  ? 'Buscando...'
                  : `${results.length} resultado(s) para "${query.trim()}"`}
              </h2>
            </div>

            {searching ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: PRIMARY }} />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12">
                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-3"
                  style={{ backgroundColor: MINT_BG }}
                >
                  <Search className="h-7 w-7" style={{ color: '#059669' }} />
                </div>
                <p className="text-sm font-bold text-gray-900">Nenhum resultado</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[240px] mx-auto">
                  Tente outro termo ou verifique a grafia.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {results.map((product, idx) => (
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
                        <p className="text-[10px] text-gray-400 mb-0.5 truncate flex items-center gap-0.5">
                          <Store className="h-2.5 w-2.5" />
                          {product.sellerName}
                        </p>
                      )}
                      <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2">
                        {product.name}
                      </p>
                      <div className="flex items-end justify-between mt-1.5">
                        <div>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <p className="text-[9px] text-gray-400 line-through">
                              R$ {formatBRL(product.originalPrice)}
                            </p>
                          )}
                          <p className="text-sm font-bold text-gray-900">
                            R$ {formatBRL(product.price)}
                          </p>
                          {product.cashbackPercent && product.cashbackPercent > 0 && (
                            <p className="text-[9px] font-semibold" style={{ color: GREEN }}>
                              {product.cashbackPercent}% cashback
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => onAddToCart(product)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white min-w-[44px] min-h-[44px]"
                          style={{ backgroundColor: PRIMARY }}
                          aria-label="Adicionar à sacola"
                        >
                          <Plus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}
