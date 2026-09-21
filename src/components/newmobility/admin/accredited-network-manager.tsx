'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, RefreshCw, Search, Percent, MapPin, Phone,
  Network as NetworkIcon, Building2, Loader2, Store,
} from 'lucide-react'

import { useStore } from '@/lib/store'
import { accreditedNetworkApi } from '@/lib/api'
import { cn } from '@/lib/utils'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ---------- Types ----------
interface Item {
  id: string
  name: string
  category: string
  brand?: string | null
  city: string
  state: string
  address?: string | null
  phone?: string | null
  discountText?: string | null
  cashbackPercent: number
  isActive: boolean
  sortOrder: number
}

interface FormState {
  name: string
  category: string
  brand: string
  city: string
  state: string
  address: string
  phone: string
  discountText: string
  cashbackPercent: string
  isActive: boolean
  sortOrder: string
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'posto', label: 'Posto' },
  { value: 'farmacia', label: 'Farmácia' },
  { value: 'mercado', label: 'Mercado' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'auto', label: 'Automotivo' },
  { value: 'services', label: 'Serviços' },
]

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
)

const EMPTY_FORM: FormState = {
  name: '',
  category: 'posto',
  brand: '',
  city: '',
  state: '',
  address: '',
  phone: '',
  discountText: '',
  cashbackPercent: '0',
  isActive: true,
  sortOrder: '0',
}

export function AccreditedNetworkManager() {
  const { user } = useStore()
  const userId = user?.id ?? ''

  const [items, setItems] = useState<Item[]>([])
  const [availableStates, setAvailableStates] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Active toggle
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchItems = useCallback(
    async (isRefresh = false) => {
      if (!userId) return
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        const res = await accreditedNetworkApi.getItems({ userId })
        setItems(Array.isArray(res.items) ? res.items : [])
        setAvailableStates(Array.isArray(res.states) ? res.states : [])
        setAvailableCategories(Array.isArray(res.categories) ? res.categories : [])
        setAvailableBrands(Array.isArray(res.brands) ? res.brands : [])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao carregar estabelecimentos.'
        toast.error(message)
        setItems([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [userId]
  )

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (stateFilter !== 'all' && it.state !== stateFilter) return false
      if (categoryFilter !== 'all' && it.category !== categoryFilter) return false
      if (brandFilter !== 'all' && (it.brand ?? '') !== brandFilter) return false
      if (!q) return true
      return (
        it.name.toLowerCase().includes(q) ||
        it.city.toLowerCase().includes(q) ||
        (it.brand ?? '').toLowerCase().includes(q) ||
        (it.address ?? '').toLowerCase().includes(q)
      )
    })
  }, [items, search, stateFilter, categoryFilter, brandFilter])

  const stats = useMemo(() => {
    const total = items.length
    const active = items.filter((i) => i.isActive).length
    const statesSet = new Set(items.map((i) => i.state).filter(Boolean))
    return { total, active, inactive: total - active, states: statesSet.size }
  }, [items])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, sortOrder: String(items.length + 1) })
    setDialogOpen(true)
  }

  const openEdit = (it: Item) => {
    setEditing(it)
    setForm({
      name: it.name ?? '',
      category: it.category ?? 'posto',
      brand: it.brand ?? '',
      city: it.city ?? '',
      state: it.state ?? '',
      address: it.address ?? '',
      phone: it.phone ?? '',
      discountText: it.discountText ?? '',
      cashbackPercent: String(it.cashbackPercent ?? 0),
      isActive: it.isActive !== false,
      sortOrder: String(it.sortOrder ?? 0),
    })
    setDialogOpen(true)
  }

  const handleToggleActive = async (it: Item) => {
    if (!userId) return
    setTogglingId(it.id)
    const prev = items
    setItems((arr) =>
      arr.map((x) => (x.id === it.id ? { ...x, isActive: !x.isActive } : x))
    )
    try {
      await accreditedNetworkApi.updateItem(userId, it.id, { isActive: !it.isActive })
      toast.success(it.isActive ? 'Estabelecimento desativado.' : 'Estabelecimento ativado.')
    } catch (err: unknown) {
      setItems(prev)
      const message = err instanceof Error ? err.message : 'Erro ao alterar status.'
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleSave = async () => {
    if (!userId) return
    if (!form.name.trim()) {
      toast.error('Informe o nome do estabelecimento.')
      return
    }
    if (!form.city.trim()) {
      toast.error('Informe a cidade.')
      return
    }
    if (!form.state.trim() || form.state.trim().length < 2) {
      toast.error('Informe a UF (estado) com 2 letras.')
      return
    }
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      brand: form.brand.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      discountText: form.discountText.trim() || undefined,
      cashbackPercent: Math.max(0, Math.min(100, Number(form.cashbackPercent) || 0)),
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    }
    setSaving(true)
    try {
      if (editing) {
        await accreditedNetworkApi.updateItem(userId, editing.id, payload)
        toast.success('Estabelecimento atualizado com sucesso.')
      } else {
        await accreditedNetworkApi.createItem(userId, payload)
        toast.success('Estabelecimento criado com sucesso.')
      }
      setDialogOpen(false)
      fetchItems()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar estabelecimento.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!userId || !deleteTarget) return
    setDeleting(true)
    try {
      await accreditedNetworkApi.deleteItem(userId, deleteTarget.id)
      toast.success('Estabelecimento removido.')
      setDeleteTarget(null)
      fetchItems()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao remover estabelecimento.'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <NetworkIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Rede Credenciada</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gerencie postos, farmácias, mercados e demais estabelecimentos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchItems(true)}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                Novo Estabelecimento
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Estabelecimentos" value={stats.total} icon={<Building2 className="size-4" />} />
        <StatCard label="Estados" value={stats.states} icon={<MapPin className="size-4" />} accent="text-sky-600 dark:text-sky-400" />
        <StatCard label="Ativos" value={stats.active} icon={<Store className="size-4" />} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Inativos" value={stats.inactive} icon={<NetworkIcon className="size-4" />} accent="text-muted-foreground" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cidade, marca…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {availableStates.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcas</SelectItem>
                {availableBrands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table / Cards */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nenhum estabelecimento encontrado"
              description="Ajuste os filtros ou cadastre um novo estabelecimento."
              onCreate={openCreate}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Estabelecimento</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead className="min-w-[180px]">Desconto</TableHead>
                      <TableHead>Cashback</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium leading-tight">{it.name}</span>
                            {it.phone && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="size-3" />
                                {it.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {it.brand ? (
                            <Badge variant="outline">{it.brand}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {CATEGORY_LABEL[it.category] ?? it.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="size-3 text-muted-foreground" />
                            <span>{it.city}/{it.state}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <span className="line-clamp-1 text-sm text-muted-foreground">
                            {it.discountText || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Percent className="size-3" />
                            {it.cashbackPercent}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={it.isActive}
                            disabled={togglingId === it.id}
                            onCheckedChange={() => handleToggleActive(it)}
                            aria-label={`Alternar status de ${it.name}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => openEdit(it)}
                              aria-label="Editar"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(it)}
                              aria-label="Excluir"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile / tablet cards */}
              <div className="block space-y-3 p-4 lg:hidden">
                {filtered.map((it) => (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{it.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {it.brand && <Badge variant="outline">{it.brand}</Badge>}
                          <Badge variant="secondary" className="capitalize">
                            {CATEGORY_LABEL[it.category] ?? it.category}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={it.isActive}
                        disabled={togglingId === it.id}
                        onCheckedChange={() => handleToggleActive(it)}
                        aria-label={`Alternar status de ${it.name}`}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {it.city}/{it.state}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Percent className="size-3" />
                        {it.cashbackPercent}% cashback
                      </span>
                      {it.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3" />
                          {it.phone}
                        </span>
                      )}
                    </div>
                    {it.discountText && (
                      <p className="mt-2 text-sm">{it.discountText}</p>
                    )}
                    <div className="mt-3 flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(it)}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(it)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Atualize as informações do estabelecimento credenciado.'
                : 'Cadastre um novo estabelecimento na rede credenciada.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="an-name">Nome *</Label>
              <Input
                id="an-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Posto Shell - Av. Paulista"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="an-category">Categoria *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="an-category" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="an-brand">Marca</Label>
              <Input
                id="an-brand"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                placeholder="Ex.: Shell, Ipiranga, Raia…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="an-city">Cidade *</Label>
              <Input
                id="an-city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Ex.: São Paulo"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="an-state">UF (Estado) *</Label>
              <Input
                id="an-state"
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    state: e.target.value.toUpperCase().slice(0, 2),
                  }))
                }
                placeholder="SP"
                maxLength={2}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="an-address">Endereço</Label>
              <Input
                id="an-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Rua, número, bairro…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="an-phone">Telefone</Label>
              <Input
                id="an-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="an-discount">Texto do Desconto</Label>
              <Input
                id="an-discount"
                value={form.discountText}
                onChange={(e) => setForm((f) => ({ ...f, discountText: e.target.value }))}
                placeholder="Ex.: R$ 0,20 off por litro"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="an-cashback">Cashback (%)</Label>
              <Input
                id="an-cashback"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={form.cashbackPercent}
                onChange={(e) => setForm((f) => ({ ...f, cashbackPercent: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="an-sort">Ordem</Label>
              <Input
                id="an-sort"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Estabelecimento ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Quando desativado, não aparece na listagem pública.
                  </p>
                </div>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Salvar alterações' : 'Criar estabelecimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estabelecimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O estabelecimento{' '}
              <strong className="text-foreground">{deleteTarget?.name}</strong> será removido
              permanentemente da Rede Credenciada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------- Sub-components ----------
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn('mt-1 text-2xl font-semibold', accent)}>{value}</p>
        </div>
        <div className={cn('rounded-md bg-muted p-2', accent)}>{icon}</div>
      </CardContent>
    </Card>
  )
}

function EmptyState({
  title,
  description,
  onCreate,
}: {
  title: string
  description: string
  onCreate: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <NetworkIcon className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus className="size-4" />
        Novo Estabelecimento
      </Button>
    </div>
  )
}
