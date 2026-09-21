'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate, getStatusLabel, getStatusVariant } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { ShoppingCart, Search, Filter, Calendar, Package, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// Relatório de Compras (Purchases Report)
//
// Previously this page rendered 10 hardcoded mock purchases. It now fetches
// REAL purchase data from the MarketplaceOrder table via GET /api/purchases,
// which returns:
//   - purchases: Array<{ id, date, item, category, amount, cashback, status, seller }>
//   - summary:   { totalSpent, totalPurchases, totalCashback, thisMonthCount, thisMonthSpent }
//   - pagination:{ page, limit, total, totalPages }
//
// The category filter and the search box are applied CLIENT-SIDE on top of
// the page of results returned by the API. Pagination is server-side but the
// UI uses an "infinite list within max-h-96" pattern (the API default limit
// of 20 already covers typical user histories).
// ─────────────────────────────────────────────────────────────────────────────

interface Purchase {
  id: string
  date: string
  item: string
  category: 'mobility' | 'pharmacy' | 'food' | 'shopping'
  amount: number
  cashback: number
  status: 'paid' | 'pending' | 'shipped' | 'cancelled' | 'completed'
  seller: string
}

interface PurchasesSummary {
  totalSpent: number
  totalPurchases: number
  totalCashback: number
  thisMonthCount: number
  thisMonthSpent: number
}

const categoryLabels: Record<string, string> = {
  mobility: 'Mobilidade',
  pharmacy: 'Farmácia',
  food: 'Refeição',
  shopping: 'Shopping',
}

const categoryColors: Record<string, string> = {
  mobility: 'bg-blue-100 text-blue-700',
  pharmacy: 'bg-rose-100 text-rose-700',
  food: 'bg-orange-100 text-orange-700',
  shopping: 'bg-purple-100 text-purple-700',
}

const statusLabels: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  shipped: 'Enviado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
}

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  shipped: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-rose-100 text-rose-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

export function PurchasesPage() {
  const { user } = useStore()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [summary, setSummary] = useState<PurchasesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/purchases?userId=${encodeURIComponent(user.id)}&limit=100`,
          { cache: 'no-store' }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setPurchases(Array.isArray(data?.purchases) ? data.purchases : [])
        setSummary(data?.summary ?? null)
      } catch (err) {
        console.error('Failed to load purchases:', err)
        if (!cancelled) {
          setError('Não foi possível carregar suas compras. Tente novamente.')
          setPurchases([])
          setSummary(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Client-side filter: search matches the item label or seller name;
  // category filter narrows to one of the four UI buckets. The API already
  // supports a `category` query param, but applying it client-side too keeps
  // the search + category UX instant (no extra round-trip per filter change).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return purchases.filter((p) => {
      const matchesSearch =
        q.length === 0 ||
        p.item.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [purchases, search, categoryFilter])

  // Visible totals reflect the ACTIVE filter (matches the previous behavior
  // where the summary cards used the filtered list). The summary header
  // below uses the API-provided totals (unfiltered) so the user always sees
  // their lifetime totals at a glance.
  const filteredTotalSpent = filtered.reduce((acc, p) => acc + (p.amount || 0), 0)
  const filteredTotalCashback = filtered.reduce((acc, p) => acc + (p.cashback || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Relatório de Compras</h2>
        <p className="text-sm text-gray-500">Histórico completo de compras e CashBack</p>
      </div>

      {/* Summary header — driven by the API's unfiltered totals so it always
          reflects the user's lifetime purchase activity, not just the current
          filter selection. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">TOTAL GASTO</p>
              {loading ? (
                <Skeleton className="h-6 w-24 mt-1" />
              ) : (
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(summary?.totalSpent ?? 0)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">COMPRAS</p>
              {loading ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-lg font-bold text-gray-900">
                  {summary?.totalPurchases ?? 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-100 text-amber-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">COMPRAS ESTE MÊS</p>
              {loading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : (
                <p className="text-lg font-bold text-gray-900">
                  {summary?.thisMonthCount ?? 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar compras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            disabled={loading}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={loading}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="mobility">Mobilidade</SelectItem>
            <SelectItem value="pharmacy">Farmácia</SelectItem>
            <SelectItem value="food">Refeição</SelectItem>
            <SelectItem value="shopping">Shopping</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visible-list totals — reflect the active filter selection */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <Badge variant="outline" className="text-[10px]">
          {filtered.length} {filtered.length === 1 ? 'compra' : 'compras'}
        </Badge>
        <span>
          Subtotal filtrado: <span className="font-semibold text-gray-900">{formatCurrency(filteredTotalSpent)}</span>
        </span>
        <span>
          CashBack filtrado: <span className="font-semibold text-emerald-700">{formatCurrency(filteredTotalCashback)}</span>
        </span>
      </div>

      {/* Purchase List / Loading / Empty states */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
            Compras Realizadas
            {loading && <Loader2 className="h-3 w-3 ml-1 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-96 overflow-y-auto custom-scrollbar">
            {loading ? (
              // Skeleton rows — 6 placeholders match the row height of a real
              // purchase entry so the layout doesn't shift when data arrives.
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-5 w-20 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Skeleton className="h-4 w-2/3 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <div className="text-right space-y-1.5">
                    <Skeleton className="h-4 w-16 rounded ml-auto" />
                    <Skeleton className="h-3 w-12 rounded ml-auto" />
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="p-8 text-center">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-rose-400" />
                <p className="text-sm text-rose-600 font-medium">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-gray-500">
                  {purchases.length === 0
                    ? 'Nenhuma compra realizada ainda'
                    : 'Nenhuma compra encontrada para o filtro selecionado'}
                </p>
                <p className="text-xs mt-1">
                  {purchases.length === 0
                    ? 'Suas compras no marketplace aparecerão aqui.'
                    : 'Tente limpar a busca ou trocar a categoria.'}
                </p>
              </div>
            ) : (
              filtered.map((purchase, i) => (
                <motion.div
                  key={purchase.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <Badge className={`text-[10px] shrink-0 ${categoryColors[purchase.category] || 'bg-gray-100 text-gray-700'}`}>
                    {categoryLabels[purchase.category] || purchase.category}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{purchase.item}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(purchase.date)} · {purchase.seller}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(purchase.amount)}</p>
                    {purchase.cashback > 0 ? (
                      <p className="text-xs text-emerald-600 font-medium">CB: {formatCurrency(purchase.cashback)}</p>
                    ) : (
                      <Badge className={`text-[9px] ml-auto ${statusColors[purchase.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[purchase.status] || purchase.status}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
