'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Banknote,
  ArrowDownToLine,
  Check,
  CheckCheck,
  X,
  Eye,
  Loader2,
  Clock,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'

// ---------- Types ----------

interface AdminWithdrawalUser {
  id: string
  name: string
  email: string
  cpf?: string | null
  pixKey?: string | null
  bankCode?: string | null
  bankAgency?: string | null
  bankAccount?: string | null
  bankType?: string | null
}

interface AdminWithdrawalRequest {
  id: string
  userId: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'failed' | 'under_review'
  paymentMethod: 'pix' | 'bank_transfer'
  pixKey?: string | null
  bankCode?: string | null
  bankAgency?: string | null
  bankAccount?: string | null
  bankType?: string | null
  asaasTransferId?: string | null
  asaasStatus?: string | null
  rejectedReason?: string | null
  processedById?: string | null
  processedAt?: string | null
  paidAt?: string | null
  createdAt: string
  updatedAt: string
  user?: AdminWithdrawalUser | null
  // Optional: transactionReceiptUrl is fetched when opening the detail dialog (from Asaas)
  transactionReceiptUrl?: string | null
}

interface AdminWithdrawalsResponse {
  withdrawals: AdminWithdrawalRequest[]
  total: number
  totalPages: number
  stats: {
    pendingCount: number
    approvedCount: number
    paidCount: number
    rejectedCount: number
  }
}

type FilterKey = 'all' | 'pending' | 'approved' | 'paid' | 'rejected' | 'under_review'

const PAGE_SIZE = 20

// ---------- Helpers ----------

function formatAmountCents(cents: number): string {
  return formatCurrency(cents)
}

function formatDateTimePtBR(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status: AdminWithdrawalRequest['status']) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 gap-1">
          <Clock className="h-3 w-3" /> Pendente
        </Badge>
      )
    case 'approved':
      return (
        <Badge className="bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 gap-1">
          <Check className="h-3 w-3" /> Aprovado
        </Badge>
      )
    case 'paid':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 gap-1">
          <Check className="h-3 w-3" /> Pago
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 gap-1">
          <X className="h-3 w-3" /> Rejeitado
        </Badge>
      )
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 gap-1">
          <AlertCircle className="h-3 w-3" /> Falhou
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function methodBadge(method: AdminWithdrawalRequest['paymentMethod']) {
  if (method === 'pix') {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 gap-1">
        <Smartphone className="h-3 w-3" /> PIX
      </Badge>
    )
  }
  return (
    <Badge className="bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 gap-1">
      <Banknote className="h-3 w-3" /> TED
    </Badge>
  )
}

function withdrawalDetailsSummary(w: AdminWithdrawalRequest): string {
  if (w.paymentMethod === 'pix') {
    return `PIX: ${w.pixKey || '—'}`
  }
  const bankTypeLabel =
    w.bankType === 'SAVINGS' ? 'Poupança' : w.bankType === 'CHECKING' ? 'Corrente' : w.bankType || ''
  return `Banco ${w.bankCode || '—'} · Ag ${w.bankAgency || '—'} · C/C ${w.bankAccount || '—'}${bankTypeLabel ? ` · ${bankTypeLabel}` : ''}`
}

// ---------- Component ----------

export function AdminWithdrawalsPanel() {
  const { user } = useStore()
  const adminUserId = user?.id || ''

  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [stats, setStats] = useState({
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0,
    rejectedCount: 0,
  })
  const [processingId, setProcessingId] = useState<string | null>(null)
  // Tarefa 1 (21/09): state para aprovação em lote
  const [batchProcessing, setBatchProcessing] = useState(false)
  const pendingCount = withdrawals.filter(w => w.status === 'pending' || w.status === 'under_review').length

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean
    withdrawalId: string | null
    reason: string
  }>({ open: false, withdrawalId: null, reason: '' })

  // Tarefa 1 (22/09): modal de confirmação ao aprovar saque
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean
    withdrawal: AdminWithdrawalRequest | null
    isBatch: boolean
    batchIds: string[]
    batchTotal: number
  }>({ open: false, withdrawal: null, isBatch: false, batchIds: [], batchTotal: 0 })

  const [detailDialog, setDetailDialog] = useState<{
    open: boolean
    withdrawal: AdminWithdrawalRequest | null
    loadingReceipt: boolean
  }>({ open: false, withdrawal: null, loadingReceipt: false })

  const loadWithdrawals = useCallback(async () => {
    if (!adminUserId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        userId: adminUserId,
        status: filter,
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      const res = await fetch(`/api/admin/asaas/withdrawals?${params.toString()}`, {
        cache: 'no-store',
      })
      const data: AdminWithdrawalsResponse = await res.json()
      if (!res.ok) {
        throw new Error((data as any)?.error || 'Falha ao carregar saques')
      }
      setWithdrawals(data.withdrawals || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
      if (data.stats) setStats(data.stats)
    } catch (err: any) {
      console.error('Failed to load admin withdrawals', err)
      setError(err?.message || 'Falha ao carregar saques')
      setWithdrawals([])
    } finally {
      setLoading(false)
    }
  }, [adminUserId, filter, page])

  useEffect(() => {
    loadWithdrawals()
  }, [loadWithdrawals])

  // Tarefa 5 (21/09): auto-refresh a cada 30s enquanto a aba estiver ativa.
  // Garante que saques aprovados por outros admins apareçam sem precisar
  // atualizar a página manualmente.
  useEffect(() => {
    const interval = setInterval(() => {
      loadWithdrawals()
    }, 30000) // 30 segundos
    return () => clearInterval(interval)
  }, [loadWithdrawals])

  function changeFilter(next: FilterKey) {
    setFilter(next)
    setPage(1)
  }

  async function handleApprove(w: AdminWithdrawalRequest) {
    if (!adminUserId) {
      toast.error('Sessão do administrador não encontrada.')
      return
    }
    // Tarefa 1 (22/09): abre modal de confirmação antes de aprovar
    setApproveDialog({ open: true, withdrawal: w, isBatch: false, batchIds: [], batchTotal: 0 })
  }

  // Executa a aprovação após confirmação do modal
  async function confirmApprove() {
    if (!adminUserId) return
    const w = approveDialog.withdrawal
    if (!w) return
    setProcessingId(w.id)
    setApproveDialog(d => ({ ...d, open: false }))
    try {
      const res = await fetch(
        `/api/admin/asaas/withdrawals/${encodeURIComponent(w.id)}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUserId }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao aprovar saque')
      }
      toast.success('Saque aprovado e transferência Asaas criada')
      await loadWithdrawals()
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao aprovar saque')
    } finally {
      setProcessingId(null)
    }
  }

  // Tarefa 1 (21/09): Aprovação em lote — aprova todos os saques pendentes
  async function handleBatchApprove() {
    if (!adminUserId) {
      toast.error('Sessão do administrador não encontrada.')
      return
    }
    const pendingIds = withdrawals.filter(w => w.status === 'pending' || w.status === 'under_review').map(w => w.id)
    if (pendingIds.length === 0) {
      toast.info('Não há saques pendentes para aprovar.')
      return
    }
    const totalAmount = withdrawals
      .filter(w => w.status === 'pending' || w.status === 'under_review')
      .reduce((sum, w) => sum + w.amount, 0)
    // Tarefa 1 (22/09): abre modal de confirmação em vez de confirm() nativo
    setApproveDialog({ open: true, withdrawal: null, isBatch: true, batchIds: pendingIds, batchTotal: totalAmount })
  }

  // Executa aprovação em lote após confirmação do modal
  async function confirmBatchApprove() {
    if (!adminUserId) return
    const { batchIds, batchTotal } = approveDialog
    if (batchIds.length === 0) return
    setApproveDialog(d => ({ ...d, open: false }))
    setBatchProcessing(true)
    try {
      const res = await fetch('/api/admin/asaas/withdrawals/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId, withdrawalIds: batchIds, action: 'approve' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao aprovar saques em lote')
      }
      toast.success(`${data.processed} saque(s) aprovado(s), ${data.failed} falha(s)`)
      await loadWithdrawals()
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao aprovar saques em lote')
    } finally {
      setBatchProcessing(false)
    }
  }

  async function handleReject() {
    if (!rejectDialog.withdrawalId || !adminUserId) return
    const reason = rejectDialog.reason.trim()
    if (reason.length < 3) {
      toast.error('Informe um motivo com pelo menos 3 caracteres.')
      return
    }
    setProcessingId(rejectDialog.withdrawalId)
    try {
      const res = await fetch(
        `/api/admin/asaas/withdrawals/${encodeURIComponent(rejectDialog.withdrawalId)}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUserId, reason }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao rejeitar saque')
      }
      toast.success('Saque rejeitado e valor devolvido ao usuário')
      setRejectDialog({ open: false, withdrawalId: null, reason: '' })
      await loadWithdrawals()
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao rejeitar saque')
    } finally {
      setProcessingId(null)
    }
  }

  async function openDetailDialog(w: AdminWithdrawalRequest) {
    setDetailDialog({ open: true, withdrawal: w, loadingReceipt: !!w.asaasTransferId })
    // Best-effort: fetch transfer details (transactionReceiptUrl) from Asaas via a small lookup endpoint.
    if (w.asaasTransferId) {
      try {
        const res = await fetch(
          `/api/admin/asaas/withdrawals/${encodeURIComponent(w.id)}/transfer`
        )
        const data = await res.json()
        if (res.ok && data?.transactionReceiptUrl) {
          setDetailDialog((prev) =>
            prev.open && prev.withdrawal?.id === w.id
              ? {
                  ...prev,
                  withdrawal: { ...prev.withdrawal, transactionReceiptUrl: data.transactionReceiptUrl },
                  loadingReceipt: false,
                }
              : prev
          )
        } else {
          setDetailDialog((prev) => (prev.open ? { ...prev, loadingReceipt: false } : prev))
        }
      } catch {
        setDetailDialog((prev) => (prev.open ? { ...prev, loadingReceipt: false } : prev))
      }
    }
  }

  // ---------- Render ----------

  const statsCards = [
    {
      label: 'Pendentes',
      value: stats.pendingCount,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      filter: 'pending' as FilterKey,
    },
    {
      label: 'Aprovados',
      value: stats.approvedCount,
      icon: Check,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      filter: 'approved' as FilterKey,
    },
    {
      label: 'Pagos',
      value: stats.paidCount,
      icon: Banknote,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      filter: 'paid' as FilterKey,
    },
    {
      label: 'Rejeitados',
      value: stats.rejectedCount,
      icon: X,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      filter: 'rejected' as FilterKey,
    },
  ]

  const filterButtons: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendentes' },
    { key: 'under_review', label: 'Em Análise' },
    { key: 'approved', label: 'Aprovados' },
    { key: 'paid', label: 'Pagos' },
    { key: 'rejected', label: 'Rejeitados' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Solicitações de Saque
          </h2>
          <p className="text-sm text-muted-foreground">
            Aprove e processe saques via Asaas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tarefa 1 (21/09): Botão "Aprovar Todos" — aprovação em lote */}
          {pendingCount > 0 && (
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleBatchApprove}
              disabled={batchProcessing}
            >
              {batchProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Aprovar Todos ({pendingCount})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={loadWithdrawals}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsCards.map((s, i) => {
          const Icon = s.icon
          const isActive = filter === s.filter
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`${s.bg} ${s.border} border cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => changeFilter(isActive ? 'all' : s.filter)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        {s.label}
                      </p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5" />
          <span>Filtrar:</span>
        </div>
        {filterButtons.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? 'default' : 'outline'}
            className={`h-7 text-xs ${
              filter === f.key
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : ''
            }`}
            onClick={() => changeFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card className="shadow-sm bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
            Saques Asaas
            <Badge variant="secondary" className="text-[10px] ml-1">
              {total} registro(s)
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Saques solicitados pelos usuários e processados via Asaas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={loadWithdrawals}>
                Tentar novamente
              </Button>
            </div>
          ) : loading && withdrawals.length === 0 ? (
            <div className="p-6 space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 rounded-md bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <ArrowDownToLine className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhuma solicitação de saque encontrada.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block max-h-[32rem] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="text-xs">Solicitante</TableHead>
                      <TableHead className="text-xs">Valor</TableHead>
                      <TableHead className="text-xs">Método</TableHead>
                      <TableHead className="text-xs">Dados</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Solicitado em</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {w.user?.name || '—'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {w.user?.email || ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {formatAmountCents(Number(w.amount) || 0)}
                        </TableCell>
                        <TableCell>{methodBadge(w.paymentMethod)}</TableCell>
                        <TableCell className="max-w-[260px]">
                          <span className="text-[11px] text-muted-foreground break-words">
                            {withdrawalDetailsSummary(w)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {statusBadge(w.status)}
                            {w.status === 'rejected' && w.rejectedReason && (
                              <span className="text-[10px] text-red-600 dark:text-red-400">
                                {w.rejectedReason}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDateTimePtBR(w.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(w.status === 'pending' || w.status === 'under_review') && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                  onClick={() => handleApprove(w)}
                                  disabled={processingId === w.id}
                                >
                                  {processingId === w.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Aprovar e transferir
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 gap-1"
                                  onClick={() =>
                                    setRejectDialog({
                                      open: true,
                                      withdrawalId: w.id,
                                      reason: '',
                                    })
                                  }
                                  disabled={processingId === w.id}
                                >
                                  <X className="h-3 w-3" />
                                  Rejeitar
                                </Button>
                              </>
                            )}
                            {(w.status === 'paid' || w.status === 'approved') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1"
                                onClick={() => openDetailDialog(w)}
                              >
                                <Eye className="h-3 w-3" />
                                Ver comprovante
                              </Button>
                            )}
                            {w.status === 'rejected' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px] gap-1"
                                onClick={() => openDetailDialog(w)}
                              >
                                <Eye className="h-3 w-3" />
                                Detalhes
                              </Button>
                            )}
                            {w.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px] gap-1"
                                onClick={() => openDetailDialog(w)}
                              >
                                <Eye className="h-3 w-3" />
                                Detalhes
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile list */}
              <div className="md:hidden divide-y divide-border max-h-[32rem] overflow-y-auto custom-scrollbar">
                {withdrawals.map((w) => (
                  <div key={w.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {w.user?.name || '—'}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {w.user?.email || ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground shrink-0">
                        {formatAmountCents(Number(w.amount) || 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(w.status)}
                      {methodBadge(w.paymentMethod)}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {withdrawalDetailsSummary(w)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Solicitado em {formatDateTimePtBR(w.createdAt)}
                    </p>
                    {w.status === 'rejected' && w.rejectedReason && (
                      <p className="text-[11px] text-red-600 dark:text-red-400">
                        Motivo: {w.rejectedReason}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {(w.status === 'pending' || w.status === 'under_review') && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 flex-1"
                            onClick={() => handleApprove(w)}
                            disabled={processingId === w.id}
                          >
                            {processingId === w.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 gap-1"
                            onClick={() =>
                              setRejectDialog({
                                open: true,
                                withdrawalId: w.id,
                                reason: '',
                              })
                            }
                            disabled={processingId === w.id}
                          >
                            <X className="h-3 w-3" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                      {(w.status === 'paid' ||
                        w.status === 'approved' ||
                        w.status === 'rejected' ||
                        w.status === 'failed') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => openDetailDialog(w)}
                        >
                          <Eye className="h-3 w-3" />
                          Detalhes
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-2 p-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Página {page} de {Math.max(1, totalPages)} · {total} registro(s)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1"
                    onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
                    disabled={page >= totalPages || loading}
                  >
                    Próxima
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tarefa 1 (22/09): Modal de confirmação ao aprovar saque */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => !open && setApproveDialog(d => ({ ...d, open: false }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirmar Aprovação
            </DialogTitle>
            <DialogDescription>
              {approveDialog.isBatch ? (
                <>
                  Você está prestes a aprovar <strong>{approveDialog.batchIds.length} saque(s)</strong> no valor total de{' '}
                  <strong className="text-emerald-600">R$ {(approveDialog.batchTotal / 100).toFixed(2)}</strong>.
                  Serão criadas {approveDialog.batchIds.length} transferência(s) no Asaas.
                </>
              ) : approveDialog.withdrawal ? (
                <>
                  Você deseja realmente aprovar o saque de{' '}
                  <strong className="text-emerald-600">R$ {(approveDialog.withdrawal.amount / 100).toFixed(2)}</strong>
                  {' '}de <strong>{approveDialog.withdrawal.user?.name || 'usuário'}</strong>?
                  Uma transferência será criada no Asaas.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
            Esta ação não pode ser desfeita. O valor será transferido automaticamente.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog(d => ({ ...d, open: false }))}
              disabled={!!processingId || batchProcessing}
            >
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={approveDialog.isBatch ? confirmBatchApprove : confirmApprove}
              disabled={!!processingId || batchProcessing}
            >
              {(processingId || batchProcessing) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Sim, aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) =>
          setRejectDialog((prev) =>
            open ? prev : { ...prev, open: false, withdrawalId: null, reason: '' }
          )
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Rejeitar solicitação de saque
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O valor será devolvido ao saldo do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reject-reason" className="text-xs">
              Motivo da rejeição
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="Ex.: Dados bancários inválidos, valor inconsistente, etc."
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground">
              Mínimo de 3 caracteres.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRejectDialog({ open: false, withdrawalId: null, reason: '' })
              }
              disabled={!!processingId}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white gap-1"
              onClick={handleReject}
              disabled={!!processingId || rejectDialog.reason.trim().length < 3}
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Receipt Dialog */}
      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) =>
          setDetailDialog((prev) =>
            open ? prev : { open: false, withdrawal: null, loadingReceipt: false }
          )
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600" />
              Detalhes do Saque
            </DialogTitle>
            <DialogDescription>
              Informações da solicitação e da transferência Asaas
            </DialogDescription>
          </DialogHeader>
          {detailDialog.withdrawal && (
            <div className="space-y-2 py-2 text-sm max-h-[60vh] overflow-y-auto custom-scrollbar">
              <DetailRow label="Status">
                {statusBadge(detailDialog.withdrawal.status)}
              </DetailRow>
              <DetailRow label="Método">
                {methodBadge(detailDialog.withdrawal.paymentMethod)}
              </DetailRow>
              <DetailRow label="Valor">
                {formatAmountCents(Number(detailDialog.withdrawal.amount) || 0)}
              </DetailRow>
              <DetailRow label="Solicitante">
                <div className="flex flex-col text-right">
                  <span>{detailDialog.withdrawal.user?.name || '—'}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {detailDialog.withdrawal.user?.email || ''}
                  </span>
                </div>
              </DetailRow>
              <DetailRow label="Solicitado em">
                {formatDateTimePtBR(detailDialog.withdrawal.createdAt)}
              </DetailRow>
              {detailDialog.withdrawal.processedAt && (
                <DetailRow label="Processado em">
                  {formatDateTimePtBR(detailDialog.withdrawal.processedAt)}
                </DetailRow>
              )}
              {detailDialog.withdrawal.paidAt && (
                <DetailRow label="Pago em">
                  {formatDate(detailDialog.withdrawal.paidAt)}
                </DetailRow>
              )}
              {detailDialog.withdrawal.paymentMethod === 'pix' ? (
                <DetailRow label="Chave PIX">
                  {detailDialog.withdrawal.pixKey || '—'}
                </DetailRow>
              ) : (
                <>
                  <DetailRow label="Banco">
                    {detailDialog.withdrawal.bankCode || '—'}
                  </DetailRow>
                  <DetailRow label="Agência">
                    {detailDialog.withdrawal.bankAgency || '—'}
                  </DetailRow>
                  <DetailRow label="Conta">
                    {detailDialog.withdrawal.bankAccount || '—'}
                  </DetailRow>
                  <DetailRow label="Tipo de Conta">
                    {detailDialog.withdrawal.bankType === 'SAVINGS'
                      ? 'Conta Poupança'
                      : detailDialog.withdrawal.bankType === 'CHECKING'
                      ? 'Conta Corrente'
                      : detailDialog.withdrawal.bankType || '—'}
                  </DetailRow>
                </>
              )}
              {detailDialog.withdrawal.asaasTransferId && (
                <DetailRow label="ID transferência Asaas">
                  <span className="font-mono text-[11px] break-all">
                    {detailDialog.withdrawal.asaasTransferId}
                  </span>
                </DetailRow>
              )}
              {detailDialog.withdrawal.asaasStatus && (
                <DetailRow label="Status Asaas">
                  {detailDialog.withdrawal.asaasStatus}
                </DetailRow>
              )}
              {detailDialog.loadingReceipt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Buscando comprovante no Asaas...
                </div>
              )}
              {detailDialog.withdrawal.transactionReceiptUrl && (
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground">
                    Comprovante
                  </Label>
                  <a
                    href={detailDialog.withdrawal.transactionReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline break-all"
                  >
                    <Eye className="h-3 w-3 shrink-0" />
                    Abrir comprovante no Asaas
                  </a>
                </div>
              )}
              {detailDialog.withdrawal.rejectedReason && (
                <div className="pt-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-2">
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    Motivo da rejeição:
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    {detailDialog.withdrawal.rejectedReason}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDetailDialog({ open: false, withdrawal: null, loadingReceipt: false })
              }
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground font-medium text-right">{children}</span>
    </div>
  )
}
