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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle2,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  IdCard,
  MapPin,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

// ---------- Types ----------

type KycStatus = 'none' | 'pending' | 'approved' | 'rejected'
type DocStatus = 'pending' | 'approved' | 'rejected'

interface AdminKycDocument {
  id: string
  docType: string
  fileUrl: string
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  status: DocStatus
  rejectReason: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

interface AdminKycUser {
  id: string
  name: string
  email: string
  cpf: string | null
  phone: string | null
  plan: string
  kycStatus: KycStatus
  kycVerifiedAt: string | null
  kycRejectedReason: string | null
  kycVerifiedById: string | null
  updatedAt: string
  createdAt: string
  uploadedCount: number
  documents: AdminKycDocument[]
}

interface AdminKycResponse {
  users: AdminKycUser[]
  total: number
  page: number
  totalPages: number
  stats: {
    pendingCount: number
    approvedToday: number
    rejectedToday: number
  }
}

type TabKey = 'pending' | 'approved' | 'rejected'

const PAGE_SIZE = 10

// ---------- Doc type labels (mirrors src/lib/kyc.ts KYC_DOC_LABELS) ----------

const DOC_LABELS: Record<string, { label: string; Icon: typeof IdCard }> = {
  cnh_front: { label: 'CNH Frente', Icon: IdCard },
  cnh_back: { label: 'CNH Verso', Icon: IdCard },
  rg_front: { label: 'RG Frente', Icon: FileText },
  rg_back: { label: 'RG Verso', Icon: FileText },
  proof_address: { label: 'Comprovante', Icon: MapPin },
}

// ---------- Status badge helpers ----------

function KycStatusBadge({ status }: { status: KycStatus }) {
  if (status === 'approved') {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Aprovado
      </Badge>
    )
  }
  if (status === 'pending') {
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-800">
        <Clock className="h-3 w-3" /> Pendente
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge className="border-transparent bg-red-100 text-red-800">
        <XCircle className="h-3 w-3" /> Rejeitado
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-gray-100 text-gray-600">
      Não enviado
    </Badge>
  )
}

// ---------- Doc thumbnail ----------

function DocThumbnail({ doc }: { doc: AdminKycDocument }) {
  const meta = DOC_LABELS[doc.docType] ?? { label: doc.docType, Icon: FileText }
  const Icon = meta.Icon
  const isImage =
    doc.mimeType?.startsWith('image/') ?? doc.fileUrl.startsWith('data:image/')

  return (
    <a
      href={doc.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`${meta.label} · tocar para abrir`}
      className="group block overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
    >
      {isImage ? (
        <img
          src={doc.fileUrl}
          alt={meta.label}
          className="h-24 w-full object-cover transition group-hover:opacity-90"
        />
      ) : (
        <div className="flex h-24 w-full flex-col items-center justify-center gap-1 text-gray-600">
          <FileText className="h-6 w-6" />
          <span className="text-[10px] font-medium">PDF</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-1 border-t border-gray-100 px-2 py-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700">
          <Icon className="h-3 w-3" /> {meta.label}
        </span>
        {doc.status === 'approved' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        ) : doc.status === 'rejected' ? (
          <XCircle className="h-3.5 w-3.5 text-red-600" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-amber-600" />
        )}
      </div>
    </a>
  )
}

// ---------- Stat cards ----------

function StatCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string
  value: number
  Icon: typeof Clock
  tone: 'amber' | 'emerald' | 'red'
}) {
  const toneClasses =
    tone === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : tone === 'emerald'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
        : 'bg-red-50 border-red-200 text-red-900'
  const iconBg =
    tone === 'amber'
      ? 'bg-amber-100 text-amber-700'
      : tone === 'emerald'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-red-100 text-red-700'
  return (
    <Card className={cn('rounded-2xl shadow-sm', toneClasses)}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn('rounded-full p-2.5', iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs opacity-80">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- User card ----------

interface UserCardProps {
  u: AdminKycUser
  onApprove: (u: AdminKycUser) => Promise<void>
  onReject: (u: AdminKycUser, reason: string) => Promise<void>
  approving: boolean
}

function UserCard({ u, onApprove, onReject, approving }: UserCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const docs = u.documents ?? []

  async function handleApproveClick() {
    await onApprove(u)
  }

  async function handleRejectConfirm() {
    if (!reason.trim()) {
      toast.error('Informe o motivo da rejeição')
      return
    }
    setRejecting(true)
    try {
      await onReject(u, reason.trim())
      setDialogOpen(false)
      setReason('')
    } finally {
      setRejecting(false)
    }
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-base">{u.name}</CardTitle>
            <CardDescription className="text-xs">
              {u.email}
              {u.cpf ? ` · CPF ${u.cpf}` : ''}
              {u.phone ? ` · ${u.phone}` : ''}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <KycStatusBadge status={u.kycStatus} />
            <span className="text-[10px] text-muted-foreground">
              {u.uploadedCount}/5 enviados
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Rejection reason banner */}
        {u.kycStatus === 'rejected' && u.kycRejectedReason && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <span className="font-semibold">Motivo da rejeição: </span>
            {u.kycRejectedReason}
          </div>
        )}

        {/* Document thumbnails */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {docs.length > 0 ? (
            docs.map((d) => <DocThumbnail key={d.id} doc={d} />)
          ) : (
            <div className="col-span-full flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-muted-foreground">
              Nenhum documento enviado
            </div>
          )}
        </div>

        {/* Actions */}
        {u.kycStatus === 'pending' && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={approving || rejecting}
              onClick={handleApproveClick}
            >
              {approving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Aprovando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Aprovar
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              disabled={approving || rejecting}
              onClick={() => setDialogOpen(true)}
            >
              <XCircle className="h-4 w-4" /> Rejeitar
            </Button>
          </div>
        )}
      </CardContent>

      {/* Reject dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar KYC de {u.name}?</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O usuário poderá reenviar os
              documentos após receber esta justificativa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Motivo</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Foto do documento está ilegível. Reenvie com melhor qualidade."
              rows={4}
              maxLength={1000}
            />
            <p className="text-right text-xs text-muted-foreground">
              {reason.length}/1000
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDialogOpen(false)}
              disabled={rejecting}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
              onClick={handleRejectConfirm}
              disabled={rejecting || !reason.trim()}
            >
              {rejecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Rejeitando…
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" /> Confirmar rejeição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ---------- Main panel ----------

export default function AdminKycPanel() {
  const user = useStore((s) => s.user)
  const adminUserId = user?.id

  const [tab, setTab] = useState<TabKey>('pending')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [data, setData] = useState<AdminKycResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    if (!adminUserId) {
      setLoading(false)
      setError('Sessão de administrador não encontrada.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        userId: adminUserId,
        status: tab,
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/admin/kyc?${params.toString()}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(
          (json as { error?: string })?.error || 'Falha ao carregar KYC'
        )
      }
      setData(json as AdminKycResponse)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao carregar KYC'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [adminUserId, tab, page, search])

  useEffect(() => {
    if (adminUserId) loadList()
    else setLoading(false)
  }, [tab, page, adminUserId])

  // Debounced search reload
  useEffect(() => {
    if (!adminUserId) return
    const t = setTimeout(() => {
      if (page !== 1) setPage(1)
      else loadList()
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  async function handleApprove(u: AdminKycUser) {
    if (!adminUserId) return
    setApprovingId(u.id)
    try {
      const res = await fetch(
        `/api/admin/kyc/${encodeURIComponent(u.id)}/approve?userId=${encodeURIComponent(adminUserId)}`,
        { method: 'POST' }
      )
      const json = await res.json()
      if (!res.ok) {
        throw new Error(
          (json as { error?: string })?.error || 'Falha ao aprovar KYC'
        )
      }
      toast.success(`KYC de ${u.name} aprovado.`)
      await loadList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao aprovar KYC'
      toast.error(msg)
    } finally {
      setApprovingId(null)
    }
  }

  async function handleReject(u: AdminKycUser, reason: string) {
    if (!adminUserId) return
    setRejectingId(u.id)
    try {
      const res = await fetch(
        `/api/admin/kyc/${encodeURIComponent(u.id)}/reject?userId=${encodeURIComponent(adminUserId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        throw new Error(
          (json as { error?: string })?.error || 'Falha ao rejeitar KYC'
        )
      }
      toast.success(`KYC de ${u.name} rejeitado.`)
      await loadList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao rejeitar KYC'
      toast.error(msg)
    } finally {
      setRejectingId(null)
    }
  }

  // Not admin / not logged in
  if (!adminUserId) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="rounded-full bg-gray-100 p-3">
            <AlertCircle className="h-6 w-6 text-gray-500" />
          </div>
          <p className="font-semibold text-gray-800">Acesso restrito</p>
          <p className="text-sm text-muted-foreground">
            Faça login como administrador para revisar KYCs.
          </p>
        </CardContent>
      </Card>
    )
  }

  const stats = data?.stats
  const users = data?.users ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">Aprovação de KYC</h1>
        <p className="text-sm text-muted-foreground">
          Revise e aprove os documentos enviados pelos usuários.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Pendentes"
          value={stats?.pendingCount ?? 0}
          Icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Aprovados hoje"
          value={stats?.approvedToday ?? 0}
          Icon={ShieldCheck}
          tone="emerald"
        />
        <StatCard
          label="Rejeitados hoje"
          value={stats?.rejectedToday ?? 0}
          Icon={XCircle}
          tone="red"
        />
      </div>

      {/* Tabs + search */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="approved">Aprovados</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou CPF…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={loadList}
              disabled={loading}
              title="Recarregar"
              aria-label="Recarregar"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-gray-100 p-3">
              <Eye className="h-6 w-6 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700">
              {tab === 'pending'
                ? 'Nenhum KYC pendente'
                : tab === 'approved'
                  ? 'Nenhum KYC aprovado'
                  : 'Nenhum KYC rejeitado'}
            </p>
            <p className="text-sm text-muted-foreground">
              {search
                ? 'Tente limpar a busca ou trocar de aba.'
                : 'Quando houver novos envios nesta categoria, eles aparecerão aqui.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <UserCard
              key={u.id}
              u={u}
              onApprove={handleApprove}
              onReject={(target, reason) => handleReject(target, reason)}
              approving={approvingId === u.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {total} usuário(s)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
