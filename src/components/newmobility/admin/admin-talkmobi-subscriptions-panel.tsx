'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Smartphone, CheckCircle2, XCircle, Clock, RefreshCw, Loader2,
  ExternalLink, User, Phone, Mail, FileText, Search, MapPin,
  Gift, Star, Wifi, ClipboardCheck,
} from 'lucide-react'

import { useStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'

import { Card, CardContent } from '@/components/ui/card'
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

interface TalkMobiSubscriptionDTO {
  id: string
  userId: string
  planId: string
  planName: string
  dataAmount: string
  priceCents: number
  cashbackCents: number
  rewardPoints: number
  fullName: string
  cpf: string
  birthDate: string | null
  phone: string
  email: string
  zipCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
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
  requests: TalkMobiSubscriptionDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ---------- Component ----------

export function AdminTalkMobiSubscriptionsPanel() {
  const { user } = useStore()
  const adminId = user?.id ?? ''

  const [requests, setRequests] = useState<TalkMobiSubscriptionDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [search, setSearch] = useState('')

  // Action dialog state (approve / reject)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionMode, setActionMode] = useState<'approve' | 'reject'>('approve')
  const [activeRequest, setActiveRequest] = useState<TalkMobiSubscriptionDTO | null>(null)
  const [activationLink, setActivationLink] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Detail dialog (read-only)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsReq, setDetailsReq] = useState<TalkMobiSubscriptionDTO | null>(null)

  const load = useCallback(async () => {
    if (!adminId) {
      setLoading(false)
      return
    }
    try {
      const data = await apiFetch<ListResponse>(`/admin/talkmobi-subscriptions?userId=${adminId}&status=${statusFilter}&pageSize=50`)
      setRequests(data.requests || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar pedidos de assinatura')
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

  const openApprove = (req: TalkMobiSubscriptionDTO) => {
    setActiveRequest(req)
    setActionMode('approve')
    setActivationLink(req.activationLink || '')
    setAdminNotes(req.adminNotes || '')
    setActionDialogOpen(true)
  }

  const openReject = (req: TalkMobiSubscriptionDTO) => {
    setActiveRequest(req)
    setActionMode('reject')
    setActivationLink('')
    setAdminNotes(req.adminNotes || '')
    setActionDialogOpen(true)
  }

  const submitAction = async () => {
    if (!activeRequest) return
    if (actionMode === 'reject' && !adminNotes.trim()) {
      toast.error('Informe o motivo da recusa.')
      return
    }
    setActionLoading(true)
    try {
      const endpoint = actionMode === 'approve' ? 'approve' : 'reject'
      await apiFetch(`/admin/talkmobi-subscriptions/${activeRequest.id}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({
          adminId,
          activationLink: actionMode === 'approve' ? activationLink.trim() || undefined : undefined,
          adminNotes: adminNotes.trim() || undefined,
        }),
      })
      toast.success(actionMode === 'approve' ? 'Assinatura aprovada e usuário notificado!' : 'Assinatura recusada e usuário notificado.')
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
      r.planName.toLowerCase().includes(q) ||
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
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            Assinaturas TalkMobi
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receba e aprove os pedidos de assinatura dos planos de celular TalkMobi
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
            placeholder="Buscar por nome, e-mail, CPF ou plano..."
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
            <Smartphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">Nenhum pedido de assinatura encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter === 'pending'
                ? 'Não há pedidos pendentes no momento. Quando um cliente solicitar um plano TalkMobi, ele aparecerá aqui.'
                : 'Não há pedidos com o filtro selecionado.'}
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
                    {/* Left: subscription info */}
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
                        <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                          <Wifi className="h-3 w-3" />
                          {req.planName} · {req.dataAmount}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1 font-bold">
                          {formatCurrency(req.priceCents)}/mês
                        </Badge>
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
                            <User className="h-3 w-3 shrink-0" />
                            Nasc.: {new Date(req.birthDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>

                      {/* Plan extras: cashback + reward points snapshot */}
                      {(req.cashbackCents > 0 || req.rewardPoints > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {req.cashbackCents > 0 && (
                            <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                              <Gift className="h-3 w-3" />
                              {formatCurrency(req.cashbackCents)} cashback
                            </Badge>
                          )}
                          {req.rewardPoints > 0 && (
                            <Badge variant="outline" className="text-[10px] gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                              <Star className="h-3 w-3" />
                              +{req.rewardPoints} pontos
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Shipping address (if provided) */}
                      {req.street && req.city && (
                        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                          <span>
                            {req.street}, {req.number}{req.complement ? ` - ${req.complement}` : ''}
                            {req.district ? ` - ${req.district}` : ''}
                            {' — '}{req.city}/{req.state || ''}
                            {req.zipCode ? ` · CEP ${req.zipCode}` : ''}
                          </span>
                        </p>
                      )}

                      {req.user && (
                        <p className="text-[11px] text-muted-foreground">
                          Conta: <span className="font-medium text-foreground">{req.user.name}</span> ({req.user.email})
                          {req.user.referralCode && ` · Código: ${req.user.referralCode}`}
                        </p>
                      )}

                      {req.notes && (
                        <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2 rounded">
                          Obs.: {req.notes}
                        </p>
                      )}

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

      {/* ===== Action Dialog (approve / reject) ===== */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionMode === 'approve' ? (
                <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Aprovar Assinatura</>
              ) : (
                <><XCircle className="h-5 w-5 text-rose-600" /> Recusar Assinatura</>
              )}
            </DialogTitle>
            <DialogDescription>
              {activeRequest && (
                <>
                  {actionMode === 'approve'
                    ? `Aprovar o pedido de ${activeRequest.fullName} para o plano ${activeRequest.planName} (${activeRequest.dataAmount}). O usuário será notificado.`
                    : `Recusar o pedido de ${activeRequest.fullName} para o plano ${activeRequest.planName}. O usuário será notificado e poderá corrigir os dados.`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {actionMode === 'approve' && (
              <div className="space-y-1.5">
                <Label htmlFor="activation-link" className="text-xs font-semibold">
                  Link / ICCID / Instruções de ativação
                </Label>
                <Input
                  id="activation-link"
                  value={activationLink}
                  onChange={(e) => setActivationLink(e.target.value)}
                  placeholder="Ex: https://ativacao.talkmobi.com/abc123 ou ICCID 8955..."
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Cole aqui o link de ativação, código ICCID do chip, QR code eSIM ou qualquer instrução que o usuário precisará ver. O usuário verá isso na página TalkMobi.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="admin-notes" className="text-xs font-semibold">
                {actionMode === 'approve' ? 'Observações (opcional)' : 'Motivo da recusa *'}
              </Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={actionMode === 'approve' ? 'Ex: Chip enviado via Sedex, prazo de 5 dias úteis...' : 'Ex: CPF inválido. Por favor corrija e reenvie.'}
                className="text-sm min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button
              onClick={submitAction}
              disabled={actionLoading || (actionMode === 'reject' && !adminNotes.trim())}
              className={
                actionMode === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5'
                  : 'bg-rose-600 hover:bg-rose-700 text-white gap-1.5'
              }
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {actionMode === 'approve' ? 'Aprovar e notificar' : 'Recusar e notificar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Details Dialog (read-only) ===== */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              Detalhes do Pedido
            </DialogTitle>
            <DialogDescription>
              Informações completas do pedido de assinatura TalkMobi
            </DialogDescription>
          </DialogHeader>

          {detailsReq && (
            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <DetailField label="Titular" value={detailsReq.fullName} />
                <DetailField label="CPF" value={detailsReq.cpf} />
                <DetailField label="E-mail" value={detailsReq.email} />
                <DetailField label="Telefone" value={detailsReq.phone} />
                {detailsReq.birthDate && (
                  <DetailField label="Nascimento" value={new Date(detailsReq.birthDate).toLocaleDateString('pt-BR')} />
                )}
              </div>

              <div className="border-t pt-3">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">Plano Solicitado</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <DetailField label="Plano" value={detailsReq.planName} />
                  <DetailField label="Franquia" value={detailsReq.dataAmount} />
                  <DetailField label="Preço/mês" value={formatCurrency(detailsReq.priceCents)} />
                  {detailsReq.cashbackCents > 0 && (
                    <DetailField label="Cashback" value={formatCurrency(detailsReq.cashbackCents)} />
                  )}
                  {detailsReq.rewardPoints > 0 && (
                    <DetailField label="Pontos" value={`${detailsReq.rewardPoints} pts`} />
                  )}
                </div>
              </div>

              {detailsReq.street && (
                <div className="border-t pt-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">Endereço de Entrega do Chip</p>
                  <p className="text-xs text-foreground">
                    {detailsReq.street}, {detailsReq.number}
                    {detailsReq.complement ? ` - ${detailsReq.complement}` : ''}
                    {detailsReq.district ? ` - ${detailsReq.district}` : ''}
                    <br />
                    {detailsReq.city}/{detailsReq.state || ''} · CEP {detailsReq.zipCode || '—'}
                  </p>
                </div>
              )}

              {detailsReq.notes && (
                <div className="border-t pt-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">Observações do Cliente</p>
                  <p className="text-xs text-foreground italic bg-muted/40 p-2 rounded">{detailsReq.notes}</p>
                </div>
              )}

              {detailsReq.adminNotes && (
                <div className="border-t pt-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">Observações do Admin</p>
                  <p className="text-xs text-foreground italic bg-muted/40 p-2 rounded">{detailsReq.adminNotes}</p>
                </div>
              )}

              {detailsReq.activationLink && (
                <div className="border-t pt-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">Link de Ativação Enviado</p>
                  <a
                    href={detailsReq.activationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline break-all flex items-start gap-1.5"
                  >
                    <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                    {detailsReq.activationLink}
                  </a>
                </div>
              )}

              <div className="border-t pt-3 grid grid-cols-2 gap-3 text-xs">
                <DetailField
                  label="Status"
                  value={
                    detailsReq.status === 'approved' ? 'Aprovado' :
                    detailsReq.status === 'pending' ? 'Pendente' :
                    detailsReq.status === 'rejected' ? 'Recusado' : 'Cancelado'
                  }
                />
                <DetailField label="Pedido em" value={detailsReq.createdAt ? new Date(detailsReq.createdAt).toLocaleString('pt-BR') : '—'} />
                {detailsReq.approvedAt && (
                  <DetailField label="Aprovado em" value={new Date(detailsReq.approvedAt).toLocaleString('pt-BR')} />
                )}
                {detailsReq.rejectedAt && (
                  <DetailField label="Recusado em" value={new Date(detailsReq.rejectedAt).toLocaleString('pt-BR')} />
                )}
              </div>

              {detailsReq.user && (
                <div className="border-t pt-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">Conta Vinculada</p>
                  <p className="text-xs text-foreground">
                    {detailsReq.user.name} ({detailsReq.user.email})
                    {detailsReq.user.referralCode && ` · Código: ${detailsReq.user.referralCode}`}
                    {detailsReq.user.plan && ` · Plano: ${detailsReq.user.plan}`}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fechar</Button>
            {detailsReq?.status === 'pending' && (
              <Button
                onClick={() => {
                  setDetailsOpen(false)
                  if (detailsReq) openApprove(detailsReq)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprovar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Helper ----------

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{label}</p>
      <p className="text-xs text-foreground break-words">{value}</p>
    </div>
  )
}
