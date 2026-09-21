'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, RefreshCw, Search, Star, Tag, Percent,
  Building2, Globe, Phone, ImageOff, Sparkles, Loader2,
} from 'lucide-react'

import { useStore } from '@/lib/store'
import { discountClubApi } from '@/lib/api'
import { cn } from '@/lib/utils'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
interface Partner {
  id: string
  name: string
  logoUrl?: string | null
  category: string
  discountText?: string | null
  cashbackPercent: number
  description?: string | null
  websiteUrl?: string | null
  phone?: string | null
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  createdAt: string
}

interface FormState {
  name: string
  category: string
  discountText: string
  cashbackPercent: string
  description: string
  websiteUrl: string
  phone: string
  logoUrl: string
  isFeatured: boolean
  isActive: boolean
  sortOrder: string
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'pet', label: 'Pet' },
  { value: 'food', label: 'Alimentação' },
  { value: 'health', label: 'Saúde' },
  { value: 'auto', label: 'Automotivo' },
  { value: 'beauty', label: 'Beleza' },
  { value: 'services', label: 'Serviços' },
]

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
)

const EMPTY_FORM: FormState = {
  name: '',
  category: 'services',
  discountText: '',
  cashbackPercent: '0',
  description: '',
  websiteUrl: '',
  phone: '',
  logoUrl: '',
  isFeatured: false,
  isActive: true,
  sortOrder: '0',
}

export function DiscountClubManager() {
  const { user } = useStore()
  const userId = user?.id ?? ''

  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toggling active state map (prevent full re-render flash)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchPartners = useCallback(
    async (isRefresh = false) => {
      if (!userId) return
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        const res = await discountClubApi.getPartners({ userId })
        setPartners(Array.isArray(res.partners) ? res.partners : [])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao carregar parceiros.'
        toast.error(message)
        setPartners([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [userId]
  )

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return partners.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.discountText ?? '').toLowerCase().includes(q)
      )
    })
  }, [partners, search, categoryFilter])

  const stats = useMemo(() => {
    const total = partners.length
    const active = partners.filter((p) => p.isActive).length
    const featured = partners.filter((p) => p.isFeatured).length
    return { total, active, featured, inactive: total - active }
  }, [partners])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, sortOrder: String(partners.length + 1) })
    setDialogOpen(true)
  }

  const openEdit = (p: Partner) => {
    setEditing(p)
    setForm({
      name: p.name ?? '',
      category: p.category ?? 'services',
      discountText: p.discountText ?? '',
      cashbackPercent: String(p.cashbackPercent ?? 0),
      description: p.description ?? '',
      websiteUrl: p.websiteUrl ?? '',
      phone: p.phone ?? '',
      logoUrl: p.logoUrl ?? '',
      isFeatured: !!p.isFeatured,
      isActive: p.isActive !== false,
      sortOrder: String(p.sortOrder ?? 0),
    })
    setDialogOpen(true)
  }

  const handleToggleActive = async (p: Partner) => {
    if (!userId) return
    setTogglingId(p.id)
    const prev = partners
    setPartners((arr) =>
      arr.map((x) => (x.id === p.id ? { ...x, isActive: !x.isActive } : x))
    )
    try {
      await discountClubApi.updatePartner(userId, p.id, { isActive: !p.isActive })
      toast.success(p.isActive ? 'Parceiro desativado.' : 'Parceiro ativado.')
    } catch (err: unknown) {
      setPartners(prev) // rollback
      const message = err instanceof Error ? err.message : 'Erro ao alterar status.'
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleSave = async () => {
    if (!userId) return
    if (!form.name.trim()) {
      toast.error('Informe o nome do parceiro.')
      return
    }
    if (!form.category.trim()) {
      toast.error('Selecione uma categoria.')
      return
    }
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      discountText: form.discountText.trim() || undefined,
      cashbackPercent: Math.max(0, Math.min(100, Number(form.cashbackPercent) || 0)),
      description: form.description.trim() || undefined,
      websiteUrl: form.websiteUrl.trim() || undefined,
      phone: form.phone.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    }
    setSaving(true)
    try {
      if (editing) {
        await discountClubApi.updatePartner(userId, editing.id, payload)
        toast.success('Parceiro atualizado com sucesso.')
      } else {
        await discountClubApi.createPartner(userId, payload)
        toast.success('Parceiro criado com sucesso.')
      }
      setDialogOpen(false)
      fetchPartners()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar parceiro.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!userId || !deleteTarget) return
    setDeleting(true)
    try {
      await discountClubApi.deletePartner(userId, deleteTarget.id)
      toast.success('Parceiro removido.')
      setDeleteTarget(null)
      fetchPartners()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao remover parceiro.'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Tag className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Clube de Descontos</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gerencie parceiros, descontos e cashback do clube.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPartners(true)}
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
                Novo Parceiro
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={<Building2 className="size-4" />} accent="text-foreground" />
        <StatCard label="Ativos" value={stats.active} icon={<Sparkles className="size-4" />} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Em Destaque" value={stats.featured} icon={<Star className="size-4" />} accent="text-amber-500" />
        <StatCard label="Inativos" value={stats.inactive} icon={<ImageOff className="size-4" />} accent="text-muted-foreground" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, descrição ou desconto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
              title="Nenhum parceiro encontrado"
              description="Ajuste os filtros ou crie um novo parceiro para começar."
              onCreate={openCreate}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Parceiro</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="min-w-[200px]">Desconto</TableHead>
                      <TableHead>Cashback</TableHead>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {p.isFeatured && (
                              <Star className="size-4 fill-amber-400 text-amber-400" />
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium leading-tight">{p.name}</span>
                              {p.websiteUrl && (
                                <a
                                  href={p.websiteUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <Globe className="size-3" />
                                  Site
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {CATEGORY_LABEL[p.category] ?? p.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <span className="line-clamp-1 text-sm text-muted-foreground">
                            {p.discountText || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Percent className="size-3" />
                            {p.cashbackPercent}%
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.sortOrder}</TableCell>
                        <TableCell>
                          <Switch
                            checked={p.isActive}
                            disabled={togglingId === p.id}
                            onCheckedChange={() => handleToggleActive(p)}
                            aria-label={`Alternar status de ${p.name}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => openEdit(p)}
                              aria-label="Editar"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(p)}
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

              {/* Mobile cards */}
              <div className="block space-y-3 p-4 md:hidden">
                {filtered.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {p.isFeatured && (
                          <Star className="mt-0.5 size-4 shrink-0 fill-amber-400 text-amber-400" />
                        )}
                        <div>
                          <p className="font-medium leading-tight">{p.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="capitalize">
                              {CATEGORY_LABEL[p.category] ?? p.category}
                            </Badge>
                            <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                              <Percent className="size-3" />
                              {p.cashbackPercent}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={p.isActive}
                        disabled={togglingId === p.id}
                        onCheckedChange={() => handleToggleActive(p)}
                        aria-label={`Alternar status de ${p.name}`}
                      />
                    </div>
                    {p.discountText && (
                      <p className="mt-2 text-sm text-muted-foreground">{p.discountText}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Ordem: {p.sortOrder}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
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
            <DialogTitle>{editing ? 'Editar Parceiro' : 'Novo Parceiro'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Atualize as informações do parceiro do clube de descontos.'
                : 'Preencha os dados para cadastrar um novo parceiro.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="dc-name">Nome *</Label>
              <Input
                id="dc-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Pet Shop Amigo Fiel"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-category">Categoria *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="dc-category" className="w-full">
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
              <Label htmlFor="dc-discount">Texto do Desconto</Label>
              <Input
                id="dc-discount"
                value={form.discountText}
                onChange={(e) => setForm((f) => ({ ...f, discountText: e.target.value }))}
                placeholder="Ex.: 15% OFF em banho e tosa"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-cashback">Cashback (%)</Label>
              <Input
                id="dc-cashback"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={form.cashbackPercent}
                onChange={(e) => setForm((f) => ({ ...f, cashbackPercent: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-sort">Ordem</Label>
              <Input
                id="dc-sort"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dc-desc">Descrição</Label>
              <Textarea
                id="dc-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição curta do parceiro / oferta."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-website">Website</Label>
              <Input
                id="dc-website"
                value={form.websiteUrl}
                onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                placeholder="https://"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-phone">Telefone</Label>
              <Input
                id="dc-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dc-logo">URL do Logo</Label>
              <Input
                id="dc-logo"
                value={form.logoUrl}
                onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://…/logo.png"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Star className="size-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Destacar parceiro</p>
                  <p className="text-xs text-muted-foreground">Exibe com estrela na listagem pública.</p>
                </div>
              </div>
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Parceiro ativo</p>
                  <p className="text-xs text-muted-foreground">Quando desativado, não aparece publicamente.</p>
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
              {editing ? 'Salvar alterações' : 'Criar parceiro'}
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
            <AlertDialogTitle>Excluir parceiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O parceiro{' '}
              <strong className="text-foreground">{deleteTarget?.name}</strong> será removido
              permanentemente do Clube de Descontos.
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
        <Tag className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus className="size-4" />
        Novo Parceiro
      </Button>
    </div>
  )
}


