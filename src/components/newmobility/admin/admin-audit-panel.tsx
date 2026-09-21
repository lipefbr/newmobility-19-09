'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
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
  ScrollArea,
} from '@/components/ui/scroll-area'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Shield,
  Calendar,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'

// ---------- Types ----------

interface AuditLogRow {
  id: string
  adminId: string
  adminName: string | null
  action: string
  targetUserId: string | null
  targetEmail: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
}

interface AuditResponse {
  logs: AuditLogRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ---------- Action metadata ----------

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas as ações' },
  { value: 'user_edit', label: 'Editar Usuário' },
  { value: 'user_view', label: 'Visualizar Usuário' },
  { value: 'user_block', label: 'Bloquear Usuário' },
  { value: 'kyc_approve', label: 'KYC Aprovar' },
  { value: 'kyc_reject', label: 'KYC Rejeitar' },
  { value: 'withdrawal_approve', label: 'Saque Aprovar' },
  { value: 'withdrawal_reject', label: 'Saque Rejeitar' },
  { value: 'login_as', label: 'Entrar como Usuário' },
  { value: 'config_change', label: 'Alterar Configuração' },
  { value: 'voucher_create', label: 'Criar Voucher' },
  { value: 'announcement_create', label: 'Criar Anúncio' },
]

function actionBadge(action: string): { label: string; cls: string } {
  switch (action) {
    case 'user_edit':
      return { label: 'Editar Usuário', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }
    case 'user_view':
      return { label: 'Visualizar', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
    case 'user_block':
      return { label: 'Bloquear', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
    case 'kyc_approve':
      return { label: 'KYC ✓', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
    case 'kyc_reject':
      return { label: 'KYC ✗', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
    case 'withdrawal_approve':
      return { label: 'Saque ✓', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
    case 'withdrawal_reject':
      return { label: 'Saque ✗', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
    case 'login_as':
      return { label: 'Login como', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
    case 'config_change':
      return { label: 'Config', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' }
    case 'voucher_create':
      return { label: 'Voucher', cls: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' }
    case 'announcement_create':
      return { label: 'Anúncio', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' }
    default:
      return { label: action, cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ---------- Component ----------

export function AdminAuditPanel() {
  const { user } = useStore()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AuditResponse | null>(null)

  const [action, setAction] = useState('all')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        userId: user.id,
        page: String(page),
        limit: String(limit),
      })
      if (action !== 'all') params.set('action', action)
      if (search) params.set('search', search)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await apiFetch<AuditResponse>(`/admin/audit?${params}`)
      setData(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar logs')
    } finally {
      setLoading(false)
    }
  }, [user?.id, page, action, search, startDate, endDate])

  useEffect(() => {
    load()
  }, [load])

  const handleExport = () => {
    if (!data?.logs?.length) {
      toast.info('Nenhum log para exportar')
      return
    }
    const headers = ['Data/Hora', 'Admin', 'Ação', 'Usuário Alvo', 'Email Alvo', 'Detalhes', 'IP']
    const rows = data.logs.map((l) => [
      formatDateTime(l.createdAt),
      l.adminName || l.adminId,
      l.action,
      l.targetUserId || '',
      l.targetEmail || '',
      l.details || '',
      l.ipAddress || '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por admin, email ou detalhe..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={action} onValueChange={(v) => { setAction(v); setPage(1) }}>
              <SelectTrigger className="w-full lg:w-[220px]"><SelectValue placeholder="Todas as ações" /></SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                className="w-[150px]"
                aria-label="Data inicial"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                className="w-[150px]"
                aria-label="Data final"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de logs</p>
              <p className="text-xl font-bold text-foreground">{data?.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Filter className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ação selecionada</p>
              <p className="text-sm font-semibold text-foreground">
                {ACTION_OPTIONS.find((a) => a.value === action)?.label || 'Todas'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Página</p>
              <p className="text-sm font-semibold text-foreground">
                {data ? `${page}/${data.totalPages}` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Itens por página</p>
              <p className="text-sm font-semibold text-foreground">{limit}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">Data/Hora</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">Admin</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3">Ação</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden md:table-cell">Alvo</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden lg:table-cell">Detalhes</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-3 hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                        <span className="h-4 w-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                        Carregando logs...
                      </div>
                    </td>
                  </tr>
                ) : data?.logs && data.logs.length > 0 ? (
                  data.logs.map((l) => {
                    const b = actionBadge(l.action)
                    return (
                      <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <p className="text-xs font-medium text-foreground">{formatDateTime(l.createdAt)}</p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm font-medium text-foreground">{l.adminName || '—'}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{l.adminId}</p>
                        </td>
                        <td className="p-3">
                          <Badge className={b.cls}>{b.label}</Badge>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {l.targetEmail ? (
                            <>
                              <p className="text-sm text-foreground truncate max-w-[180px]">{l.targetEmail}</p>
                              {l.targetUserId && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{l.targetUserId}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <p className="text-xs text-foreground max-w-[320px] line-clamp-2">{l.details || '—'}</p>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground font-mono">{l.ipAddress || '—'}</span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum log de auditoria encontrado</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Ações administrativas aparecerão aqui automaticamente.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{data.total} logs</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground">{page}/{data.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
