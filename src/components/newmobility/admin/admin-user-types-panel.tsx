'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Users, Plus, Edit2, Trash2, Search, Loader2, Shield, AlertTriangle,
  Smartphone, Car, Bike, User, Store, Accessibility, ChevronUp, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { apiFetch, ApiError } from '@/lib/api'

// ============================================================================
// AdminUserTypesPanel — full CRUD UI for the UserType table.
// ----------------------------------------------------------------------------
// Lets the admin create / edit / delete / reorder user types (qualifications).
// Each type carries:
//   - code + label + description (the type itself)
//   - default matrix levels (entrada/residual/vendas) applied to new users
//   - showDriverGoals flag (controls backoffice "Metas" card visibility)
//   - mobilePermissions (JSON array of feature keys for the /mobile/* app)
//   - color + icon (optional, for badges)
// ============================================================================

interface UserType {
  id: string
  code: string
  label: string
  description: string | null
  isActive: boolean
  sortOrder: number
  defaultEntradaLevel: number
  defaultResidualLevel: number
  defaultVendasLevel: number
  showDriverGoals: boolean
  mobilePermissions: string
  color: string | null
  icon: string | null
  createdAt: string
  updatedAt: string
}

// Suggested mobile permission keys — these match the feature gates we'll
// build into the /mobile/* skeleton. The admin can add/remove freely.
const MOBILE_PERMISSION_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard', icon: Smartphone },
  { value: 'wallet', label: 'Carteira', icon: Shield },
  { value: 'ride_request', label: 'Solicitar Corrida', icon: Car },
  { value: 'ride_offer', label: 'Ofertar Corrida', icon: Car },
  { value: 'delivery', label: 'Entregas', icon: Bike },
  { value: 'store', label: 'Loja / Comércio', icon: Store },
  { value: 'cashback', label: 'Cashback', icon: Shield },
  { value: 'career', label: 'Carreira', icon: ChevronUp },
  { value: 'metas', label: 'Metas', icon: ChevronUp },
  { value: 'indicacoes', label: 'Indicações', icon: Users },
  { value: 'marketplace', label: 'Marketplace', icon: Store },
  { value: 'telemedicina', label: 'Telemedicina', icon: Shield },
  { value: 'voucher', label: 'Vouchers', icon: Shield },
  { value: 'support', label: 'Suporte', icon: Shield },
]

const ICON_OPTIONS = ['🚗', '🛵', '👤', '🧓', '♿', '🏪', '🚙', '🚕', '🛻', '🚐', '📦', '💼', '⭐', '👑']

const COLOR_OPTIONS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#f97316', '#06b6d4', '#84cc16', '#ef4444', '#6366f1',
]

interface AdminUserTypesPanelProps {
  adminUserId: string
}

export function AdminUserTypesPanel({ adminUserId }: AdminUserTypesPanelProps) {
  const [types, setTypes] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<UserType | null>(null)
  const [formData, setFormData] = useState({
    code: '', label: '', description: '',
    isActive: true, sortOrder: 99,
    defaultEntradaLevel: 0, defaultResidualLevel: 0, defaultVendasLevel: 0,
    showDriverGoals: false,
    mobilePermissions: [] as string[],
    color: '#10b981', icon: '👤',
  })

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<UserType | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadTypes = useCallback(async () => {
    if (!adminUserId) return
    setLoading(true)
    try {
      const data = await apiFetch<{ types: UserType[] }>(
        `/admin/user-types?userId=${adminUserId}`,
      )
      setTypes(data?.types || [])
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao carregar tipos'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [adminUserId])

  useEffect(() => {
    loadTypes()
  }, [loadTypes])

  const openCreate = () => {
    setEditingType(null)
    setFormData({
      code: '', label: '', description: '',
      isActive: true, sortOrder: types.length + 1,
      defaultEntradaLevel: 0, defaultResidualLevel: 0, defaultVendasLevel: 0,
      showDriverGoals: false,
      mobilePermissions: ['dashboard', 'wallet'],
      color: '#10b981', icon: '👤',
    })
    setDialogOpen(true)
  }

  const openEdit = (t: UserType) => {
    setEditingType(t)
    let perms: string[] = []
    try {
      perms = JSON.parse(t.mobilePermissions || '[]')
    } catch {
      perms = []
    }
    setFormData({
      code: t.code,
      label: t.label,
      description: t.description || '',
      isActive: t.isActive,
      sortOrder: t.sortOrder,
      defaultEntradaLevel: t.defaultEntradaLevel,
      defaultResidualLevel: t.defaultResidualLevel,
      defaultVendasLevel: t.defaultVendasLevel,
      showDriverGoals: t.showDriverGoals,
      mobilePermissions: perms,
      color: t.color || '#10b981',
      icon: t.icon || '👤',
    })
    setDialogOpen(true)
  }

  const togglePermission = (perm: string) => {
    setFormData((f) => ({
      ...f,
      mobilePermissions: f.mobilePermissions.includes(perm)
        ? f.mobilePermissions.filter((p) => p !== perm)
        : [...f.mobilePermissions, perm],
    }))
  }

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.label.trim()) {
      toast.error('Código e Nome são obrigatórios')
      return
    }
    // Normalize code: lowercase, no spaces, only a-z 0-9 _
    const normalizedCode = formData.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if (normalizedCode !== formData.code.trim()) {
      setFormData((f) => ({ ...f, code: normalizedCode }))
      toast.info('Código normalizado para: ' + normalizedCode)
      return
    }
    setSaving(true)
    try {
      const payload = {
        userId: adminUserId,
        code: normalizedCode,
        label: formData.label.trim(),
        description: formData.description.trim() || null,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 99,
        defaultEntradaLevel: Number(formData.defaultEntradaLevel) || 0,
        defaultResidualLevel: Number(formData.defaultResidualLevel) || 0,
        defaultVendasLevel: Number(formData.defaultVendasLevel) || 0,
        showDriverGoals: formData.showDriverGoals,
        mobilePermissions: JSON.stringify(formData.mobilePermissions),
        color: formData.color,
        icon: formData.icon,
      }
      if (editingType) {
        await apiFetch(`/admin/user-types/${editingType.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        toast.success('Tipo de usuário atualizado!')
      } else {
        await apiFetch('/admin/user-types', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Tipo de usuário criado!')
      }
      setDialogOpen(false)
      loadTypes()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao salvar tipo'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch(`/admin/user-types/${deleteTarget.id}?userId=${adminUserId}`, {
        method: 'DELETE',
      })
      toast.success(`Tipo "${deleteTarget.label}" excluído`)
      setDeleteTarget(null)
      loadTypes()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao excluir tipo'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const moveType = async (t: UserType, direction: 'up' | 'down') => {
    const sorted = [...types].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex((x) => x.id === t.id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === sorted.length - 1) return
    const swapWith = sorted[direction === 'up' ? idx - 1 : idx + 1]
    // Swap sortOrders
    try {
      await Promise.all([
        apiFetch(`/admin/user-types/${t.id}`, {
          method: 'PUT',
          body: JSON.stringify({ userId: adminUserId, sortOrder: swapWith.sortOrder }),
        }),
        apiFetch(`/admin/user-types/${swapWith.id}`, {
          method: 'PUT',
          body: JSON.stringify({ userId: adminUserId, sortOrder: t.sortOrder }),
        }),
      ])
      loadTypes()
    } catch {
      toast.error('Erro ao reordenar')
    }
  }

  const filtered = types
    .filter((t) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        t.code.toLowerCase().includes(q) ||
        t.label.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Tipos de Usuário
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os tipos de conta (Motorista, Passageiro, Comércio, etc.) e as permissões do app mobile
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Tipo
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, nome ou descrição..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Types grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-muted-foreground">Carregando tipos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Nenhum tipo encontrado' : 'Nenhum tipo cadastrado ainda'}
            </p>
            <Button onClick={openCreate} variant="outline" className="mt-3 gap-2">
              <Plus className="h-4 w-4" />
              Criar primeiro tipo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t, idx) => {
            let perms: string[] = []
            try {
              perms = JSON.parse(t.mobilePermissions || '[]')
            } catch {
              perms = []
            }
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className={`shadow-sm hover:shadow-md transition-shadow ${!t.isActive ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                          style={{ backgroundColor: (t.color || '#10b981') + '20' }}
                        >
                          {t.icon || '👤'}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-bold text-foreground truncate">
                            {t.label}
                          </CardTitle>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{t.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => moveType(t, 'up')}
                          disabled={idx === 0}
                          title="Mover para cima"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => moveType(t, 'down')}
                          disabled={idx === filtered.length - 1}
                          title="Mover para baixo"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    )}

                    {/* Flags */}
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant={t.isActive ? 'default' : 'secondary'}
                        className={`text-[10px] ${t.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : ''}`}
                      >
                        {t.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {t.showDriverGoals && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Car className="h-2.5 w-2.5" /> Vê Metas
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        Ordem: {t.sortOrder}
                      </Badge>
                    </div>

                    {/* Matrix levels */}
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <div className="rounded bg-muted/50 p-1.5 text-center">
                        <p className="text-muted-foreground">Entrada</p>
                        <p className="font-bold text-foreground">{t.defaultEntradaLevel}</p>
                      </div>
                      <div className="rounded bg-muted/50 p-1.5 text-center">
                        <p className="text-muted-foreground">Residual</p>
                        <p className="font-bold text-foreground">{t.defaultResidualLevel}</p>
                      </div>
                      <div className="rounded bg-muted/50 p-1.5 text-center">
                        <p className="text-muted-foreground">Vendas</p>
                        <p className="font-bold text-foreground">{t.defaultVendasLevel}</p>
                      </div>
                    </div>

                    {/* Mobile permissions */}
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Smartphone className="h-2.5 w-2.5" />
                        Permissões Mobile ({perms.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {perms.slice(0, 4).map((p) => (
                          <Badge key={p} variant="outline" className="text-[9px] px-1 py-0">
                            {p}
                          </Badge>
                        ))}
                        {perms.length > 4 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            +{perms.length - 4}
                          </Badge>
                        )}
                        {perms.length === 0 && (
                          <span className="text-[10px] text-muted-foreground/50">Nenhuma</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1 border-t">
                      <Button
                        variant="outline" size="sm"
                        className="flex-1 gap-1.5 h-8 text-xs"
                        onClick={() => openEdit(t)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              {editingType ? 'Editar Tipo de Usuário' : 'Novo Tipo de Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Edite as informações e permissões deste tipo de usuário.'
                : 'Crie um novo tipo de conta. Usuários deste tipo herdam as configurações abaixo.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                  placeholder="ex: motorista, lojista, parceiro"
                  disabled={!!editingType}
                  className="h-9 font-mono text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Apenas letras minúsculas, números e _. Usado como referência no banco.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData((f) => ({ ...f, label: e.target.value }))}
                  placeholder="ex: Motorista"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descreva o que este tipo de usuário pode fazer..."
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Visual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ícone</Label>
                <div className="flex flex-wrap gap-1">
                  {ICON_OPTIONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, icon: ic }))}
                      className={`h-8 w-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                        formData.icon === ic
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 ring-2 ring-emerald-500'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cor</Label>
                <div className="flex flex-wrap gap-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, color: c }))}
                      className={`h-8 w-8 rounded-lg transition-all ${
                        formData.color === c ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Matrix levels */}
            <div>
              <Label className="text-xs font-semibold">Níveis Padrão de Matriz</Label>
              <p className="text-[10px] text-muted-foreground mb-2">
                Aplicados automaticamente quando o admin cria um usuário deste tipo (podem ser sobrescritos por usuário).
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Entrada</Label>
                  <Input
                    type="number" min={0} max={5}
                    value={formData.defaultEntradaLevel}
                    onChange={(e) => setFormData((f) => ({ ...f, defaultEntradaLevel: Number(e.target.value) }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Residual</Label>
                  <Input
                    type="number" min={0} max={7}
                    value={formData.defaultResidualLevel}
                    onChange={(e) => setFormData((f) => ({ ...f, defaultResidualLevel: Number(e.target.value) }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Vendas</Label>
                  <Input
                    type="number" min={0} max={9}
                    value={formData.defaultVendasLevel}
                    onChange={(e) => setFormData((f) => ({ ...f, defaultVendasLevel: Number(e.target.value) }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Flags */}
            <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs font-semibold">Tipo ativo</Label>
                  <p className="text-[10px] text-muted-foreground">Tipos inativos não aparecem no cadastro nem no perfil.</p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData((f) => ({ ...f, isActive: v }))}
                />
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    Vê card "Metas"
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Usuários deste tipo verão o card de Metas (Motorista/Entregador) no backoffice.
                  </p>
                </div>
                <Switch
                  checked={formData.showDriverGoals}
                  onCheckedChange={(v) => setFormData((f) => ({ ...f, showDriverGoals: v }))}
                />
              </div>
            </div>

            {/* Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ordem de exibição</Label>
                <Input
                  type="number" min={1}
                  value={formData.sortOrder}
                  onChange={(e) => setFormData((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Mobile permissions */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                Permissões do App Mobile
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Quais funcionalidades do app mobile (/mobile/login, /mobile/inicio) este tipo pode acessar.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 rounded-lg border border-border p-2.5 bg-muted/20">
                {MOBILE_PERMISSION_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const checked = formData.mobilePermissions.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => togglePermission(opt.value)}
                      className={`flex items-center gap-1.5 p-1.5 rounded-md text-xs transition-colors text-left ${
                        checked
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : 'hover:bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              {formData.mobilePermissions.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {formData.mobilePermissions.length} permissão(ões) selecionada(s): {formData.mobilePermissions.join(', ')}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  {editingType ? 'Salvar Alterações' : 'Criar Tipo'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Excluir Tipo de Usuário
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o tipo <strong>{deleteTarget?.label}</strong> ({deleteTarget?.code})?
              <br />
              <span className="text-[11px] text-amber-600 mt-2 block">
                ⚠️ A exclusão será bloqueada se existirem usuários usando este tipo. Reatribua-os primeiro.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
