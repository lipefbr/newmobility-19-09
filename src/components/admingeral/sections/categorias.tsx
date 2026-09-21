'use client'

import { useState, useEffect } from 'react'
import { Tag, Plus, Loader2, Trash2, Edit2, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface Category {
  id: string
  code: string
  label: string
  description: string | null
  icon: string | null
  color: string | null
  sortOrder: number
  isActive: boolean
  _count?: { stores: number; products: number }
}

export function CategoriasSection() {
  const { user } = useStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', label: '', description: '', icon: '', color: '#155EEF', sortOrder: 99 })

  const load = async () => {
    if (!user?.id) return
    try {
      const r = await apiFetch<{ categories: Category[] }>(`/admingeral/categories?userId=${user.id}`)
      setCategories(r.categories)
    } catch { toast.error('Erro ao carregar categorias') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || !form.label) { toast.error('Código e nome são obrigatórios'); return }
    try {
      await apiFetch('/admingeral/categories', {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, ...form }),
      })
      toast.success('Categoria criada')
      setShowForm(false)
      setForm({ code: '', label: '', description: '', icon: '', color: '#155EEF', sortOrder: 99 })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar')
    }
  }

  const toggleActive = async (cat: Category) => {
    try {
      // No direct PATCH route for categories yet — would need [id] route.
      // For now, just show a toast. Can be extended.
      toast.info('Toggle em breve — use o botão de editar')
    } catch {
      toast.error('Erro')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{categories.length} categorias cadastradas</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Nova categoria
        </Button>
      </div>

      {showForm && (
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Código (único)</label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} placeholder="ex: shopping" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nome</label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="ex: Shopping" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Ícone (lucide)</label>
                  <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="ShoppingBag" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Cor</label>
                  <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Ordem</label>
                  <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Descrição</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Salvar</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <Card key={cat.id} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0" style={{ backgroundColor: (cat.color || '#155EEF') + '20' }}>
                  <Tag className="h-5 w-5" style={{ color: cat.color || '#155EEF' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{cat.label}</p>
                    {!cat.isActive && <Badge variant="secondary" className="text-[9px]">Inativa</Badge>}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">{cat.code}</p>
                  {cat.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>}
                  <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
                    <span>{cat._count?.stores || 0} lojas</span>
                    <span>{cat._count?.products || 0} produtos</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
