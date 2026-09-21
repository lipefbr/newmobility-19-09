'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency, formatDate, getStatusLabel, getStatusVariant, cn } from '@/lib/utils'
import { financialApi, transferApi, apiFetch, invoicesApi, referralsApi } from '@/lib/api'
import { FinancialSkeleton } from '../ui/loading-skeletons'
import { EmptyState } from '../ui/empty-states'
import { InvoiceViewer } from './invoice-viewer'
import { WithdrawalCard } from './withdrawal-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  DollarSign,
  Car,
  ShoppingBag,
  UtensilsCrossed,
  Pill,
  Gift,
  Star,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  FileDown,
  Calendar,
  Send,
  Clock,
  Smartphone,
  Sparkles,
  Check,
  ArrowRightLeft,
  CircleDot,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Ban,
  Info,
  Users,
  Network,
  Receipt,
  Coins,
  HandCoins,
  Building2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// Monthly chart data is computed from real transactions (group by month).
// Fallback to an empty 6-month window when no transactions exist.
function buildMonthlyData(transactions: any[]) {
  const now = new Date()
  const months: { key: string; label: string; ganhos: number; saques: number }[] = []
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    months.push({ key, label: monthLabels[d.getMonth()], ganhos: 0, saques: 0 })
  }
  const indexByKey = new Map(months.map((m, i) => [m.key, i]))
  for (const tx of transactions) {
    const d = new Date(tx.createdAt || tx.date)
    if (isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    const idx = indexByKey.get(key)
    if (idx === undefined) continue
    const amt = Math.abs(Number(tx.amount) || 0)
    if (tx.type === 'withdrawal') {
      months[idx].saques += amt
    } else if (tx.amount > 0) {
      months[idx].ganhos += amt
    }
  }
  return months.map(({ label, ganhos, saques }) => ({ month: label, ganhos, saques }))
}

const typeLabels: Record<string, string> = {
  cashback_entry: 'CashBack Entrada',
  cashback_entrada: 'CashBack Entrada',
  cashback_residual: 'CashBack Residual',
  cashback_sales: 'CashBack Vendas',
  cashback_vendas: 'CashBack Vendas',
  cashback: 'CashBack',
  withdrawal: 'Saque',
  deposit: 'Depósito',
  gratification: 'Gratificação',
  bonus: 'Bônus',
  reward: 'Recompensa',
  referral: 'Indicação',
  voucher: 'Voucher',
  transfer_out: 'Transferência Envio',
  transfer_in: 'Transferência Recebida',
  transfer: 'Transferência',
  payment: 'Pagamento',
  payment_invoice: 'Pagamento Fatura',
  plan_payment: 'Pagamento de Plano',
  plan_upgrade: 'Upgrade de Plano',
  subscription: 'Assinatura',
  marketplace_purchase: 'Marketplace',
  marketplace: 'Marketplace',
  purchase: 'Compra',
  sale: 'Venda',
  commission: 'Comissão',
  career_claim: 'Reivindicação de Carreira',
  fee: 'Taxa',
  withdrawal_fee: 'Taxa de Saque',
  adjustment: 'Ajuste',
}

// Translate raw API category values into Portuguese labels (Task 11-G + Task 2-c).
// The Transaction.category field on the backend stores raw English keys like
// `bills`, `plan_upgrade`, `cashback`, `withdrawal_fee`, `meal`, `mobility`,
// `paymentInvoice`, `free`, `marketplace_purchase`, `plan_payment`, `voucher`,
// `bonus`, `cashback_entry/residual/sales`, etc. This map keeps the financial
// page fully in Portuguese — unknown keys fall back to the raw value.
const categoryLabels: Record<string, string> = {
  bills: 'Contas',
  plan_upgrade: 'Upgrade de Plano',
  plan_payment: 'Pagamento de Plano',
  cashback: 'CashBack',
  cashback_entry: 'CashBack Entrada',
  cashback_entrada: 'CashBack Entrada',
  cashback_residual: 'CashBack Residual',
  cashback_sales: 'CashBack Vendas',
  cashback_vendas: 'CashBack Vendas',
  withdrawal_fee: 'Taxa de Saque',
  meal: 'Refeição',
  food: 'Refeição',
  mobility: 'Mobilidade',
  pharmacy: 'Farmácia',
  shopping: 'Compras',
  gratification: 'Gratificação',
  withdrawal: 'Saque',
  paymentInvoice: 'Pagamento Fatura',
  payment_invoice: 'Pagamento Fatura',
  free: 'Saldo Livre',
  deposit: 'Depósito',
  transfer: 'Transferência',
  transfer_in: 'Transferência Recebida',
  transfer_out: 'Transferência Envio',
  payment: 'Pagamento',
  voucher: 'Voucher',
  bonus: 'Bônus',
  reward: 'Recompensa',
  referral: 'Indicação',
  purchase: 'Compra',
  sale: 'Venda',
  commission: 'Comissão',
  subscription: 'Assinatura',
  career_claim: 'Reivindicação de Carreira',
  marketplace: 'Marketplace',
  marketplace_purchase: 'Marketplace',
  other: 'Outros',
}

function getCategoryLabel(category?: string | null): string {
  if (!category) return ''
  return categoryLabels[category] || category
}

// Resolve the most appropriate Portuguese label for a transaction row.
// Prefer the category label when available (more specific), else fall back to
// the type label, and finally the raw type string.
function getTransactionLabel(tx: any): string {
  if (tx?.category && categoryLabels[tx.category]) return categoryLabels[tx.category]
  if (tx?.type && typeLabels[tx.type]) return typeLabels[tx.type]
  return tx?.type || tx?.category || ''
}

// Build monthly gratification chart data (last 6 months).
// A transaction counts toward gratification when its type OR category is `gratification`.
function buildGratificationData(transactions: any[]) {
  const now = new Date()
  const months: { key: string; label: string; gratificacao: number }[] = []
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    months.push({ key, label: monthLabels[d.getMonth()], gratificacao: 0 })
  }
  const indexByKey = new Map(months.map((m, i) => [m.key, i]))
  for (const tx of transactions) {
    if (tx.type !== 'gratification' && tx.category !== 'gratification') continue
    const d = new Date(tx.createdAt || tx.date)
    if (isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    const idx = indexByKey.get(key)
    if (idx === undefined) continue
    const amt = Number(tx.amount) || 0
    if (amt > 0) months[idx].gratificacao += amt
  }
  return months.map(({ label, gratificacao }) => ({ month: label, gratificacao }))
}

// Color-coded transaction type icon config (Lucide icons with colors)
const typeIconConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  cashback_entry: { icon: ArrowDownLeft, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  cashback_residual: { icon: ArrowDownLeft, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  cashback_sales: { icon: RotateCcw, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  cashback: { icon: HandCoins, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  withdrawal: { icon: ArrowUpRight, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  deposit: { icon: ArrowDownLeft, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  gratification: { icon: ArrowDownLeft, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  bonus: { icon: ArrowDownLeft, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  voucher: { icon: RotateCcw, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  transfer_out: { icon: ArrowRightLeft, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  transfer_in: { icon: ArrowRightLeft, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  transfer: { icon: ArrowRightLeft, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  fee: { icon: Ban, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
  plan_upgrade: { icon: Star, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
}

// Enhanced status icon config with background colors
const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  paid: { icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Concluído' },
  approved: { icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Aprovado' },
  pending: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', label: 'Pendente' },
  failed: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Falhou' },
  rejected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Rejeitado' },
}

// Color-coded transaction type badge config
const typeBadgeConfig: Record<string, { bg: string; text: string; border: string }> = {
  cashback_entry: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  cashback_residual: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  cashback_sales: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  cashback: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  withdrawal: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  deposit: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  gratification: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  bonus: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
  voucher: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
  transfer_out: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  transfer_in: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  transfer: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
  fee: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
  plan_upgrade: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
}

// Transaction type filter chips with icons
const filterChips = [
  { key: 'all', label: 'Todos', icon: Filter },
  { key: 'cashback_entry', label: 'CB Entrada', icon: DollarSign },
  { key: 'cashback_residual', label: 'CB Residual', icon: TrendingUp },
  { key: 'cashback_sales', label: 'CB Vendas', icon: ShoppingBag },
  { key: 'withdrawal', label: 'Saques', icon: ArrowDownToLine },
  { key: 'gratification', label: 'Gratificações', icon: Gift },
  { key: 'bonus', label: 'Bônus', icon: Star },
  { key: 'transfer', label: 'Transferências', icon: ArrowRightLeft },
]

// Animated counter
function AnimatedBalance({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const hasAnimated = useRef(false)
  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    const duration = 1500
    const steps = 50
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <span className={className}>{formatCurrency(display)}</span>
}


const withdrawalStatusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  requested: { label: 'Solicitado', icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  pending: { label: 'Solicitado', icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  processing: { label: 'Processando', icon: Loader2, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Processando', icon: Loader2, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  paid: { label: 'Concluído', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { label: 'Rejeitado', icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  failed: { label: 'Falhou', icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export function FinancialPage() {
  const { user, updateUser } = useStore()
  // Task 18-C: Block withdraw / transfer while an admin is impersonating
  // this user — these are sensitive actions that must never be performed on
  // behalf of another user.
  const isImpersonating = useStore((s) => s.isImpersonating)
  const { t } = useTranslation()
  const [filterType, setFilterType] = useState<string>('all')
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number }>({ page: 1, totalPages: 0, total: 0 })
  const [currentPage, setCurrentPage] = useState(1)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false)
  const [withdrawalLimits, setWithdrawalLimits] = useState<{ minWithdrawal: number; maxWithdrawal: number; withdrawalFee: number }>({ minWithdrawal: 5000, maxWithdrawal: 500000, withdrawalFee: 2 })
  const [allTransactionsForChart, setAllTransactionsForChart] = useState<any[]>([])
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [financialTab, setFinancialTab] = useState('transactions')
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferSource, setTransferSource] = useState('mobility')
  const [transferDestination, setTransferDestination] = useState('bills')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null)

  // PIX registration dialog state
  const [pixDialogOpen, setPixDialogOpen] = useState(false)
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'phone' | 'email' | 'random'>('cpf')
  const [pixKeyValue, setPixKeyValue] = useState('')
  const [pixSaving, setPixSaving] = useState(false)

  // Invoices + referral stats (Task 11-G): real per-user data from the API
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [referralStats, setReferralStats] = useState<{ totalDirect: number; totalNetwork: number; activeDirect: number } | null>(null)
  const [referralStatsLoading, setReferralStatsLoading] = useState(false)

  const PAGE_LIMIT = 20

  const refreshBalances = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await financialApi.getBalances(user.id)
      const b = data.balances || data
      updateUser({
        balanceWithdrawal: Number(b.withdrawal ?? 0),
        balanceMobility: Number(b.mobility ?? 0),
        balanceShopping: Number(b.shopping ?? 0),
        balanceFood: Number(b.food ?? 0),
        balancePharmacy: Number(b.pharmacy ?? 0),
        balanceGratification: Number(b.gratification ?? 0),
        // Client spec §18 — 7th wallet: Saldo Pagamento Fatura
        balancePaymentInvoice: Number(b.paymentInvoice ?? 0),
        balancePending: Number(b.bills ?? b.pending ?? 0),
      })
    } catch (err) {
      // silent - balance refresh is best-effort
      console.error('Failed to refresh balances', err)
    }
  }, [user?.id, updateUser])

  const refreshTransactions = useCallback(async (page: number, type: string) => {
    if (!user?.id) return
    setTransactionsLoading(true)
    try {
      const data = await financialApi.getTransactions(user.id, page, PAGE_LIMIT, type)
      setTransactions(data.transactions || [])
      setPagination({
        page: data.pagination?.page ?? page,
        totalPages: data.pagination?.totalPages ?? 0,
        total: data.pagination?.total ?? 0,
      })
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar transações')
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }, [user?.id])

  const refreshWithdrawals = useCallback(async () => {
    if (!user?.id) return
    setWithdrawalsLoading(true)
    try {
      const data = await financialApi.getWithdrawals(user.id)
      setWithdrawals(data.withdrawals || [])
      if (data.limits) {
        setWithdrawalLimits({
          minWithdrawal: Number(data.limits.minWithdrawal ?? 5000),
          maxWithdrawal: Number(data.limits.maxWithdrawal ?? 500000),
          withdrawalFee: Number(data.limits.withdrawalFee ?? 2),
        })
      }
    } catch (err: any) {
      // silent - withdrawals list is best-effort
      console.error('Failed to refresh withdrawals', err)
      setWithdrawals([])
    } finally {
      setWithdrawalsLoading(false)
    }
  }, [user?.id])

  // Fetch all transactions (up to 200) for the monthly chart and CSV export.
  const refreshAllTransactionsForChart = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await financialApi.getTransactions(user.id, 1, 200, 'all')
      setAllTransactionsForChart(data.transactions || [])
    } catch {
      setAllTransactionsForChart([])
    }
  }, [user?.id])

  // Fetch real invoices for the logged-in user (Task 11-G).
  // Used by the "Saldo para Faturas" section and the InvoiceViewer tab.
  const refreshInvoices = useCallback(async () => {
    if (!user?.id) return
    setInvoicesLoading(true)
    try {
      const data = await invoicesApi.getList(user.id)
      setInvoices(data.invoices || [])
    } catch (err) {
      console.error('Failed to refresh invoices', err)
      setInvoices([])
    } finally {
      setInvoicesLoading(false)
    }
  }, [user?.id])

  // Fetch referral stats (direct + total network) for the earnings summary (Task 11-G).
  const refreshReferralStats = useCallback(async () => {
    if (!user?.id) return
    setReferralStatsLoading(true)
    try {
      const data = await referralsApi.getList(user.id)
      setReferralStats({
        totalDirect: data.stats?.totalDirect ?? 0,
        totalNetwork: data.stats?.totalNetwork ?? 0,
        activeDirect: data.stats?.activeDirect ?? 0,
      })
    } catch (err) {
      console.error('Failed to refresh referral stats', err)
      setReferralStats(null)
    } finally {
      setReferralStatsLoading(false)
    }
  }, [user?.id])

  // Initial mount: fetch balances, transactions (page 1), withdrawals, chart data
  useEffect(() => {
    if (!user?.id) {
      setInitialLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setInitialLoading(true)
      await Promise.all([
        refreshBalances(),
        refreshTransactions(1, 'all'),
        refreshWithdrawals(),
        refreshAllTransactionsForChart(),
        refreshInvoices(),
        refreshReferralStats(),
      ])
      if (!cancelled) setInitialLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.id])

  // Refetch transactions when filter or page changes
  useEffect(() => {
    if (initialLoading || !user?.id) return
    refreshTransactions(currentPage, filterType)
  }, [currentPage, filterType, initialLoading, user?.id, refreshTransactions])

  const handleFilterChange = (type: string) => {
    setFilterType(type)
    setCurrentPage(1)
  }

  const goToPrevPage = () => setCurrentPage((p) => Math.max(1, p - 1))
  const goToNextPage = () => setCurrentPage((p) => Math.max(1, Math.min(pagination.totalPages || 1, p + 1)))

  const refreshAllAfterAction = useCallback(async () => {
    await Promise.all([
      refreshBalances(),
      refreshTransactions(currentPage, filterType),
      refreshWithdrawals(),
      refreshAllTransactionsForChart(),
      refreshInvoices(),
      refreshReferralStats(),
    ])
  }, [refreshBalances, refreshTransactions, refreshWithdrawals, refreshAllTransactionsForChart, refreshInvoices, refreshReferralStats, currentPage, filterType])

  // Keep the transfer destination valid whenever the source changes: it must never equal
  // the source and must never be `withdrawal` (Saldo para Saque), which is only ever a
  // source wallet. Must run before any early return so hook order stays stable.
  useEffect(() => {
    setTransferDestination((prev) => {
      if (prev === transferSource || prev === 'withdrawal') {
        // Pick the first wallet that isn't the source and isn't `withdrawal`.
        const fallbackOrder = ['bills', 'mobility', 'shopping', 'food', 'pharmacy', 'gratification', 'paymentInvoice']
        return fallbackOrder.find((k) => k !== transferSource) || 'bills'
      }
      return prev
    })
  }, [transferSource])

  if (initialLoading) {
    return <FinancialSkeleton />
  }

  // Use API transactions (already filtered by type on the server)
  const filtered = transactions

  // Compute this-month earnings and total withdrawn from real transactions
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  let totalEarnedThisMonth = 0
  let totalWithdrawn = 0
  for (const tx of allTransactionsForChart) {
    const d = new Date(tx.createdAt || tx.date)
    if (isNaN(d.getTime())) continue
    const amt = Number(tx.amount) || 0
    if (tx.type === 'withdrawal') {
      totalWithdrawn += Math.abs(amt)
    } else if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && amt > 0) {
      totalEarnedThisMonth += amt
    }
  }
  const availableBalance = user?.balanceWithdrawal || 0

  // Tarefa 3 (21/09): Saldo anterior = saldo atual + total sacado
  // (mostra quanto o usuário tinha antes de fazer os saques)
  const previousBalance = availableBalance + totalWithdrawn

  // ===== Earnings breakdowns (Task 11-G) — all from the logged-in user's transactions =====
  // Total CashBack earned across all cashback-* types/categories
  const totalCashbackEarned = allTransactionsForChart
    .filter((tx) => (tx.type && tx.type.startsWith('cashback')) || tx.category === 'cashback')
    .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount) || 0), 0)

  // Total Gratification earned (type or category == 'gratification')
  const totalGratificationEarned = allTransactionsForChart
    .filter((tx) => tx.type === 'gratification' || tx.category === 'gratification')
    .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount) || 0), 0)

  // Total referral earnings: residual + entry cashback plus any transaction whose
  // description references referrals/indicações/residual.
  const totalReferralEarnings = allTransactionsForChart
    .filter((tx) => {
      if (tx.type === 'cashback_residual') return true
      const desc = String(tx.description || '').toLowerCase()
      return /indica|residual|referral|rede|binary|binário/.test(desc)
    })
    .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount) || 0), 0)

  // Gratification chart data (monthly, last 6 months)
  const gratificationData = buildGratificationData(allTransactionsForChart)

  // Latest 5 gratification transactions (most recent first)
  const latestGratificationTransactions = allTransactionsForChart
    .filter((tx) => tx.type === 'gratification' || tx.category === 'gratification')
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5)

  // Pending invoices for the "Saldo para Faturas" section
  const pendingInvoices = invoices.filter(
    (inv) => inv.status === 'pending' || inv.status === 'overdue'
  )
  const totalPendingInvoices = pendingInvoices.reduce(
    (sum, inv) => sum + Math.abs(Number(inv.amount) || 0),
    0
  )

  // ===== Task 13-E: Indicator breakdowns for the new "Indicadores de Ganhos" section =====
  // All values are derived from the logged-in user's transactions only (per-user data).
  // 1. Lucro Total: sum of ALL positive transactions for the user
  const lucroTotal = allTransactionsForChart
    .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount) || 0), 0)

  // 3. Ganhos Entrada: cashback_entry transactions only
  const ganhosEntrada = allTransactionsForChart
    .filter((tx) => tx.type === 'cashback_entry' || tx.category === 'cashback_entry')
    .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount) || 0), 0)

  // 4. Ganhos Residual: cashback_residual transactions only
  const ganhosResidual = allTransactionsForChart
    .filter((tx) => tx.type === 'cashback_residual' || tx.category === 'cashback_residual')
    .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount) || 0), 0)

  // 5. Ganhos Vendas: cashback_sales transactions only
  const ganhosVendas = allTransactionsForChart
    .filter((tx) => tx.type === 'cashback_sales' || tx.category === 'cashback_sales')
    .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount) || 0), 0)

  // 8. Saldo reservado para Faturas: balancePending + balancePaymentInvoice
  const saldoReservadoFaturas = (user?.balancePending || 0) + (user?.balancePaymentInvoice || 0)

  // ===== Task 13-E: Chart data for the 4 new charts (Saldo Gratificação, Saldo Faturas, Saldo Disponível, Saldo Sacável) =====

  // 2. Saldo Faturas PieChart: pending vs paid invoices (count + amount)
  const invoicePieData = (() => {
    const pendingList = invoices.filter(
      (inv) => inv.status === 'pending' || inv.status === 'overdue'
    )
    const paidList = invoices.filter(
      (inv) => inv.status === 'paid' || inv.status === 'completed'
    )
    const pendingAmt = pendingList.reduce((s, inv) => s + Math.abs(Number(inv.amount) || 0), 0)
    const paidAmt = paidList.reduce((s, inv) => s + Math.abs(Number(inv.amount) || 0), 0)
    return [
      { name: 'Pendentes', value: pendingAmt, count: pendingList.length, color: '#f43f5e' },
      { name: 'Pagas', value: paidAmt, count: paidList.length, color: '#059669' },
    ].filter((d) => d.count > 0)
  })()

  // 3. Saldo Disponível LineChart: approximate balanceWithdrawal over the last 6 months.
  // For each month M, balance_at_end_of_M ≈ currentBalance - sum(all tx with createdAt > M.end).
  // This is an approximation (ignores manual balance adjustments) but gives a useful trend.
  const saldoDisponivelData = (() => {
    const now = new Date()
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const months: { label: string; end: Date }[] = []
    for (let i = 5; i >= 0; i--) {
      // Last day of (current month - i)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      months.push({ label: monthLabels[end.getMonth()], end })
    }
    const currentBalance = user?.balanceWithdrawal || 0
    return months.map((m) => {
      const futureDelta = allTransactionsForChart
        .filter((tx) => {
          const d = new Date(tx.createdAt || tx.date)
          if (isNaN(d.getTime())) return false
          return d > m.end
        })
        .reduce((s, tx) => s + (Number(tx.amount) || 0), 0)
      return { month: m.label, saldo: Math.max(0, currentBalance - futureDelta) }
    })
  })()

  const balances = [
    { label: t('financial.balance.withdrawal'), value: user?.balanceWithdrawal || 0, icon: Wallet, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', gradient: 'from-emerald-500 to-emerald-600', change: 5 },
    { label: t('financial.balance.mobility'), value: user?.balanceMobility || 0, icon: Car, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', gradient: 'from-blue-500 to-blue-600', change: -2 },
    { label: t('financial.balance.shopping'), value: user?.balanceShopping || 0, icon: ShoppingBag, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', gradient: 'from-purple-500 to-purple-600', change: 8 },
    { label: t('financial.balance.food'), value: user?.balanceFood || 0, icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', gradient: 'from-orange-500 to-orange-600', change: 3 },
    { label: t('financial.balance.pharmacy'), value: user?.balancePharmacy || 0, icon: Pill, color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400', gradient: 'from-rose-500 to-rose-600', change: 6 },
    { label: t('financial.balance.gratification'), value: user?.balanceGratification || 0, icon: Gift, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', gradient: 'from-amber-500 to-amber-600', change: 12 },
    // Client spec §18 — 7th wallet: Saldo Pagamento Fatura (balancePaymentInvoice)
    { label: t('financial.balance.paymentInvoice'), value: user?.balancePaymentInvoice || 0, icon: FileText, color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400', gradient: 'from-cyan-500 to-cyan-600', change: 4 },
  ]

  // Balance breakdown pie chart data
  const totalBalance = balances.reduce((acc, b) => acc + b.value, 0)
  const pieData = balances.map((b) => ({
    name: b.label,
    value: b.value,
    color: b.gradient.includes('emerald') ? '#059669' : b.gradient.includes('blue') ? '#3b82f6' : b.gradient.includes('purple') ? '#8b5cf6' : b.gradient.includes('orange') ? '#f97316' : b.gradient.includes('rose') ? '#f43f5e' : '#f59e0b',
  }))

  // Monthly chart data computed from real transactions (no mock)
  const monthlyData = buildMonthlyData(allTransactionsForChart)

  // Pending transactions (only withdrawals show up as pending in the API)
  const pendingTransactions = allTransactionsForChart.filter((tx) => tx.status === 'pending')

  const handleExportCSV = () => {
    const headers = 'Data,Descrição,Tipo,Valor,Status\n'
    const rows = (filtered.length > 0 ? filtered : allTransactionsForChart).map(tx =>
      `${tx.createdAt || tx.date},"${tx.description}",${getTransactionLabel(tx) || tx.type},${tx.amount / 100},${getStatusLabel(tx.status)}`
    ).join('\n')
    const csv = headers + rows
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'extrato_newmobility.csv'
    link.click()
  }

  // 5% fee for non-Saque source transfers, 0% for Saque source.
  // `bills` (Saldo para Faturas) and `paymentInvoice` (Saldo Pagamento Fatura, client spec §18)
  // follow the standard 5% conversion fee when receiving from non-Saque sources.
  const TRANSFER_FEES: Record<string, number> = {
    'mobility->withdrawal': 5, 'shopping->withdrawal': 5, 'food->withdrawal': 5,
    'pharmacy->withdrawal': 5, 'gratification->withdrawal': 5,
    'mobility->paymentInvoice': 5, 'shopping->paymentInvoice': 5, 'food->paymentInvoice': 5,
    'pharmacy->paymentInvoice': 5, 'gratification->paymentInvoice': 5, 'bills->paymentInvoice': 5,
    'withdrawal->mobility': 0,
    'withdrawal->shopping': 0, 'withdrawal->food': 0, 'withdrawal->pharmacy': 0,
    'withdrawal->gratification': 0, 'withdrawal->bills': 0, 'withdrawal->paymentInvoice': 0,
  }
  // Labels and balances for every wallet that can appear in the transfer dialog.
  // NOTE (BACK-12.2): `bills` (Saldo para Faturas / balancePending) was removed
  // from the transfer options because it duplicated `paymentInvoice` (Saldo
  // Pagamento de Fatura / balancePaymentInvoice). Only ONE invoice-balance
  // option is exposed now, so users can't accidentally move money out of the
  // invoice-reserved wallet through a duplicate destination. The `balancePending`
  // column remains in the DB but is no longer a transfer source/destination.
  const balanceLabels: Record<string, string> = {
    withdrawal: t('financial.balance.withdrawal'), mobility: t('financial.balance.mobility'),
    shopping: t('financial.balance.shopping'), food: t('financial.balance.food'),
    pharmacy: t('financial.balance.pharmacy'), gratification: t('financial.balance.gratification'),
    paymentInvoice: t('financial.balance.paymentInvoice'),
  }
  const balanceValues: Record<string, number> = {
    withdrawal: user?.balanceWithdrawal || 0, mobility: user?.balanceMobility || 0,
    shopping: user?.balanceShopping || 0, food: user?.balanceFood || 0,
    pharmacy: user?.balancePharmacy || 0, gratification: user?.balanceGratification || 0,
    paymentInvoice: user?.balancePaymentInvoice || 0,
  }
  // `withdrawal` (Saldo para Saque) can only be a transfer SOURCE - never a destination.
  // Users move money OUT of that wallet through the dedicated withdraw flow.
  const destinationBalanceKeys = Object.keys(balanceLabels).filter((k) => k !== 'withdrawal')

  const feeKey = `${transferSource}->${transferDestination}`
  const feePercent = TRANSFER_FEES[feeKey] ?? 5
  const amountNum = Number(transferAmount) || 0
  // Convert reais to cents for display and comparison (balances are in cents)
  const amountCents = Math.round(amountNum * 100)
  const feeAmountCents = Math.round(amountCents * feePercent / 100)
  const netAmountCents = amountCents - feeAmountCents

  const handleTransfer = async () => {
    if (isImpersonating) {
      toast.error('Não é possível realizar esta ação enquanto visualiza como outro usuário.')
      return
    }
    if (!user?.id || !transferAmount || !transferSource || !transferDestination) return
    if (transferSource === transferDestination) { toast.error(t('transfer.sameBalance')); return }
    if (transferDestination === 'withdrawal') {
      toast.error('Não é permitido transferir para o Saldo para Saque. Use o fluxo de saque.')
      return
    }
    if (amountCents > (balanceValues[transferSource] || 0)) { toast.error(t('transfer.insufficientFunds')); return }
    setTransferSubmitting(true)
    try {
      await transferApi.transfer(user.id, transferSource, transferDestination, amountNum)
      toast.success(t('transfer.success'))
      setTransferOpen(false)
      setTransferAmount('')
      // Refresh balances (updates store), transactions, withdrawals, and chart data
      await refreshAllAfterAction()
    } catch (err: any) {
      toast.error(err.message || 'Erro na transferência')
    } finally {
      setTransferSubmitting(false)
    }
  }

  const handleServerExport = () => {
    if (!user?.id) return
    const url = financialApi.getExportUrl(user.id, 'csv', exportStartDate || undefined, exportEndDate || undefined, filterType)
    window.open(url, '_blank')
    setExportDialogOpen(false)
    toast.success('Exportação iniciada!')
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Transfer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('financial.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('financial.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => setExportDialogOpen(true)}>
            <FileDown className="h-3.5 w-3.5" />
            {t('financial.exportCsv')}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {t('transfer.title')}
          </Button>
          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => {
              // PIX check: if user has no PIX key, open PIX registration dialog instead
              if (!user?.pixKey || user.pixKey.trim() === '') {
                setPixDialogOpen(true)
                return
              }
              setWithdrawOpen(true)
            }}>
              <ArrowDownToLine className="h-4 w-4" />
              {t('financial.withdraw')}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                  {t('financial.withdraw')}
                </DialogTitle>
                <DialogDescription className="sr-only">Dialog to request a withdrawal from your account</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <span className="text-xs font-medium text-foreground">Valor</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-emerald-200 dark:bg-emerald-800" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</div>
                    <span className="text-xs font-medium text-muted-foreground">Confirmar</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-muted" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
                    <span className="text-xs font-medium text-muted-foreground">Pronto</span>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center border border-emerald-100 dark:border-emerald-900/50">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">{t('financial.availableForWithdrawal')}</p>
                  <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                    {formatCurrency(user?.balanceWithdrawal || 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">{t('financial.withdrawAmount')} <span className="text-[10px] text-muted-foreground font-normal">(valor em R$)</span></Label>
                  {/* Quick amount presets - derived from real limits */}
                  <div className="flex gap-2 flex-wrap">
                    {[withdrawalLimits.minWithdrawal / 100, Math.round(withdrawalLimits.minWithdrawal / 100 * 2), Math.round(withdrawalLimits.minWithdrawal / 100 * 5), Math.round(withdrawalLimits.maxWithdrawal / 100 * 0.5), withdrawalLimits.maxWithdrawal / 100]
                      .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
                      .slice(0, 5)
                      .map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setWithdrawAmount(String(amount))}
                        className="px-3 py-1 rounded-full text-xs font-medium border border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 transition-colors"
                      >
                        R$ {amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pl-10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo: {formatCurrency(withdrawalLimits.minWithdrawal)} · Máximo: {formatCurrency(withdrawalLimits.maxWithdrawal)}
                  </p>
                </div>
                {/* Fee calculation display */}
                {withdrawAmount && Number(withdrawAmount) > 0 && (() => {
                  const withdrawReais = Number(withdrawAmount)
                  const withdrawCents = Math.round(withdrawReais * 100)
                  const FEE_PERCENT = withdrawalLimits.withdrawalFee
                  const feeCents = Math.round(withdrawCents * FEE_PERCENT / 100)
                  const netCents = withdrawCents - feeCents
                  const currentBalance = user?.balanceWithdrawal || 0
                  const newBalance = currentBalance - withdrawCents
                  const belowMin = withdrawCents < withdrawalLimits.minWithdrawal
                  const aboveMax = withdrawCents > withdrawalLimits.maxWithdrawal
                  const aboveBalance = withdrawCents > currentBalance
                  return (
                    <div className="bg-gradient-to-b from-muted/50 to-muted/30 rounded-lg p-3 space-y-2 border border-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Info className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Resumo do saque</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Valor solicitado</span>
                        <span className="text-foreground font-medium">{formatCurrency(withdrawCents)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Taxa de processamento ({FEE_PERCENT}%)</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">-{formatCurrency(feeCents)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground font-semibold">Você receberá</span>
                        <span className={cn(
                          'font-bold text-base',
                          netCents > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        )}>{formatCurrency(netCents)}</span>
                      </div>
                      {(belowMin || aboveMax || aboveBalance || newBalance < 0) && (
                        <div className="mt-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 space-y-1">
                          {belowMin && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              ⚠️ Valor abaixo do mínimo permitido ({formatCurrency(withdrawalLimits.minWithdrawal)})
                            </p>
                          )}
                          {aboveMax && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              ⚠️ Valor acima do máximo permitido ({formatCurrency(withdrawalLimits.maxWithdrawal)})
                            </p>
                          )}
                          {aboveBalance && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              ⚠️ Saldo insuficiente para este saque
                            </p>
                          )}
                          {!aboveBalance && newBalance < 0 && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              ⚠️ Seu saldo ficará negativo: {formatCurrency(newBalance)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={withdrawSubmitting || !withdrawAmount || Number(withdrawAmount) <= 0}
                  onClick={async () => {
                    if (isImpersonating) {
                      toast.error('Não é possível realizar esta ação enquanto visualiza como outro usuário.')
                      return
                    }
                    if (!user?.id || !withdrawAmount || Number(withdrawAmount) <= 0) return
                    const withdrawReais = Number(withdrawAmount)
                    const withdrawCents = Math.round(withdrawReais * 100)
                    // Validate against real limits from API (limits are in cents)
                    if (withdrawCents < withdrawalLimits.minWithdrawal) {
                      toast.error(`Valor mínimo para saque: ${formatCurrency(withdrawalLimits.minWithdrawal)}`)
                      return
                    }
                    if (withdrawCents > withdrawalLimits.maxWithdrawal) {
                      toast.error(`Valor máximo para saque: ${formatCurrency(withdrawalLimits.maxWithdrawal)}`)
                      return
                    }
                    if (withdrawCents > (user?.balanceWithdrawal || 0)) {
                      toast.error('Saldo insuficiente para saque')
                      return
                    }
                    setWithdrawSubmitting(true)
                    try {
                      // Send amount in BRL (reais) - the backend converts to cents
                      const data = await financialApi.withdraw(user.id, withdrawReais, 'withdrawal')
                      // Update local store balance immediately (backend already deducted)
                      if (data?.newBalance !== undefined) {
                        updateUser({ balanceWithdrawal: data.newBalance })
                      }
                      setWithdrawOpen(false)
                      setWithdrawAmount('')
                      toast.success(`Saque solicitado com sucesso! Status: Pendente. O valor será enviado para sua chave PIX: ${data?.pixKey || user?.pixKey}.`)
                      // Refresh balances (updates store), transactions, withdrawals, and chart data
                      await refreshAllAfterAction()
                    } catch (err: any) {
                      const msg = err?.message || ''
                      if (msg.toLowerCase().includes('pix')) {
                        // PIX-related error: close withdraw dialog and open PIX registration
                        setWithdrawOpen(false)
                        setPixDialogOpen(true)
                        toast.error(msg)
                      } else {
                        toast.error(msg || 'Erro ao solicitar saque')
                      }
                    } finally {
                      setWithdrawSubmitting(false)
                    }
                  }}
                >
                  {withdrawSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    t('financial.confirmWithdrawal')
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Free-withdrawal window banner (client spec §15:
          "ENTRE DIA 5 E 8 DE CADA MÊS ELE SACA SEM TAXA – APÓS TAXA DE 5%") */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 shadow-sm">
          <CardContent className="p-3 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                {t('financial.withdraw.freeWindow')}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Balance Overview Hero with Pie Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="shadow-lg border-0 bg-gradient-to-r from-gray-900 to-gray-800 overflow-hidden relative">
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
          }} />
          <CardContent className="p-5 md:p-6 relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400 font-medium">Saldo Total</p>
                <AnimatedBalance value={totalBalance} className="text-3xl md:text-4xl font-bold text-white" />
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 bg-emerald-500/20 rounded-full px-2.5 py-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">+5.2%</span>
                  </div>
                  <span className="text-xs text-gray-400">vs. mês anterior</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-[100px] w-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} paddingAngle={2} dataKey="value" animationDuration={1000}>
                        {pieData.map((entry, index) => (
                          <Cell key={`pie-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5">
                  {pieData.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-gray-300 truncate max-w-[100px]">{item.name}</span>
                      <span className="text-[10px] font-bold text-white">{((item.value / totalBalance) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-card card-hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{t('financial.quickStats.earnedMonth')}</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalEarnedThisMonth)}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +5%
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 shadow-sm bg-card card-hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{t('financial.quickStats.withdrawn')}</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalWithdrawn)}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <TrendingDown className="h-3.5 w-3.5" />
                  -3%
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500 shadow-sm bg-card card-hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{t('financial.quickStats.available')}</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(availableBalance)}</p>
                </div>
                <div className="p-2 rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ===== Task 13-E: Indicadores de Ganhos (8 indicator cards) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.3 }}
      >
        <Card className="shadow-sm bg-card border-emerald-200/60 dark:border-emerald-900/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Indicadores de Ganhos
              <span className="text-[10px] font-normal text-muted-foreground">(indicadores do usuário logado)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Lucro Total */}
              <div className="rounded-lg border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-muted-foreground font-medium">Lucro Total</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(lucroTotal)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Soma de todos os ganhos</p>
              </div>
              {/* 2. Ganhos por Indicação */}
              <div className="rounded-lg border border-border bg-teal-50/50 dark:bg-teal-950/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Network className="h-4 w-4 text-teal-600" />
                  <p className="text-xs text-muted-foreground font-medium">Ganhos por Indicação</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalReferralEarnings)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Residual + indicações</p>
              </div>
              {/* 3. Ganhos Entrada */}
              <div className="rounded-lg border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-muted-foreground font-medium">Ganhos Entrada</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(ganhosEntrada)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">CashBack Entrada</p>
              </div>
              {/* 4. Ganhos Residual */}
              <div className="rounded-lg border border-border bg-teal-50/50 dark:bg-teal-950/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  <p className="text-xs text-muted-foreground font-medium">Ganhos Residual</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(ganhosResidual)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">CashBack Residual</p>
              </div>
              {/* 5. Ganhos Vendas */}
              <div className="rounded-lg border border-border bg-blue-50/50 dark:bg-blue-950/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-muted-foreground font-medium">Ganhos Vendas</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(ganhosVendas)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">CashBack Vendas</p>
              </div>
              {/* 6. Saldo Disponível */}
              <div className="rounded-lg border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-muted-foreground font-medium">Saldo Disponível</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(user?.balanceWithdrawal || 0)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Saldo líquido disponível</p>
              </div>
              {/* 7. Saldo para Saque */}
              <div className="rounded-lg border border-border bg-amber-50/50 dark:bg-amber-950/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownToLine className="h-4 w-4 text-amber-600" />
                  <p className="text-xs text-muted-foreground font-medium">Saldo para Saque</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(user?.balanceWithdrawal || 0)}</p>
                {/* Tarefa 3 (21/09): mostrar saldo anterior (antes dos saques) */}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Saldo anterior: <span className="font-medium text-foreground/80">{formatCurrency(previousBalance)}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Total sacado: {formatCurrency(totalWithdrawn)}</p>
              </div>
              {/* 8. Saldo reservado para Faturas */}
              <div className="rounded-lg border border-border bg-rose-50/50 dark:bg-rose-950/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Receipt className="h-4 w-4 text-rose-600" />
                  <p className="text-xs text-muted-foreground font-medium">Saldo reservado para Faturas</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(saldoReservadoFaturas)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Contas + Pagamento Fatura</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Task 11-G: Lucros e Indicações (Profit & Referral Earnings Summary) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, duration: 0.3 }}
      >
        <Card className="shadow-sm bg-card border-emerald-200/60 dark:border-emerald-900/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-600" />
              Lucros e Indicações
              <span className="text-[10px] font-normal text-muted-foreground">(ganho do usuário logado)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Total CashBack */}
              <div className="rounded-lg border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <HandCoins className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="text-[11px] text-muted-foreground font-medium">Total CashBack</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalCashbackEarned)}</p>
              </div>
              {/* Total Gratification */}
              <div className="rounded-lg border border-border bg-purple-50/50 dark:bg-purple-950/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Gift className="h-3.5 w-3.5 text-purple-600" />
                  <p className="text-[11px] text-muted-foreground font-medium">Total Gratificação</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalGratificationEarned)}</p>
              </div>
              {/* Total Referral Earnings */}
              <div className="rounded-lg border border-border bg-teal-50/50 dark:bg-teal-950/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Network className="h-3.5 w-3.5 text-teal-600" />
                  <p className="text-[11px] text-muted-foreground font-medium">Ganhos de Indicação</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalReferralEarnings)}</p>
              </div>
              {/* Direct Referrals */}
              <div className="rounded-lg border border-border bg-blue-50/50 dark:bg-blue-950/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  <p className="text-[11px] text-muted-foreground font-medium">Indicações Diretas</p>
                </div>
                {referralStatsLoading ? (
                  <p className="text-lg font-bold text-foreground">—</p>
                ) : (
                  <p className="text-lg font-bold text-foreground">{referralStats?.totalDirect ?? 0}</p>
                )}
              </div>
              {/* Active Direct Referrals */}
              <div className="rounded-lg border border-border bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                  <p className="text-[11px] text-muted-foreground font-medium">Indicações Ativas</p>
                </div>
                {referralStatsLoading ? (
                  <p className="text-lg font-bold text-foreground">—</p>
                ) : (
                  <p className="text-lg font-bold text-foreground">{referralStats?.activeDirect ?? 0}</p>
                )}
              </div>
              {/* Total Network Size */}
              <div className="rounded-lg border border-border bg-indigo-50/50 dark:bg-indigo-950/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Network className="h-3.5 w-3.5 text-indigo-600" />
                  <p className="text-[11px] text-muted-foreground font-medium">Tamanho da Rede</p>
                </div>
                {referralStatsLoading ? (
                  <p className="text-lg font-bold text-foreground">—</p>
                ) : (
                  <p className="text-lg font-bold text-foreground">{referralStats?.totalNetwork ?? 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Transactions Section with pulsing dot */}
      {pendingTransactions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-sm bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <CircleDot className="h-4 w-4 animate-pulse" />
                Transações Pendentes
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px]">{pendingTransactions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-amber-100 dark:border-amber-900/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      {formatCurrency(Math.abs(tx.amount))}
                    </p>
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px]">
                      Processando
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Mini Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Card className="shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              {t('financial.earningsVsWithdrawals')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] md:h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorGanhos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSaques" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    tickFormatter={(value) => `R$${(value / 100000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${(value / 100).toLocaleString('pt-BR')}`, '']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="ganhos" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorGanhos)" name="Ganhos" />
                  <Area type="monotone" dataKey="saques" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorSaques)" name="Saques" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Task 11-G: Saldo de Gratificação (Gratification Balance Chart) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.3 }}
      >
        <Card className="shadow-sm bg-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-amber-500" />
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  Saldo de Gratificação
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Gratificações recebidas pelo usuário logado</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground font-medium">Saldo atual</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {formatCurrency(user?.balanceGratification || 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Total recebido: {formatCurrency(totalGratificationEarned)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gratificationData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorGratificacao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$${(value / 100000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${(value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Gratificação']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="gratificacao" name="Gratificação" fill="url(#colorGratificacao)" radius={[4, 4, 0, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Latest gratification transactions */}
            {latestGratificationTransactions.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Últimas gratificações
                </p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {latestGratificationTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="p-1 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                          <Gift className="h-3 w-3" />
                        </div>
                        <span className="text-foreground truncate">{tx.description || 'Gratificação'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{formatDate(tx.createdAt || tx.date)}</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(Math.abs(Number(tx.amount) || 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Task 13-E: 4 new charts (Saldo Gratificação, Saldo Faturas, Saldo Disponível, Saldo Sacável) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Saldo Gratificação — BarChart (monthly gratification, last 6 months) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13, duration: 0.3 }}
        >
          <Card className="shadow-sm bg-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Gift className="h-4 w-4 text-purple-600" />
                Saldo Gratificação
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">Gratificação mensal — últimos 6 meses</p>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gratificationData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `R$${(value / 100000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`R$ ${(value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Gratificação']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="gratificacao" name="Gratificação" fill="#8b5cf6" radius={[4, 4, 0, 0]} animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Saldo Faturas — PieChart (pending vs paid invoices) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.3 }}
        >
          <Card className="shadow-sm bg-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-cyan-600" />
                Saldo Faturas
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">Faturas pendentes vs pagas do usuário logado</p>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {invoicePieData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground">
                    <Receipt className="h-8 w-8 text-muted-foreground/40 mb-1" />
                    Nenhuma fatura encontrada.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={invoicePieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="value"
                        label={(entry: any) => `${entry.name}: ${entry.count}`}
                        animationDuration={900}
                      >
                        {invoicePieData.map((entry, index) => (
                          <Cell key={`inv-pie-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(_value: number, _name: string, entry: any) => [
                          `${entry.payload.count} fatura(s) — R$ ${(entry.payload.value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                          entry.payload.name,
                        ]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Saldo Disponível — LineChart (balanceWithdrawal trend, last 6 months) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <Card className="shadow-sm bg-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Saldo Disponível
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">Evolução do saldo para saque — últimos 6 meses</p>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={saldoDisponivelData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `R$${(value / 100000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`R$ ${(value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Saldo']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} animationDuration={900} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. Saldo Sacável — Big number card with withdrawal trend */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.3 }}
        >
          <Card className="shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200/60 dark:border-emerald-900/40 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                Saldo Sacável
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">Valor líquido disponível para saque imediato</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 h-[200px] justify-center">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Saldo atual</p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(user?.balanceWithdrawal || 0)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-white/60 dark:bg-emerald-950/40 p-2 border border-emerald-100 dark:border-emerald-900/50">
                    <p className="text-[10px] text-muted-foreground font-medium">Total sacado</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(totalWithdrawn)}</p>
                  </div>
                  <div className="rounded-md bg-white/60 dark:bg-emerald-950/40 p-2 border border-emerald-100 dark:border-emerald-900/50">
                    <p className="text-[10px] text-muted-foreground font-medium">Saques solicitados</p>
                    <p className="text-sm font-bold text-foreground">{withdrawals.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ===== Asaas-tracked Withdrawal Card (Task 12-D) — explicit PIX/TED saques ===== */}
      <WithdrawalCard />

      {/* Balance Cards with gradient top border accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((balance, i) => (
          <motion.div
            key={balance.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="shadow-sm overflow-hidden bg-card card-hover-lift relative">
              {/* Gradient top border accent */}
              <div className={cn('h-1 bg-gradient-to-r', balance.gradient)} />
              <div className="flex">
                <div className={cn('w-1.5 bg-gradient-to-b', balance.gradient)} />
                <div className={cn('absolute inset-0 opacity-[0.03] bg-gradient-to-br pointer-events-none', balance.gradient)} />
                <CardContent className="p-4 flex items-center gap-3 flex-1 relative">
                  <div className={`p-3 rounded-lg ${balance.color}`}>
                    <balance.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium">{balance.label}</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(balance.value)}</p>
                  </div>
                  <div className={cn(
                    'flex items-center gap-0.5 text-xs font-semibold',
                    balance.change >= 0 ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {balance.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {balance.change >= 0 ? '+' : ''}{balance.change}%
                  </div>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ===== Task 11-G: Saldo para Faturas (Invoice / Bill Balance Section) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <Card className="shadow-sm bg-card border-cyan-200/60 dark:border-cyan-900/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-cyan-600" />
              Saldos para Faturas
              <span className="text-[10px] font-normal text-muted-foreground">(faturas listadas do usuário logado)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Saldo para Faturas (balancePending) */}
              <div className="rounded-lg border border-border bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Receipt className="h-3.5 w-3.5 text-amber-600" />
                  <p className="text-[11px] text-muted-foreground font-medium">{t('financial.balance.bills')}</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(user?.balancePending || 0)}</p>
                <p className="text-[10px] text-muted-foreground">Saldo reservado para contas/boletos</p>
              </div>
              {/* Saldo Pagamento Fatura (balancePaymentInvoice) */}
              <div className="rounded-lg border border-border bg-cyan-50/50 dark:bg-cyan-950/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="h-3.5 w-3.5 text-cyan-600" />
                  <p className="text-[11px] text-muted-foreground font-medium">{t('financial.balance.paymentInvoice')}</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(user?.balancePaymentInvoice || 0)}</p>
                <p className="text-[10px] text-muted-foreground">Saldo para pagamento de faturas</p>
              </div>
              {/* Total pending invoices */}
              <div className="rounded-lg border border-border bg-rose-50/50 dark:bg-rose-950/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-rose-600" />
                  <p className="text-[11px] text-muted-foreground font-medium">Faturas Pendentes</p>
                </div>
                {invoicesLoading ? (
                  <p className="text-lg font-bold text-foreground">—</p>
                ) : (
                  <>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(totalPendingInvoices)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {pendingInvoices.length} fatura(s) em aberto
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Pending invoices list */}
            <div className="border-t border-border pt-3">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Faturas em aberto
              </p>
              {invoicesLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 rounded-md bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : pendingInvoices.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                  Nenhuma fatura pendente. Todas as faturas estão em dia.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                  {pendingInvoices.slice(0, 6).map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shrink-0">
                          <Receipt className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {inv.description || inv.type || 'Fatura'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {inv.dueDate ? `Venc.: ${formatDate(inv.dueDate)}` : ''}
                            {inv.createdAt ? ` · Emitida: ${formatDate(inv.createdAt)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-foreground">
                          {formatCurrency(Math.abs(Number(inv.amount) || 0))}
                        </p>
                        <Badge className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400">
                          {getStatusLabel(inv.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-emerald-600" />
              Exportar Relatório
            </DialogTitle>
            <DialogDescription className="sr-only">Dialog to export financial transactions as CSV</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Exporte suas transações em formato CSV com filtros de data e tipo.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data inicial
                </Label>
                <Input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data final
                </Label>
                <Input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo de transação</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="cashback_entry">CB Entrada</SelectItem>
                  <SelectItem value="cashback_residual">CB Residual</SelectItem>
                  <SelectItem value="cashback_sales">CB Vendas</SelectItem>
                  <SelectItem value="withdrawal">Saques</SelectItem>
                  <SelectItem value="gratification">Gratificações</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                💡 Dica: Deixe as datas em branco para exportar todas as transações do período.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4" />
                Exportar local
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={handleServerExport}
              >
                <FileDown className="h-4 w-4" />
                Exportar do servidor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Details — pulled from the user's real registration (Dados Pessoais).
          Previously this was hardcoded "Banco do Brasil / 1234-5 / 67890-1" which
          had no relation to the user's actual bank. Now it reads from
          user.bankCode/bankAgency/bankAccount/bankType/pixKey (set in Dados Pessoais). */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            {t('financial.bankDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.bankCode || user?.bankAgency || user?.bankAccount || user?.pixKey ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Banco</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {user?.bankCode || '—'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo de Conta</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {user?.bankType === 'cc' ? 'Conta Corrente'
                    : user?.bankType === 'cp' ? 'Conta Poupança'
                    : user?.bankType || '—'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Agência</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {user?.bankAgency || '—'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Conta</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {user?.bankAccount || '—'}
                </p>
              </div>
              {user?.pixKey && (
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Chave PIX</Label>
                  <p className="text-sm font-medium text-foreground mt-0.5 font-mono">
                    {user.pixKey}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Você ainda não cadastrou seus dados bancários.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Acesse <strong>Dados Pessoais</strong> para cadastrar banco, agência, conta e chave PIX.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal History & Invoices Tabs */}
      <Tabs value={financialTab} onValueChange={setFinancialTab}>
        <TabsList>
          <TabsTrigger value="transactions" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('financial.transactions')}</span>
            <span className="sm:hidden">Transações</span>
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ArrowDownToLine className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('withdrawals.title')}</span>
            <span className="sm:hidden">Saques</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('invoice.title')}</span>
            <span className="sm:hidden">Faturas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          {/* Transaction Type Filter Chips */}
          <div className="flex gap-2 flex-wrap mb-4">
            {filterChips.map((chip) => {
              const Icon = chip.icon
              const isActive = filterType === chip.key
              return (
                <button
                  key={chip.key}
                  onClick={() => handleFilterChange(chip.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {chip.label}
                </button>
              )
            })}
          </div>

          <Card className="shadow-sm bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground">{t('financial.transactions')}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" onClick={handleExportCSV}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="p-6 space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-8 w-8 rounded-lg bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 rounded bg-muted" />
                        <div className="h-2 w-1/4 rounded bg-muted/70" />
                      </div>
                      <div className="h-4 w-20 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={ArrowRightLeft}
                  title="Nenhuma transação encontrada"
                  description={filterType === 'all' ? 'Você ainda não possui transações. Suas atividades financeiras aparecerão aqui.' : 'Não há transações deste tipo no momento. Tente outro filtro.'}
                  className="py-10"
                />
              ) : (
                <>
                <div className="divide-y divide-border max-h-96 overflow-y-auto custom-scrollbar">
                  {filtered.map((tx, i) => {
                    const isPositive = tx.amount > 0
                    const isPending = tx.status === 'pending'
                    const txIconCfg = typeIconConfig[tx.type]
                    const txStatusCfg = statusConfig[tx.status]
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Color-coded transaction type icon */}
                          {txIconCfg ? (
                            <div className={`p-1.5 rounded-lg ${txIconCfg.bgColor} ${txIconCfg.color}`}>
                              <txIconCfg.icon className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <div className={`p-1.5 rounded-lg ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'}`}>
                              {isPositive ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                            </div>
                          )}
                          {/* Status indicator with background */}
                          {txStatusCfg && (
                            <div className={`p-0.5 rounded-full ${txStatusCfg.bgColor}`}>
                              <txStatusCfg.icon className={`h-3 w-3 ${txStatusCfg.color} ${isPending ? 'animate-pulse' : ''}`} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{tx.description}</span>
                            {/* Color-coded type badge — Task 11-G: prefers Portuguese category label */}
                            {(() => {
                              const badgeCfg = typeBadgeConfig[tx.type]
                              const displayLabel = getTransactionLabel(tx) || tx.type
                              return badgeCfg ? (
                                <Badge className={`text-[10px] shrink-0 hidden sm:inline-flex border ${badgeCfg.bg} ${badgeCfg.text} ${badgeCfg.border}`}>
                                  {displayLabel}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
                                  {displayLabel}
                                </Badge>
                              )
                            })()}
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(tx.createdAt || tx.date)}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1.5 justify-end">
                            <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {isPositive ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                            </p>
                          </div>
                          {/* Status badge with enhanced colors */}
                          {txStatusCfg ? (
                            <Badge className={`text-[10px] border ${txStatusCfg.bgColor} ${txStatusCfg.color}`}>
                              {txStatusCfg.label}
                            </Badge>
                          ) : (
                            <Badge variant={getStatusVariant(tx.status)} className="text-[10px]">
                              {getStatusLabel(tx.status)}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                {/* Pagination */}
                {(pagination.totalPages > 1 || pagination.total > PAGE_LIMIT) && (
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/20">
                    <span className="text-xs text-muted-foreground">
                      Página {pagination.page} de {Math.max(1, pagination.totalPages)} · {pagination.total} transações
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={goToPrevPage}
                        disabled={currentPage <= 1 || transactionsLoading}
                      >
                        <ArrowUpRight className="h-3 w-3 rotate-180" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={goToNextPage}
                        disabled={currentPage >= pagination.totalPages || transactionsLoading}
                      >
                        Próximo
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <Card className="shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                {t('withdrawals.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {withdrawalsLoading ? (
                <div className="p-6 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2 animate-pulse">
                      <div className="flex justify-between">
                        <div className="h-3 w-24 rounded bg-muted" />
                        <div className="h-4 w-32 rounded bg-muted" />
                      </div>
                      <div className="h-2 w-full rounded bg-muted/70" />
                      <div className="h-2 w-2/3 rounded bg-muted/50" />
                    </div>
                  ))}
                </div>
              ) : withdrawals.length === 0 ? (
                <EmptyState
                  icon={ArrowDownToLine}
                  title="Nenhum saque solicitado"
                  description="Você ainda não solicitou nenhum saque. Ao solicitar, o histórico aparecerá aqui com o status de processamento."
                  actionLabel={t('financial.withdraw')}
                  onAction={() => {
                    if (!user?.pixKey || user.pixKey.trim() === '') {
                      setPixDialogOpen(true)
                      return
                    }
                    setWithdrawOpen(true)
                  }}
                  className="py-10"
                />
              ) : (
                <div className="divide-y divide-border">
                  {withdrawals.map((wd, i) => {
                    const config = withdrawalStatusConfig[wd.status] || withdrawalStatusConfig.pending
                    const StatusIcon = config.icon
                    const isPending = wd.status === 'pending' || wd.status === 'approved' || wd.status === 'requested' || wd.status === 'processing'
                    const requestedAt = wd.requestedAt || wd.createdAt
                    const processedAt = wd.processedAt || (wd.status === 'approved' || wd.status === 'paid' ? wd.updatedAt : null)
                    const completedAt = wd.completedAt || (wd.status === 'paid' ? wd.updatedAt : null)
                    const estimatedCompletion = wd.estimatedCompletion || wd.estimatedDate
                    const amountAbs = Math.abs(Number(wd.amount) || 0)
                    const feeAbs = Math.abs(Number(wd.fee) || 0)
                    return (
                      <motion.div
                        key={wd.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] gap-1 ${config.color}`}>
                              <StatusIcon className={`h-3 w-3 ${wd.status === 'processing' || wd.status === 'approved' ? 'animate-spin' : ''}`} />
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">#{String(wd.id).toUpperCase().slice(0, 12)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-foreground">{formatCurrency(amountAbs)}</p>
                            {isPending && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 gap-1"
                                onClick={() => toast.info('Entre em contato com o suporte para cancelar um saque em processamento.')}
                              >
                                <Ban className="h-3 w-3" />
                                {t('withdrawals.cancel')}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Status Timeline */}
                        <div className="flex items-center gap-1 mt-3">
                          <div className={`flex items-center gap-1.5 text-[10px] ${requestedAt ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
                            <div className={`w-3 h-3 rounded-full ${requestedAt ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            {t('withdrawals.requested')}
                          </div>
                          <div className={`flex-1 h-0.5 ${processedAt ? 'bg-emerald-400' : 'bg-muted-foreground/20'}`} />
                          <div className={`flex items-center gap-1.5 text-[10px] ${processedAt ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
                            <div className={`w-3 h-3 rounded-full ${processedAt ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            {t('withdrawals.processing')}
                          </div>
                          <div className={`flex-1 h-0.5 ${(completedAt || wd.status === 'rejected' || wd.status === 'failed') ? 'bg-emerald-400' : 'bg-muted-foreground/20'}`} />
                          <div className={`flex items-center gap-1.5 text-[10px] ${completedAt ? 'text-emerald-600 dark:text-emerald-400 font-medium' : wd.status === 'rejected' || wd.status === 'failed' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            <div className={`w-3 h-3 rounded-full ${completedAt ? 'bg-emerald-500' : wd.status === 'rejected' || wd.status === 'failed' ? 'bg-red-500' : 'bg-muted-foreground/30'}`} />
                            {wd.status === 'rejected' || wd.status === 'failed' ? t('withdrawals.rejected') : t('withdrawals.completed')}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-muted-foreground">
                          {requestedAt && (
                            <span>{t('withdrawals.requestedAt')}: {new Date(requestedAt).toLocaleDateString('pt-BR')}</span>
                          )}
                          {estimatedCompletion && isPending && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {t('withdrawals.estimated')}: {new Date(estimatedCompletion).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          <span>{t('withdrawals.fee')}: {formatCurrency(feeAbs)}</span>
                          {wd.netAmount !== undefined && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Líquido: {formatCurrency(Math.abs(Number(wd.netAmount) || 0))}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoiceViewer />
        </TabsContent>
      </Tabs>

      {/* Enhanced Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
              {t('transfer.title')}
            </DialogTitle>
            <DialogDescription className="sr-only">Dialog to transfer funds between balance types</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Source → Destination flow indicator */}
            <div className="flex items-center justify-center gap-3 py-3">
              <div className="flex-1 rounded-lg border border-border p-3 text-center bg-muted/30">
                <p className="text-[10px] text-muted-foreground mb-1">Origem</p>
                <p className="text-sm font-bold text-foreground">{balanceLabels[transferSource]}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(balanceValues[transferSource] || 0)}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <motion.div
                  animate={{ x: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                >
                  <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
                </motion.div>
                <span className="text-[9px] text-muted-foreground animate-arrow-flow">transferir</span>
              </div>
              <div className="flex-1 rounded-lg border border-border p-3 text-center bg-muted/30">
                <p className="text-[10px] text-muted-foreground mb-1">Destino</p>
                <p className="text-sm font-bold text-foreground">{balanceLabels[transferDestination]}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(balanceValues[transferDestination] || 0)}</p>
              </div>
            </div>

            {/* Source select */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <ArrowUpFromLine className="h-3 w-3" />
                De (origem)
              </Label>
              <Select value={transferSource} onValueChange={setTransferSource}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(balanceLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label} ({formatCurrency(balanceValues[key] || 0)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination select - excludes `withdrawal` (Saldo para Saque) */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <ArrowDownToLine className="h-3 w-3" />
                Para (destino)
              </Label>
              <Select value={transferDestination} onValueChange={setTransferDestination}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {destinationBalanceKeys.map((key) => (
                    <SelectItem key={key} value={key}>{balanceLabels[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount - this is a transfer between wallets, not a withdrawal */}
            <div className="space-y-2">
              <Label className="text-xs">{t('transfer.amount')}</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
            </div>

            {/* Fee calculation with animated counter */}
            {amountNum > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-b from-muted/50 to-muted/30 rounded-lg p-3 space-y-2 border border-border overflow-hidden"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Resumo da transferência</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="text-foreground font-medium">{formatCurrency(amountCents)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxa ({feePercent}%)</span>
                  <span className="text-red-600 dark:text-red-400 font-medium animate-count-pop">-{formatCurrency(feeAmountCents)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-semibold">Destino receberá</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{formatCurrency(netAmountCents)}</span>
                </div>
              </motion.div>
            )}

            {/* Balance preview after transfer */}
            {amountNum > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 space-y-2 border border-emerald-100 dark:border-emerald-900/50 overflow-hidden"
              >
                <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Saldos após transferência</p>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400">{balanceLabels[transferSource]}</span>
                  <span className="font-medium text-foreground">{formatCurrency(Math.max(0, (balanceValues[transferSource] || 0) - amountCents))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400">{balanceLabels[transferDestination]}</span>
                  <span className="font-medium text-foreground">{formatCurrency((balanceValues[transferDestination] || 0) + netAmountCents)}</span>
                </div>
              </motion.div>
            )}

            {transferSource === transferDestination && (
              <p className="text-xs text-red-500 font-medium text-center">Selecione origem e destino diferentes</p>
            )}

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleTransfer}
              disabled={transferSubmitting || transferSource === transferDestination || amountNum <= 0 || amountCents > (balanceValues[transferSource] || 0)}
            >
              {transferSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Confirmar Transferência
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== PIX REGISTRATION DIALOG ===== */}
      <Dialog open={pixDialogOpen} onOpenChange={setPixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              Cadastre sua Chave PIX
            </DialogTitle>
            <DialogDescription>
              Para solicitar saques, você precisa cadastrar uma chave PIX válida. Os saques serão processados e enviados para sua chave PIX.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>É obrigatório ter uma chave PIX cadastrada para receber saques. Escolha o tipo de chave e informe o valor correspondente.</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Chave PIX</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cpf', label: 'CPF', icon: '🆔' },
                  { id: 'phone', label: 'Telefone', icon: '📱' },
                  { id: 'email', label: 'E-mail', icon: '📧' },
                  { id: 'random', label: 'Aleatória', icon: '🎲' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPixKeyType(opt.id as any)
                      setPixKeyValue('')
                    }}
                    className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                      pixKeyType === opt.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        : 'border-border hover:border-emerald-300 text-muted-foreground'
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor da Chave PIX</Label>
              {pixKeyType === 'random' ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Clique em gerar para criar uma chave aleatória"
                    value={pixKeyValue}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      // Generate a random PIX key (UUID-like format)
                      const chars = 'abcdef0123456789'
                      const blocks: string[] = []
                      for (let b = 0; b < 4; b++) {
                        let block = ''
                        for (let i = 0; i < 8; i++) block += chars[Math.floor(Math.random() * chars.length)]
                        blocks.push(block)
                      }
                      setPixKeyValue(blocks.join('-'))
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Gerar Chave Aleatória
                  </Button>
                </div>
              ) : (
                <Input
                  type={pixKeyType === 'email' ? 'email' : 'text'}
                  placeholder={
                    pixKeyType === 'cpf' ? '000.000.000-00' :
                    pixKeyType === 'phone' ? '+55 (00) 00000-0000' :
                    'seu@email.com'
                  }
                  value={pixKeyValue}
                  onChange={(e) => setPixKeyValue(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                {pixKeyType === 'cpf' && 'Digite seu CPF no formato 000.000.000-00'}
                {pixKeyType === 'phone' && 'Digite seu telefone com DDD'}
                {pixKeyType === 'email' && 'Digite seu e-mail válido'}
                {pixKeyType === 'random' && 'Gere uma chave aleatória única'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPixDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                disabled={pixSaving || !pixKeyValue.trim()}
                onClick={async () => {
                  if (!user?.id || !pixKeyValue.trim()) return
                  setPixSaving(true)
                  try {
                    const updated = await apiFetch<any>('/user/profile', {
                      method: 'PUT',
                      body: JSON.stringify({
                        userId: user.id,
                        pixKey: pixKeyValue.trim(),
                        pixEnabled: true,
                      }),
                    })
                    updateUser({
                      pixKey: updated.pixKey ?? pixKeyValue.trim(),
                      pixEnabled: true,
                    })
                    toast.success('Chave PIX cadastrada com sucesso! Agora você pode solicitar saques.')
                    setPixDialogOpen(false)
                    setPixKeyValue('')
                    // Now open the withdraw dialog
                    setTimeout(() => setWithdrawOpen(true), 300)
                  } catch (err: any) {
                    toast.error(err.message || 'Erro ao cadastrar chave PIX')
                  } finally {
                    setPixSaving(false)
                  }
                }}
              >
                {pixSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Cadastrar e Continuar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
