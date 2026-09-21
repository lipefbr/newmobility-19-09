'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  HeartPulse, CheckCircle2, XCircle, Clock, RefreshCw, Loader2,
  ExternalLink, User, Users, Phone, Mail, Calendar, FileText, Search,
  CreditCard,
} from 'lucide-react'

import { useStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ---------- Types ----------

interface TelemedicinaDependent {
  name?: string
  kinship?: string
  birthDate?: string
  cpf?: string
}

interface TelemedicinaRequestDTO {
  id: string
  userId: string
  fullName: string
  cpf: string
  birthDate: string | null
  phone: string
  email: string
  dependents: TelemedicinaDependent[]
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  adminNotes: string | null
  activationLink: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  user?: {
    id: string
    name: string
    email: string
    referralCode: string
    phone: string
    plan: string
  } | null
}

interface ListResponse {
  requests: TelemedicinaRequestDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ---------- Payment-method helpers ----------
// The TelemedicinaRequest model has no dedicated paymentMethod column, so the
// chosen method is persisted as a `[Pagamento: PIX]` prefix on the `notes`
// field. We parse it back out here so the admin can see at a glance which
// payment method the user selected.

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  credit_card: 'Cartão de Crédito',
}

function normalizePaymentMethod(input: string): string | null {
  const v = input.trim().toLowerCase()
  if (v === 'pix') return 'pix'
  if (v === 'boleto' || v === 'bank_slip') return 'boleto'
  if (v === 'credit_card' || v === 'creditcard' || v === 'cartao' || v === 'cartão' || v === 'cartão de crédito' || v === 'cartao de credito') return 'credit_card'
  return null
}

function parsePaymentFromNotes(raw: string | null): {
  method: string | null
  label: string | null
  notes: string | null
} {
  if (!raw) return { method: null, label: null, notes: null }
  // Match `[Pagamento: <method>] <rest>` at the start of the string. Use
  // [\s\S] instead of the `s` (dotAll) flag because the project's tsconfig
  // targets ES2017 and the `s` flag requires ES2018+.
  const match = raw.match(/^\[Pagamento:\s*([^\]]+)\]\s*([\s\S]*)$/i)
  if (!match) return { method: null, label: null, notes: raw }
  const rawMethod = match[1].trim()
  const method = normalizePaymentMethod(rawMethod) ?? rawMethod
  const label = PAYMENT_METHOD_LABELS[method] ?? rawMethod
  const rest = match[2].trim()
  return { method, label, notes: rest || null }
}

interface ListResponse {
  requests: TelemedicinaRequestDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ---------- Component ----------

export function AdminTelemedicinaPanel() {
  const { user } = useStore()
  const adminId = user?.id ?? ''

  const [requests, setRequests] = useState<TelemedicinaRequestDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [search, setSearch] = useState('')

  // Action dialog state (approve / reject)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionMode, setActionMode] = useState<'approve' | 'reject'>('approve')
  const [activeRequest, setActiveRequest] = useState<TelemedicinaRequestDTO | null>(null)
  const [activationLink, setActivationLink] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Detail dialog (read-only)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsReq, setDetailsReq] = useState<TelemedicinaRequestDTO | null>(null)

  const load = useCallback(async () => {
    if (!adminId) {
      setLoading(false)
      return
    }
    try {
      const data = await apiFetch<ListResponse>(`/admin/telemedicina?userId=${adminId}&status=${statusFilter}&pageSize=50`)
      setRequests(data.requests || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [adminId, statusFilter])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const handleRefresh = () => {
    setRefreshing(true)
    load()
  }

  const openApprove = (req: TelemedicinaRequestDTO) => {
    setActiveRequest(req)
    setActionMode('approve')
    setActivationLink(req.activationLink || '')
    setAdminNotes(req.adminNotes || '')
    setActionDialogOpen(true)
  }

  const openReject = (req: TelemedicinaRequestDTO) => {
    setActiveRequest(req)
    setActionMode('reject')
    setActivationLink('')
    setAdminNotes(req.adminNotes || '')
    setActionDialogOpen(true)
  }

  const submitAction = async () => {
    if (!activeRequest) return
    if (actionMode === 'approve' && !activationLink.trim()) {
      toast.error('Informe o link de ativação que será enviado ao usuário.')
      return
    }
    if (actionMode === 'reject' && !adminNotes.trim()) {
      toast.error('Informe o motivo da recusa.')
      return
    }
    setActionLoading(true)
    try {
      const endpoint = actionMode === 'approve' ? 'approve' : 'reject'
      await apiFetch(`/admin/telemedicina/${activeRequest.id}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({
          adminId,
          activationLink: actionMode === 'approve' ? activationLink.trim() : undefined,
          adminNotes: adminNotes.trim() || undefined,
        }),
      })
      toast.success(actionMode === 'approve' ? 'Pedido aprovado e usuário notificado!' : 'Pedido rejeitado e usuário notificado.')
      setActionDialogOpen(false)
      setActiveRequest(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar ação')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.cpf.includes(q) ||
      (r.user?.name || '').toLowerCase().includes(q)
    )
  })

  // Stats by status
  const stats = {
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-rose-600" />
            Pedidos de Telemedicina
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aprove pedidos de ativação e envie o link de acesso ao usuário
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Pendentes</p>
              <p className="text-lg font-bold text-foreground">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Aprovados</p>
              <p className="text-lg font-bold text-foreground">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <XCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Recusados</p>
              <p className="text-lg font-bold text-foreground">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou CPF..."
            className="pl-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Recusados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="rounded-2xl shadow-sm">
              <CardContent className="p-4 space-y-2 animate-pulse">
                <div className="h-4 w-1/3 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
                <div className="h-8 w-full bg-muted rounded mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-8 text-center">
            <HeartPulse className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">Nenhum pedido encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter === 'pending'
                ? 'Não há pedidos pendentes no momento.'
                : `Não há pedidos com o filtro selecionado.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req, idx) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * idx, duration: 0.3 }}
            >
              <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Left: user info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-foreground truncate">{req.fullName}</h4>
                        <Badge
                          variant="outline"
                          className={
                            req.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px]'
                              : req.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-[10px]'
                                : req.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800 text-[10px]'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800 text-[10px]'
                          }
                        >
                          {req.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {req.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {req.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {req.status === 'approved' ? 'Aprovado' : req.status === 'pending' ? 'Pendente' : req.status === 'rejected' ? 'Recusado' : 'Cancelado'}
                        </Badge>
                        {(() => {
                          const pm = parsePaymentFromNotes(req.notes)
                          return pm.label ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px] gap-1"
                              title="Forma de pagamento escolhida pelo usuário"
                            >
                              <CreditCard className="h-3 w-3" />
                              {pm.label}
                            </Badge>
                          ) : null
                        })()}
                        {/* ADM-3 — fixed activation price badge so the admin
                            can see at a glance how much this request is
                            worth on the list (matches the user-side price
                            shown in talkmobi-page.tsx). */}
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px] gap-1 font-semibold"
                          title="Valor da ativação da Telemedicina"
                        >
                          R$ 49,90/mês
                        </Badge>
                        {req.dependents && req.dependents.length > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Users className="h-3 w-3" />
                            {req.dependents.length} dep.
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{req.email}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          {req.phone}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 shrink-0" />
                          CPF: {req.cpf}
                        </span>
                        {req.birthDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            Nasc.: {new Date(req.birthDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>

                      {req.user && (
                        <p className="text-[11px] text-muted-foreground">
                          Conta: <span className="font-medium text-foreground">{req.user.name}</span> ({req.user.email})
                          {req.user.referralCode && ` · Código: ${req.user.referralCode}`}
                        </p>
                      )}

                      {(() => {
                        // Strip the `[Pagamento: …]` prefix when displaying
                        // the user's notes so the admin sees only what the
                        // user actually typed.
                        const pm = parsePaymentFromNotes(req.notes)
                        if (!pm.notes) return null
                        return (
                          <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2 rounded">
                            Obs.: {pm.notes}
                          </p>
                        )
                      })()}

                      {req.status === 'approved' && req.activationLink && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                          <ExternalLink className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <a
                            href={req.activationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline truncate flex-1 min-w-0"
                          >
                            {req.activationLink}
                          </a>
                        </div>
                      )}
                      {req.status === 'rejected' && req.adminNotes && (
                        <p className="text-[11px] text-rose-700 dark:text-rose-400 italic">
                          Motivo: {req.adminNotes}
                        </p>
                      )}

                      <p className="text-[10px] text-muted-foreground">
                        Pedido em: {req.createdAt ? new Date(req.createdAt).toLocaleString('pt-BR') : '—'}
                      </p>
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-row md:flex-col gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDetailsReq(req)
                          setDetailsOpen(true)
                        }}
                        className="text-xs gap-1.5"
                      >
                        <User className="h-3.5 w-3.5" />
                        Ver
                      </Button>
                      {req.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openApprove(req)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReject(req)}
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40 text-xs gap-1.5"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Recusar
                          </Button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openApprove(req)}
                          className="text-xs gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reenviar
                        </Button>
                      )}
                      {req.status === 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openApprove(req)}
                          className="text-xs gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reativar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== Action Dialog (Approve / Reject) ===== */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="rounded-2xl shadow-lg sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-xl shrink-0',
                actionMode === 'approve'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
              )}>
                {actionMode === 'approve' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle className="text-base">
                  {actionMode === 'approve' ? 'Aprovar Pedido' : 'Recusar Pedido'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {activeRequest?.fullName} · CPF: {activeRequest?.cpf}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* ADM-3 — Price + payment-method banner so the admin sees the
              activation amount at a glance when approving/rejecting. The
              price is fixed (R$ 49,90/mês) and the payment method is parsed
              out of the request's notes field by parsePaymentFromNotes. */}
          {activeRequest && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">Valor da ativação</p>
                  <p className="text-[11px] text-muted-foreground">
                    Pagamento:{' '}
                    <span className="font-medium text-foreground">
                      {parsePaymentFromNotes(activeRequest.notes).label || '—'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">R$ 49,90</p>
                <p className="text-[10px] text-muted-foreground">por mês</p>
              </div>
            </div>
          )}

          <div className="space-y-3 py-2">
            {actionMode === 'approve' && (
              <div className="space-y-1.5">
                <Label htmlFor="activation-link" className="text-xs">
                  Link de ativação / credencial *
                </Label>
                <Input
                  id="activation-link"
                  value={activationLink}
                  onChange={(e) => setActivationLink(e.target.value)}
                  placeholder="https://telemedicina.newmobility.com.br/acesso?code=XYZ"
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Este link será exibido ao usuário na página TalkMobi + Telemedicina e enviado por notificação.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="admin-notes" className="text-xs">
                {actionMode === 'approve' ? 'Observações (opcional)' : 'Motivo da recusa *'}
              </Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={actionMode === 'approve' ? 'Instruções adicionais para o usuário...' : 'Explique por que o pedido foi recusado...'}
                className="text-sm min-h-[70px] resize-y"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} className="w-full sm:w-auto" disabled={actionLoading}>
              Cancelar
            </Button>
            <Button
              className={cn(
                'w-full sm:w-auto gap-2 text-white',
                actionMode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              )}
              onClick={submitAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : actionMode === 'approve' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {actionMode === 'approve' ? 'Aprovar e Notificar' : 'Recusar e Notificar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Details Dialog (read-only) ===== */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="rounded-2xl shadow-lg sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-rose-600" />
              Detalhes do Pedido
            </DialogTitle>
            <DialogDescription className="text-xs">
              {detailsReq?.fullName} · {detailsReq?.cpf}
            </DialogDescription>
          </DialogHeader>
          {detailsReq && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">E-mail</p>
                  <p className="font-medium text-foreground truncate">{detailsReq.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium text-foreground">{detailsReq.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data de nascimento</p>
                  <p className="font-medium text-foreground">
                    {detailsReq.birthDate ? new Date(detailsReq.birthDate).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground capitalize">{detailsReq.status}</p>
                </div>
                {/* ADM-3 — fixed activation price row so the admin always
                    sees how much this request is worth, even when the
                    payment method badge isn't set. */}
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-muted-foreground">Valor da ativação</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">R$ 49,90/mês</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Forma de Pagamento</p>
                  <p className="font-medium text-foreground flex items-center gap-1.5">
                    {(() => {
                      const pm = parsePaymentFromNotes(detailsReq.notes)
                      if (!pm.label) return <span className="text-muted-foreground">—</span>
                      return (
                        <>
                          <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          {pm.label}
                        </>
                      )
                    })()}
                  </p>
                </div>
              </div>

              {detailsReq.dependents && detailsReq.dependents.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Dependentes ({detailsReq.dependents.length})
                  </p>
                  <ul className="space-y-1">
                    {detailsReq.dependents.map((d, i) => (
                      <li key={i} className="text-xs text-foreground/80 bg-muted/40 p-2 rounded">
                        <span className="font-medium">{d.name || '—'}</span>
                        {d.kinship && ` · ${d.kinship}`}
                        {d.birthDate && ` · Nasc.: ${new Date(d.birthDate).toLocaleDateString('pt-BR')}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(() => {
                // Show only the user-typed portion of the notes (strip the
                // `[Pagamento: …]` prefix that encodes the payment method).
                const pm = parsePaymentFromNotes(detailsReq.notes)
                if (!pm.notes) return null
                return (
                  <div className="space-y-1 pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-foreground">Observações do usuário</p>
                    <p className="text-xs text-foreground/80 italic bg-muted/40 p-2 rounded">{pm.notes}</p>
                  </div>
                )
              })()}

              {detailsReq.adminNotes && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-foreground">Observações do admin</p>
                  <p className="text-xs text-foreground/80 italic bg-muted/40 p-2 rounded">{detailsReq.adminNotes}</p>
                </div>
              )}

              {detailsReq.activationLink && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-foreground">Link de ativação</p>
                  <a
                    href={detailsReq.activationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline break-all"
                  >
                    {detailsReq.activationLink}
                  </a>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)} className="w-full">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
