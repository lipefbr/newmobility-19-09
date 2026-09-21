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
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { USER_TYPES } from './admin-users-panel'
import { formatDateTime } from '@/lib/utils'

// ---------- Types ----------

interface Announcement {
  id: string
  title: string
  message: string
  type: string
  priority: string
  isActive: boolean
  startDate: string | null
  endDate: string | null
  actionLabel: string | null
  actionUrl: string | null
  targetUserTypes: string | null
  showAsPopup: boolean
  createdAt: string
  updatedAt: string
}

interface FormData {
  title: string
  message: string
  type: string
  priority: string
  isActive: boolean
  showAsPopup: boolean
  actionLabel: string
  actionUrl: string
  startDate: string
  endDate: string
  targetUserTypes: string[]
}

const EMPTY_FORM: FormData = {
  title: '',
  message: '',
  type: 'info',
  priority: 'normal',
  isActive: true,
  showAsPopup: false,
  actionLabel: '',
  actionUrl: '',
  startDate: '',
  endDate: '',
  targetUserTypes: [],
}

const TYPE_BADGE: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

function userTypeBadgeCls(value: string): string {
  const t = USER_TYPES.find((x) => x.value === value)
  return t?.color || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

function userTypeLabel(value: string): string {
  return USER_TYPES.find((x) => x.value === value)?.label || value
}

// ---------- Component ----------

export function AdminAnnouncementsPanel() {
  const { user } = useStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [list, setList] = useState<Announcement[]>([])
  const [filterUserType, setFilterUserType] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ userId: user.id })
      if (filterUserType !== 'all') params.set('targetUserType', filterUserType)
      const res = await apiFetch<Announcement[]>(`/admin/announcements?${params}`)
      setList(Array.isArray(res) ? res : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar anúncios')
    } finally {
      setLoading(false)
    }
  }, [user?.id, filterUserType])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditingId(a.id)
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      priority: a.priority,
      isActive: a.isActive,
      showAsPopup: a.showAsPopup,
      actionLabel: a.actionLabel || '',
      actionUrl: a.actionUrl || '',
      startDate: a.startDate ? a.startDate.slice(0, 10) : '',
      endDate: a.endDate ? a.endDate.slice(0, 10) : '',
      targetUserTypes: a.targetUserTypes ? a.targetUserTypes.split(',').map((s) => s.trim()).filter(Boolean) : [],
    })
    setDialogOpen(true)
  }

  const toggleActive = async (a: Announcement) => {
    if (!user?.id) return
    try {
      await apiFetch(`/admin/announcements/${a.id}`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, isActive: !a.isActive }),
      })
      toast.success(a.isActive ? 'Anúncio desativado' : 'Anúncio ativado')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alternar status')
    }
  }

  const handleDelete = async (a: Announcement) => {
    if (!user?.id) return
    if (!confirm(`Excluir o anúncio "${a.title}"?`)) return
    try {
      await apiFetch(`/admin/announcements/${a.id}?userId=${user.id}`, { method: 'DELETE' })
      toast.success('Anúncio excluído')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir anúncio')
    }
  }

  const handleSave = async () => {
    if (!user?.id) return
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Título e mensagem são obrigatórios')
      return
    }
    setSaving(true)
    try {
      const body = {
        userId: user.id,
        title: form.title,
        message: form.message,
        type: form.type,
        priority: form.priority,
        isActive: form.isActive,
        showAsPopup: form.showAsPopup,
        actionLabel: form.actionLabel || null,
        actionUrl: form.actionUrl || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        targetUserTypes: form.targetUserTypes,
      }
      if (editingId) {
        await apiFetch(`/admin/announcements/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
        toast.success('Anúncio atualizado')
      } else {
        await apiFetch('/admin/announcements', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        toast.success('Anúncio criado')
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar anúncio')
    } finally {
      setSaving(false)
    }
  }

  const toggleTargetType = (value: string) => {
    setForm((prev) => {
      const has = prev.targetUserTypes.includes(value)
      const next = has
        ? prev.targetUserTypes.filter((t) => t !== value)
        : [...prev.targetUserTypes, value]
      return { ...prev, targetUserTypes: next }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-emerald-600" />
            Anúncios & Comunicados
          </CardTitle>
          <CardDescription className="text-xs">
            Crie comunicados para toda a plataforma ou segmente por tipo de usuário. Marque
            "Mostrar como popup" para exibir como modal no backoffice na primeira visita.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 pt-0">
          <div className="flex-1 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterUserType} onValueChange={setFilterUserType}>
              <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Todos os públicos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os públicos</SelectItem>
                {USER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button size="sm" className="gap-1.5 text-xs shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Novo Anúncio
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="h-5 w-5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Carregando anúncios...</span>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Megaphone className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum anúncio encontrado</p>
              <p className="text-xs text-muted-foreground/70">Clique em "Novo Anúncio" para criar o primeiro.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {list.map((a) => {
                const types = a.targetUserTypes ? a.targetUserTypes.split(',').map((s) => s.trim()).filter(Boolean) : []
                return (
                  <div key={a.id} className="p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                          <Badge className={TYPE_BADGE[a.type] || TYPE_BADGE.info}>{a.type}</Badge>
                          <Badge className={PRIORITY_BADGE[a.priority] || PRIORITY_BADGE.normal}>{a.priority}</Badge>
                          {a.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Ativo</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inativo</Badge>
                          )}
                          {a.showAsPopup && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Popup</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.message}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] text-muted-foreground uppercase">Público:</span>
                          {types.length === 0 ? (
                            <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px]">Todos</Badge>
                          ) : (
                            types.map((t) => (
                              <Badge key={t} className={`${userTypeBadgeCls(t)} text-[10px]`}>{userTypeLabel(t)}</Badge>
                            ))
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          Criado em {formatDateTime(a.createdAt)} · Atualizado em {formatDateTime(a.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => toggleActive(a)}
                          title={a.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {a.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                          onClick={() => openEdit(a)}
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(a)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-emerald-600" />
              {editingId ? 'Editar Anúncio' : 'Novo Anúncio'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Atualize os campos abaixo.' : 'Preencha os campos para criar um novo comunicado.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input value={form.title} onChange={(e) => setForm((d) => ({ ...d, title: e.target.value }))} placeholder="Título do anúncio" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem *</Label>
              <Textarea value={form.message} onChange={(e) => setForm((d) => ({ ...d, message: e.target.value }))} placeholder="Conteúdo do anúncio..." rows={4} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((d) => ({ ...d, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informação</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((d) => ({ ...d, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target user types */}
            <div className="space-y-1.5">
              <Label className="text-xs">Público-alvo</Label>
              <p className="text-[10px] text-muted-foreground">
                Selecione os tipos de usuário que verão este anúncio. Deixe tudo desmarcado para "Todos".
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-lg border bg-muted/20">
                {USER_TYPES.map((t) => (
                  <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={form.targetUserTypes.includes(t.value)}
                      onCheckedChange={() => toggleTargetType(t.value)}
                    />
                    <span className="text-xs">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Show as popup */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-xs">Mostrar como popup</Label>
                <p className="text-[10px] text-muted-foreground">Exibe o anúncio como modal no backoffice na primeira visita do usuário.</p>
              </div>
              <Switch checked={form.showAsPopup} onCheckedChange={(v) => setForm((d) => ({ ...d, showAsPopup: v }))} />
            </div>

            {/* Active switch */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="text-xs">Ativo</Label>
                <p className="text-[10px] text-muted-foreground">Se desligado, o anúncio não será exibido para os usuários.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((d) => ({ ...d, isActive: v }))} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Início (opcional)</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((d) => ({ ...d, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fim (opcional)</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((d) => ({ ...d, endDate: e.target.value }))} />
              </div>
            </div>

            {/* Action */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Botão (rótulo)</Label>
                <Input value={form.actionLabel} onChange={(e) => setForm((d) => ({ ...d, actionLabel: e.target.value }))} placeholder="Saiba mais" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL do botão</Label>
                <Input value={form.actionUrl} onChange={(e) => setForm((d) => ({ ...d, actionUrl: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Salvar' : 'Criar Anúncio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
