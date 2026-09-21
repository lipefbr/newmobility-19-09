'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  TrendingUp,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
  Calendar,
  Filter,
  Activity,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { useStore } from '@/lib/store'
import { formatBRL } from '@/lib/format'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
} from 'recharts'

// ---------------- Types ----------------
interface SummaryPayload {
  totalEntradas: number
  totalSaidas: number
  saldo: number
  cashbackRecebido: number
  count: number
}

interface ByCategory {
  category: string
  total: number
  count: number
}

interface ByMonth {
  month: string
  entradas: number
  saidas: number
  saldo: number
}

interface TxRow {
  id: string
  type: string
  category: string
  description: string
  amount: number
  status: string
  createdAt: string
}

interface ReportResponse {
  summary: SummaryPayload
  byCategory: ByCategory[]
  byMonth: ByMonth[]
  transactions: TxRow[]
  filters: {
    category: string | null
    type: string | null
    startDate: string | null
    endDate: string | null
  }
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'mobility', label: 'Mobilidade' },
  { value: 'shopping', label: 'Compras' },
  { value: 'food', label: 'Refeição' },
  { value: 'pharmacy', label: 'Farmácia' },
  { value: 'gratification', label: 'Gratificação' },
  { value: 'withdrawal', label: 'Saque' },
  { value: 'paymentInvoice', label: 'Pagamento Fatura' },
  { value: 'outros', label: 'Outros' },
]

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'credit', label: 'Entrada' },
  { value: 'debit', label: 'Saída' },
  { value: 'withdrawal', label: 'Saque' },
  { value: 'cashback_entry', label: 'Cashback Entrada' },
  { value: 'cashback_residual', label: 'Cashback Residual' },
  { value: 'cashback_sales', label: 'Cashback Vendas' },
  { value: 'payment', label: 'Pagamento' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'challenge_reward', label: 'Recompensa Desafio' },
]

const typeLabel = (t: string): string => {
  const found = TYPE_OPTIONS.find((o) => o.value === t)
  return found ? found.label : t
}

const statusLabel = (s: string): string => {
  const map: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
    failed: 'Falhou',
  }
  return map[s] || s
}

const statusBadgeClass = (s: string): string => {
  if (s === 'paid' || s === 'approved')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  if (s === 'pending')
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  if (s === 'rejected' || s === 'failed' || s === 'cancelled')
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
}

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-')
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ]
  return months[parseInt(mo, 10) - 1] + '/' + y.slice(2)
}

const PAGE_SIZE = 10

// ---------------- Component ----------------
export function ReportsPage() {
  const { user } = useStore()

  // Filter inputs (the "draft" values the user types before clicking Aplicar)
  const [categoryDraft, setCategoryDraft] = useState('all')
  const [typeDraft, setTypeDraft] = useState('all')
  const [startDateDraft, setStartDateDraft] = useState('')
  const [endDateDraft, setEndDateDraft] = useState('')

  // Applied filters (used to actually fetch + build the export URL)
  const [category, setCategory] = useState('all')
  const [type, setType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [data, setData] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)

  const buildQuery = useCallback(
    (cat: string, ty: string, sd: string, ed: string) => {
      const p = new URLSearchParams({ userId: String(user?.id || '') })
      if (cat && cat !== 'all') p.set('category', cat)
      if (ty && ty !== 'all') p.set('type', ty)
      if (sd) p.set('startDate', sd)
      if (ed) p.set('endDate', ed)
      return p.toString()
    },
    [user?.id]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<ReportResponse>(
        `/reports?${buildQuery(category, type, startDate, endDate)}`
      )
      setData(res)
      setPage(1)
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao carregar relatório'
      toast.error(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [buildQuery, category, type, startDate, endDate])

  useEffect(() => {
    void fetchData()
  }, [category, type, startDate, endDate])

  const handleApplyFilters = () => {
    setCategory(categoryDraft)
    setType(typeDraft)
    setStartDate(startDateDraft)
    setEndDate(endDateDraft)
  }

  const handleClearFilters = () => {
    setCategoryDraft('all')
    setTypeDraft('all')
    setStartDateDraft('')
    setEndDateDraft('')
    setCategory('all')
    setType('all')
    setStartDate('')
    setEndDate('')
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const qs = buildQuery(category, type, startDate, endDate)
      const res = await fetch(`/api/reports/export?${qs}`, { method: 'GET' })
      if (!res.ok) throw new Error('Falha no export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/i)
      a.download =
        match?.[1] ||
        `relatorio-newmobility-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('CSV exportado com sucesso!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao exportar CSV'
      toast.error(msg)
    } finally {
      setExporting(false)
    }
  }

  // Pagination of the in-memory transactions list
  const pagedTx = useMemo(() => {
    const list = data?.transactions || []
    const start = (page - 1) * PAGE_SIZE
    return list.slice(start, start + PAGE_SIZE)
  }, [data, page])
  const totalPages = Math.max(
    1,
    Math.ceil((data?.transactions?.length || 0) / PAGE_SIZE)
  )

  const monthlyChart = useMemo(() => {
    return (data?.byMonth || []).map((m) => ({
      month: formatMonth(m.month),
      Entradas: m.entradas / 100,
      Saídas: m.saidas / 100,
    }))
  }, [data])

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-xs" style={{ color: p.color }}>
              {p.name}: {formatBRL(Math.round((p.value || 0) * 100))}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const summaryCards = [
    {
      label: 'Total Entradas',
      value: data?.summary.totalEntradas || 0,
      icon: ArrowUpRight,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Total Saídas',
      value: data?.summary.totalSaidas || 0,
      icon: ArrowDownRight,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      label: 'Saldo',
      value: data?.summary.saldo || 0,
      icon: Wallet,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Cashback Recebido',
      value: data?.summary.cashbackRecebido || 0,
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Relatórios e Análises
          </h2>
          <p className="text-sm text-muted-foreground">
            Visualize suas movimentações e exporte os dados em CSV.
          </p>
        </div>
        <Button
          onClick={() => void handleExport()}
          disabled={exporting}
          className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
        >
          {exporting ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4 text-emerald-600" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select value={categoryDraft} onValueChange={setCategoryDraft}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={typeDraft} onValueChange={setTypeDraft}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data inicial</Label>
              <Input
                type="date"
                value={startDateDraft}
                onChange={(e) => setStartDateDraft(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data final</Label>
              <Input
                type="date"
                value={endDateDraft}
                onChange={(e) => setEndDateDraft(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleApplyFilters}
              disabled={loading}
            >
              <Filter className="h-4 w-4" />
              Aplicar Filtros
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={handleClearFilters}
              disabled={loading}
            >
              Limpar
            </Button>
            {(startDate || endDate) && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {startDate || '...'} → {endDate || '...'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={`${c.bg} border-0 rounded-2xl shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                  <span className="text-[10px] text-muted-foreground">
                    {c.label}
                  </span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatBRL(c.value)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              Movimentação Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {monthlyChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados no período selecionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4 text-amber-600" />
              Por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(data?.byCategory || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sem categorias para exibir
                </p>
              ) : (
                (data?.byCategory || []).map((c) => (
                  <div
                    key={c.category}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate capitalize">
                        {c.category}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.count} transaç{c.count === 1 ? 'ão' : 'ões'}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {formatBRL(c.total)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions table */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Transações
            <Badge variant="secondary" className="ml-1">
              {data?.transactions?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedTx.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-10 text-muted-foreground"
                        >
                          Nenhuma transação encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedTx.map((t) => {
                        const dt = new Date(t.createdAt)
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {dt.toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-xs">
                              {typeLabel(t.type)}
                            </TableCell>
                            <TableCell className="text-xs capitalize">
                              {t.category}
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">
                              {t.description || '—'}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono text-xs font-semibold ${
                                Number(t.amount) >= 0
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {formatBRL(Number(t.amount) || 0)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={statusBadgeClass(t.status)}>
                                {statusLabel(t.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination controls */}
              <div className="flex items-center justify-between gap-2 p-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
