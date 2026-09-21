'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  Trophy,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch, ApiError } from '@/lib/api'
import { useStore } from '@/lib/store'

// ---------------- Types ----------------
interface ChallengeRow {
  id: string
  title: string
  description: string
  type: string // weekly | monthly | one_time
  targetValue: number
  rewardPoints: number
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

interface ChallengeFormState {
  title: string
  description: string
  type: 'weekly' | 'monthly' | 'one_time'
  targetValue: string
  rewardPoints: string
  startDate: string
  endDate: string
  isActive: boolean
}

const EMPTY_FORM: ChallengeFormState = {
  title: '',
  description: '',
  type: 'weekly',
  targetValue: '',
  rewardPoints: '',
  startDate: '',
  endDate: '',
  isActive: true,
}

const typeLabel = (t: string) => {
  if (t === 'monthly') return 'Mensal'
  if (t === 'one_time') return 'Único'
  return 'Semanal'
}

const typeBadgeClass = (t: string) => {
  if (t === 'monthly')
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  if (t === 'one_time')
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
}

const fmtDate = (d: string | null): string => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

// ---------------- Component ----------------
export function AdminChallengesPanel() {
  const user = useStore((s) => s.user)
  const [challenges, setChallenges] = useState<ChallengeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Create / Edit dialog
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ChallengeFormState>(EMPTY_FORM)

  // Confirm delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ChallengeRow | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ challenges: ChallengeRow[] }>(
        `/challenges?userId=${user?.id}&all=true`
      )
      setChallenges(res.challenges || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load challenges'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (c: ChallengeRow) => {
    setEditingId(c.id)
    setForm({
      title: c.title,
      description: c.description,
      type: (['weekly', 'monthly', 'one_time'].includes(c.type)
        ? c.type
        : 'weekly') as ChallengeFormState['type'],
      targetValue: String(c.targetValue ?? ''),
      rewardPoints: String(c.rewardPoints ?? ''),
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      isActive: !!c.isActive,
    })
    setOpen(true)
  }

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Título e descrição são obrigatórios')
      return
    }
    const tv = Number(form.targetValue)
    const rp = Number(form.rewardPoints)
    if (!Number.isFinite(tv) || tv < 0) {
      toast.error('Meta deve ser um número >= 0')
      return
    }
    if (!Number.isFinite(rp) || rp < 0) {
      toast.error('Recompensa deve ser um número >= 0')
      return
    }

    const payload: Record<string, unknown> = {
      userId: user?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      targetValue: Math.floor(tv),
      rewardPoints: Math.floor(rp),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      isActive: form.isActive,
    }

    setSaving(true)
    try {
      if (editingId) {
        await apiFetch(`/challenges/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        toast.success('Desafio atualizado!')
      } else {
        await apiFetch(`/challenges`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Desafio criado!')
      }
      setOpen(false)
      void fetchData()
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Erro ao salvar desafio'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await apiFetch(`/challenges/${deleteTarget.id}?userId=${user?.id}`, {
        method: 'DELETE',
      })
      toast.success('Desafio excluído!')
      setDeleteTarget(null)
      void fetchData()
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Erro ao excluir desafio'
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  // ---------------- Loading state ----------------
  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
            </div>
            <Skeleton className="h-9 w-36" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------------- Error state ----------------
  if (error) {
    return (
      <Card className="rounded-2xl shadow-sm border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Erro ao carregar desafios
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
              {error}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Trophy className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Desafios — Gamificação
              </h3>
              <p className="text-xs text-muted-foreground">
                Crie desafios semanais, mensais e únicos para incentivar a
                participação dos usuários.
              </p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Criar Desafio
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" />
            Desafios Cadastrados
            <Badge variant="secondary" className="ml-1">
              {challenges.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Recompensa</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challenges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Target className="h-6 w-6" />
                        <p className="text-sm">
                          Nenhum desafio cadastrado ainda.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  challenges.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="max-w-[200px]">
                        <div className="font-medium text-foreground truncate">
                          {c.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1">
                          {c.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeBadgeClass(c.type)}>
                          {typeLabel(c.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {c.targetValue}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        +{c.rewardPoints}
                      </TableCell>
                      <TableCell className="text-center">
                        {c.isActive ? (
                          <Badge className="bg-emerald-600 text-white">Sim</Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(c.startDate)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(c.endDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg"
                            onClick={() => openEdit(c)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => setDeleteTarget(c)}
                            title="Excluir"
                            disabled={deletingId === c.id}
                          >
                            {deletingId === c.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" />
              {editingId ? 'Editar Desafio' : 'Criar Desafio'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize os campos do desafio.'
                : 'Preencha os campos para criar um novo desafio.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label htmlFor="ch-title">Título</Label>
              <Input
                id="ch-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Ex.: 5 Indicações na Semana"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-desc">Descrição</Label>
              <Textarea
                id="ch-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Descreva o objetivo do desafio"
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ch-type">Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: v as ChallengeFormState['type'],
                    }))
                  }
                >
                  <SelectTrigger id="ch-type" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="one_time">Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ch-target">Meta (valor alvo)</Label>
                <Input
                  id="ch-target"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.targetValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetValue: e.target.value }))
                  }
                  placeholder="Ex.: 5"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ch-reward">Recompensa (pontos)</Label>
                <Input
                  id="ch-reward"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.rewardPoints}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rewardPoints: e.target.value }))
                  }
                  placeholder="Ex.: 50"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ch-active">Ativo</Label>
                <div className="flex items-center h-9 gap-2">
                  <Switch
                    id="ch-active"
                    checked={form.isActive}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, isActive: v }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {form.isActive ? 'Visível para usuários' : 'Oculto'}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ch-start">Início (opcional)</Label>
                <Input
                  id="ch-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ch-end">Fim (opcional)</Label>
                <Input
                  id="ch-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => void submit()}
              disabled={saving}
            >
              {saving
                ? 'Salvando...'
                : editingId
                ? 'Salvar Alterações'
                : 'Criar Desafio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              Excluir Desafio
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.title}
              </span>
              ? Esta ação não pode ser desfeita e removerá todo o progresso
              dos usuários neste desafio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteTarget(null)}
              disabled={!!deletingId}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={() => void confirmDelete()}
              disabled={!!deletingId}
            >
              {deletingId ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
