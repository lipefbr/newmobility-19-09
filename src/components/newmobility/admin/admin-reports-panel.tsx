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
  Users,
  Car,
  Store,
  Bike,
  UserCheck,
  Download,
  FileSpreadsheet,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
  Activity,
  Filter,
  Network,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { useStore } from '@/lib/store'
import { formatBRL } from '@/lib/format'
import { categoryLabel } from '@/lib/utils'
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

interface ByUserType {
  userType: string
  total: number
  count: number
}

interface ByCategory {
  category: string
  total: number
  count: number
}

interface ByMatrix {
  matrix: string
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
  userId: string
  userName: string
  userEmail: string
  userType: string
  type: string
  category: string
  description: string
  amount: number
  status: string
  createdAt: string
}

interface AdminReportResponse {
  summary: SummaryPayload
  byUserType: ByUserType[]
  byCategory: ByCategory[]
  byMatrix: ByMatrix[]
  byMonth: ByMonth[]
  transactions: TxRow[]
  filters: {
    userType: string | null
    category: string | null
    matrix: string | null
    startDate: string | null
    endDate: string | null
  }
}

const USER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'motorista', label: 'Motoristas' },
  { value: 'passageiro', label: 'Passageiros' },
  { value: 'passageiro_60', label: 'Passageiros 60+' },
  { value: 'passageiro_pcd', label: 'Passageiros PCD' },
  { value: 'comercio', label: 'Comércios' },
  { value: 'entregador', label: 'Entregadores' },
]

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

const MATRIX_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas as matrizes' },
  { value: 'entrada', label: 'Entrada (4x5)' },
  { value: 'residual', label: 'Residual (4x7)' },
  { value: 'vendas', label: 'Vendas (4x9)' },
]

const typeLabel = (t: string): string => {
  // Task 2-c / Item 21 + Admin Item 1 — translate every English type key the
  // backend may store on Transaction.type into a Portuguese label so the
  // admin reports panel never shows raw English to the user. Falls back to
  // categoryLabel() (which has the same Portuguese mapping for category keys)
  // and finally to the raw value when no mapping exists.
  const map: Record<string, string> = {
    credit: 'Entrada',
    debit: 'Saída',
    deposit: 'Depósito',
    withdrawal: 'Saque',
    cashback: 'CashBack',
    cashback_entry: 'CashBack Entrada',
    cashback_entrada: 'CashBack Entrada',
    cashback_residual: 'CashBack Residual',
    cashback_sales: 'CashBack Vendas',
    cashback_vendas: 'CashBack Vendas',
    gratification: 'Gratificação',
    payment: 'Pagamento',
    payment_invoice: 'Pagamento Fatura',
    plan_payment: 'Pagamento de Plano',
    plan_upgrade: 'Upgrade de Plano',
    subscription: 'Assinatura',
    transfer: 'Transferência',
    transfer_in: 'Transferência Recebida',
    transfer_out: 'Transferência Envio',
    reward: 'Recompensa',
    challenge_reward: 'Recompensa Desafio',
    bonus: 'Bônus',
    voucher: 'Voucher',
    referral: 'Indicação',
    commission: 'Comissão',
    purchase: 'Compra',
    sale: 'Venda',
    marketplace: 'Marketplace',
    marketplace_purchase: 'Marketplace',
    bills: 'Contas',
    fee: 'Taxa',
    withdrawal_fee: 'Taxa de Saque',
    career_claim: 'Reivindicação de Carreira',
    adjustment: 'Ajuste',
  }
  return map[t] || categoryLabel(t)
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

const userTypeLabel = (ut: string): string => {
  const o = USER_TYPE_OPTIONS.find((x) => x.value === ut)
  return o ? o.label : ut
}

const userTypeIcon = (ut: string) => {
  switch (ut) {
    case 'motorista':
      return Car
    case 'comercio':
      return Store
    case 'entregador':
      return Bike
    case 'passageiro_60':
    case 'passageiro_pcd':
      return UserCheck
    default:
      return Users
  }
}

const matrixLabel = (m: string): string => {
  const o = MATRIX_OPTIONS.find((x) => x.value === m)
  return o ? o.label : m
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
export function AdminReportsPanel() {
  const user = useStore((s) => s.user)

  // Draft filter values (before "Aplicar Filtros")
  const [userTypeDraft, setUserTypeDraft] = useState('all')
  const [categoryDraft, setCategoryDraft] = useState('all')
  const [matrixDraft, setMatrixDraft] = useState('all')
  const [startDateDraft, setStartDateDraft] = useState('')
  const [endDateDraft, setEndDateDraft] = useState('')

  // Applied filters
  const [userType, setUserType] = useState('all')
  const [category, setCategory] = useState('all')
  const [matrix, setMatrix] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [data, setData] = useState<AdminReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)

  const buildQuery = useCallback(
    (ut: string, cat: string, mat: string, sd: string, ed: string) => {
      const p = new URLSearchParams({ userId: String(user?.id || '') })
      if (ut && ut !== 'all') p.set('userType', ut)
      if (cat && cat !== 'all') p.set('category', cat)
      if (mat && mat !== 'all') p.set('matrix', mat)
      if (sd) p.set('startDate', sd)
      if (ed) p.set('endDate', ed)
      return p.toString()
    },
    [user?.id]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<AdminReportResponse>(
        `/admin/reports?${buildQuery(userType, category, matrix, startDate, endDate)}`,
        { timeoutMs: 30_000 }
      )
      setData(res)
      setPage(1)
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load reports'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [buildQuery, userType, category, matrix, startDate, endDate])

  useEffect(() => {
    void fetchData()
  }, [userType, category, matrix, startDate, endDate])

  const handleApplyFilters = () => {
    setUserType(userTypeDraft)
    setCategory(categoryDraft)
    setMatrix(matrixDraft)
    setStartDate(startDateDraft)
    setEndDate(endDateDraft)
  }

  const handleClearFilters = () => {
    setUserTypeDraft('all')
    setCategoryDraft('all')
    setMatrixDraft('all')
    setStartDateDraft('')
    setEndDateDraft('')
    setUserType('all')
    setCategory('all')
    setMatrix('all')
    setStartDate('')
    setEndDate('')
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const qs = buildQuery(userType, category, matrix, startDate, endDate)
      const res = await fetch(`/api/admin/reports/export?${qs}`, {
        method: 'GET',
      })
      if (!res.ok) throw new Error('Falha no export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/i)
      a.download =
        match?.[1] ||
        `relatorio-admin-newmobility-${new Date().toISOString().slice(0, 10)}.csv`
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

  // Pagination
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

  // ---------------- Loading state ----------------
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
            </div>
            <Skeleton className="h-9 w-36" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl shadow-sm">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-7 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------------- Error state ----------------
  if (error && !data) {
    return (
      <Card className="rounded-2xl shadow-sm border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Erro ao carregar relatórios
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
              {error || 'Tente novamente em instantes'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
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
      label: 'CashBack Recebido',
      value: data?.summary.cashbackRecebido || 0,
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header with export button */}
      <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <FileSpreadsheet className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Relatórios Admin — Visão Plataforma
              </h3>
              <p className="text-xs text-muted-foreground">
                Métricas consolidadas de transações com filtros por tipo de
                usuário, categoria e matriz. Exporte em CSV.
              </p>
            </div>
          </div>
          <Button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0 rounded-xl"
          >
            {exporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4 text-emerald-600" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Usuário</Label>
              <Select value={userTypeDraft} onValueChange={setUserTypeDraft}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label className="text-xs">Matriz</Label>
              <Select value={matrixDraft} onValueChange={setMatrixDraft}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATRIX_OPTIONS.map((o) => (
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
          <div className="flex items-center gap-2 mt-3 flex-wrap">
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
              className="rounded-xl"
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
            {(userType !== 'all' || category !== 'all' || matrix !== 'all') && (
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                {[userType, category, matrix]
                  .filter((x) => x && x !== 'all')
                  .join(' · ')}
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

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly bar chart */}
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

        {/* Breakdown by category */}
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
                      <p className="text-sm font-medium text-foreground truncate">
                        {categoryLabel(c.category)}
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

        {/* Breakdown by matrix */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Network className="h-4 w-4 text-blue-600" />
              Por Matriz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data?.byMatrix || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sem matrizes para exibir
                </p>
              ) : (
                (data?.byMatrix || []).map((m) => (
                  <div
                    key={m.matrix}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {matrixLabel(m.matrix)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.count} transaç{m.count === 1 ? 'ão' : 'ões'}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {formatBRL(m.total)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Breakdown by user type */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Por Tipo de Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(data?.byUserType || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sem dados por tipo de usuário
                </p>
              ) : (
                (data?.byUserType || []).map((u) => {
                  const Icon = userTypeIcon(u.userType)
                  return (
                    <div
                      key={u.userType}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {userTypeLabel(u.userType)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {u.count} transaç{u.count === 1 ? 'ão' : 'ões'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {formatBRL(u.total)}
                      </p>
                    </div>
                  )
                })
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
                      <TableHead>Usuário</TableHead>
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
                          colSpan={7}
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
                              <div className="font-medium text-foreground truncate max-w-[160px]">
                                {t.userName || t.userId}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {userTypeLabel(t.userType)}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {typeLabel(t.type)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {categoryLabel(t.category)}
                            </TableCell>
                            <TableCell className="text-xs max-w-[180px] truncate">
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
              {/* Pagination */}
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
