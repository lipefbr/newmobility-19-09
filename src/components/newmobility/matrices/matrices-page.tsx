'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  DollarSign, TrendingUp, ShoppingBag, Layers, Users, ArrowRight,
  Search, Filter, Download, Calendar, Package, ShoppingCart,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { cn, formatCurrency, formatDate, getStatusLabel, getStatusVariant, getPlanName } from '@/lib/utils'
import { MatrixVisualization } from '../cashback/matrix-visualization'

// ─────────────────────────────────────────────────────────────────────────────
// MatricesPage
//
// Unified "Matrizes & Tabelas" page requested by the user so both regular
// users and admins have a single place to view:
//   1. Matriz de Entrada (4x5 — 5 níveis)
//   2. Matriz Residual  (4x7 — 7 níveis)
//   3. Matriz de Vendas  (4x9 — 9 níveis)
//   4. Tabela de Compras (histórico real de transações do usuário)
//
// All data shown here is REAL — fetched from the existing
// /api/dashboard, /api/cashback/{type}, and /api/financial/transactions
// endpoints. There is NO mock / fictional data.
// ─────────────────────────────────────────────────────────────────────────────

type MatrixType = 'entrada' | 'residual' | 'vendas'

interface MatrixSummary {
  totalUsers: number
  totalEarned: number
  byLevel: Record<string, number>
}

interface PurchaseRow {
  id: string
  description: string
  category: string
  amount: number
  cashbackAmount?: number
  status: string
  createdAt: string
}

const matrixTabs: { key: MatrixType; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'entrada', label: 'Entrada', icon: DollarSign, description: 'Matriz 4x5 — 5 níveis de profundidade' },
  { key: 'residual', label: 'Residual', icon: TrendingUp, description: 'Matriz 4x7 — 7 níveis de profundidade' },
  { key: 'vendas', label: 'Vendas', icon: ShoppingBag, description: 'Matriz 4x9 — 9 níveis de profundidade' },
]

const categoryLabels: Record<string, string> = {
  mobility: 'Mobilidade',
  pharmacy: 'Farmácia',
  food: 'Refeição',
  shopping: 'Shopping',
  purchase: 'Compra',
}

const categoryColors: Record<string, string> = {
  mobility: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pharmacy: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  food: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  shopping: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  purchase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

export function MatricesPage() {
  const { t } = useTranslation()
  const { user, setActivePage } = useStore()
  const [activeTab, setActiveTab] = useState<MatrixType | 'compras'>('entrada')

  // ─── Matrix summary (real network-descendant counts) ──────────────────
  const [matrixSummary, setMatrixSummary] = useState<{
    entrada: MatrixSummary
    residual: MatrixSummary
    vendas: MatrixSummary
  }>({
    entrada: { totalUsers: 0, totalEarned: 0, byLevel: {} },
    residual: { totalUsers: 0, totalEarned: 0, byLevel: {} },
    vendas: { totalUsers: 0, totalEarned: 0, byLevel: {} },
  })
  const [matrixLoading, setMatrixLoading] = useState(true)

  // ─── Purchases (real transactions) ────────────────────────────────────
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [purchasesLoading, setPurchasesLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Fetch the user's REAL network matrix summary from /api/dashboard.
  // This returns the per-level descendant counts (computed from the
  // referral tree) for the entrada (5 levels), residual (7 levels) and
  // vendas (9 levels) matrices.
  const fetchMatrixSummary = useCallback(async () => {
    if (!user?.id) return
    let cancelled = false
    setMatrixLoading(true)
    try {
      const res = await fetch(`/api/dashboard?userId=${user.id}`)
      if (!res.ok) return
      const d = await res.json()
      if (cancelled || !d) return
      setMatrixSummary({
        entrada: {
          totalUsers: d?.cashbackEntrada?.totalUsers ?? 0,
          totalEarned: d?.cashbackEntrada?.totalEarned ?? 0,
          byLevel: d?.cashbackEntrada?.byLevel ?? {},
        },
        residual: {
          totalUsers: d?.cashbackResidual?.totalUsers ?? 0,
          totalEarned: d?.cashbackResidual?.totalEarned ?? 0,
          byLevel: d?.cashbackResidual?.byLevel ?? {},
        },
        vendas: {
          totalUsers: d?.cashbackVendas?.totalUsers ?? 0,
          totalEarned: d?.cashbackVendas?.totalEarned ?? 0,
          byLevel: d?.cashbackVendas?.byLevel ?? {},
        },
      })
    } catch (err) {
      console.error('Failed to load matrix summary:', err)
    } finally {
      if (!cancelled) setMatrixLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchMatrixSummary()
  }, [fetchMatrixSummary])

  // Fetch the user's REAL purchases from /api/financial/transactions.
  // We filter client-side to keep only purchase-like categories.
  const fetchPurchases = useCallback(async () => {
    if (!user?.id) return
    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    setPurchasesLoading(true)
    try {
      const res = await fetch(`/api/financial/transactions?userId=${user.id}&type=all&page=1&limit=100`, {
        signal: controller.signal,
      })
      if (!res.ok) return
      const d = await res.json()
      if (cancelled || !d) return
      const rows: any[] = Array.isArray(d?.transactions) ? d.transactions : []
      const purchaseRows = rows.filter((tx) =>
        tx.type === 'purchase' ||
        ['mobility', 'pharmacy', 'food', 'shopping'].includes(tx.category || '')
      ).map((tx) => ({
        id: tx.id,
        description: tx.description || categoryLabels[tx.category] || 'Compra',
        category: tx.category || 'purchase',
        amount: Number(tx.amount || 0),
        cashbackAmount: tx.cashbackAmount ? Number(tx.cashbackAmount) : undefined,
        status: tx.status || 'pending',
        createdAt: tx.createdAt,
      }))
      setPurchases(purchaseRows)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error('Failed to load purchases:', err)
      setPurchases([])
    } finally {
      clearTimeout(timeout)
      if (!cancelled) setPurchasesLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  const totalNetworkMembers =
    matrixSummary.entrada.totalUsers +
    matrixSummary.residual.totalUsers +
    matrixSummary.vendas.totalUsers

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch = p.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const totalSpent = filteredPurchases.reduce((acc, p) => acc + p.amount, 0)
  const totalCashback = filteredPurchases.reduce((acc, p) => acc + (p.cashbackAmount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            Matrizes & Tabelas
          </h2>
          <p className="text-sm text-muted-foreground">
            Visualize suas matrizes de indicação (Entrada, Residual, Vendas) e sua tabela de compras — dados reais da sua rede.
          </p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 w-fit">
          <Users className="h-3 w-3 mr-1" />
          {totalNetworkMembers.toLocaleString('pt-BR')} membros na rede
        </Badge>
      </div>

      {/* Summary cards (real counts) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {matrixLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <SummaryMiniCard
              icon={DollarSign}
              label="Matriz Entrada"
              value={matrixSummary.entrada.totalUsers}
              caption="membros · 4x5"
              color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              onClick={() => setActiveTab('entrada')}
            />
            <SummaryMiniCard
              icon={TrendingUp}
              label="Matriz Residual"
              value={matrixSummary.residual.totalUsers}
              caption="membros · 4x7"
              color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
              onClick={() => setActiveTab('residual')}
            />
            <SummaryMiniCard
              icon={ShoppingBag}
              label="Matriz Vendas"
              value={matrixSummary.vendas.totalUsers}
              caption="membros · 4x9"
              color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              onClick={() => setActiveTab('vendas')}
            />
            <SummaryMiniCard
              icon={ShoppingCart}
              label="Tabela Compras"
              value={purchases.length}
              caption="transações reais"
              color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
              onClick={() => setActiveTab('compras')}
            />
          </>
        )}
      </div>

      {/* Tabs: Entrada | Residual | Vendas | Compras */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MatrixType | 'compras')}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="entrada" className="gap-1.5 py-2">
            <DollarSign className="h-3.5 w-3.5" /> Entrada
          </TabsTrigger>
          <TabsTrigger value="residual" className="gap-1.5 py-2">
            <TrendingUp className="h-3.5 w-3.5" /> Residual
          </TabsTrigger>
          <TabsTrigger value="vendas" className="gap-1.5 py-2">
            <ShoppingBag className="h-3.5 w-3.5" /> Vendas
          </TabsTrigger>
          <TabsTrigger value="compras" className="gap-1.5 py-2">
            <ShoppingCart className="h-3.5 w-3.5" /> Compras
          </TabsTrigger>
        </TabsList>

        {/* Matrix tabs — re-use the existing MatrixVisualization component */}
        {matrixTabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="mt-4 space-y-4">
            <Card className="border-emerald-100/50 dark:border-emerald-900/30">
              <CardContent className="p-3 flex items-center gap-2">
                <tab.icon className="h-4 w-4 text-emerald-600" />
                <p className="text-xs text-muted-foreground">{tab.description}</p>
              </CardContent>
            </Card>
            <MatrixVisualization type={tab.key} />
          </TabsContent>
        ))}

        {/* Compras tab — real transaction history */}
        <TabsContent value="compras" className="mt-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">TOTAL GASTO</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totalSpent)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">COMPRAS</p>
                  <p className="text-lg font-bold text-foreground">{filteredPurchases.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">CASHBACK RECEBIDO</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalCashback)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm min-w-[160px]"
            >
              <option value="all">Todas categorias</option>
              <option value="mobility">Mobilidade</option>
              <option value="pharmacy">Farmácia</option>
              <option value="food">Refeição</option>
              <option value="shopping">Shopping</option>
            </select>
          </div>

          {/* Real purchases table */}
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {purchasesLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredPurchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma compra registrada ainda</p>
                  <p className="text-xs text-muted-foreground/70 max-w-md">
                    Faça compras nos portais (Mobilidade, Farmácia, Refeição, Shopping) para ver seu histórico aqui.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1.5"
                    onClick={() => setActivePage('marketplace')}
                  >
                    Ir para Marketplace <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">CashBack</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchases.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-foreground max-w-[220px] truncate">
                            {p.description}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-[10px]', categoryColors[p.category] || categoryColors.purchase)}>
                              {categoryLabels[p.category] || p.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(p.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(p.status)} className="text-[10px]">
                              {getStatusLabel(p.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatCurrency(p.amount)}
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell text-emerald-600 dark:text-emerald-400 font-medium">
                            {p.cashbackAmount ? formatCurrency(p.cashbackAmount) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Small summary card used at the top of the page. Clicking it switches the
// active tab to the corresponding matrix.
function SummaryMiniCard({
  icon: Icon,
  label,
  value,
  caption,
  color,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: number
  caption: string
  color: string
  onClick?: () => void
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="text-left"
    >
      <Card className="shadow-sm bg-card hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={cn('p-2.5 rounded-lg', color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-bold text-foreground">{value.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground">{caption}</p>
          </div>
        </CardContent>
      </Card>
    </motion.button>
  )
}
