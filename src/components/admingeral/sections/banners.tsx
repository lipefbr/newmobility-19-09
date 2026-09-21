'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface Banner {
  id: string
  title: string
  subtitle: string | null
  ctaLabel: string | null
  ctaHref: string | null
  imageUrl: string | null
  accentColor: string
  sortOrder: number
  isActive: boolean
  surface: string
}

export function BannersSection() {
  const { user } = useStore()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', subtitle: '', ctaLabel: '', ctaHref: '', imageUrl: '', accentColor: '#155EEF', surface: 'mobile' })

  const load = async () => {
    if (!user?.id) return
    try {
      const r = await apiFetch<{ banners: Banner[] }>(`/admingeral/banners?userId=${user.id}`)
      setBanners(r.banners)
    } catch { toast.error('Erro ao carregar banners') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) { toast.error('Título é obrigatório'); return }
    try {
      await apiFetch('/admingeral/banners', {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, ...form, sortOrder: 99 }),
      })
      toast.success('Banner criado')
      setShowForm(false)
      setForm({ title: '', subtitle: '', ctaLabel: '', ctaHref: '', imageUrl: '', accentColor: '#155EEF', surface: 'mobile' })
      load()
    } catch { toast.error('Erro ao criar banner') }
  }

  const toggleActive = async (b: Banner) => {
    try {
      await apiFetch(`/admingeral/banners/${b.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: user?.id, isActive: !b.isActive }),
      })
      load()
    } catch { toast.error('Erro') }
  }

  const handleDelete = async (b: Banner) => {
    if (!confirm(`Excluir banner "${b.title}"?`)) return
    try {
      await apiFetch(`/admingeral/banners/${b.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: user?.id }),
      })
      toast.success('Banner excluído')
      load()
    } catch { toast.error('Erro') }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{banners.length} banners · {banners.filter((b) => b.isActive).length} ativos</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Novo banner</Button>
      </div>

      {showForm && (
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Título *</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Subtítulo</label>
                  <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">CTA (texto)</label>
                  <Input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Peça agora" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">CTA (link)</label>
                  <Input value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} placeholder="/mobile/alimentacao" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Surface (app)</label>
                  <select value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })} className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm">
                    <option value="mobile">Mobile (cliente)</option>
                    <option value="motorista">Motorista</option>
                    <option value="lojista">Lojista</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">URL da imagem</label>
                  <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Cor de destaque</label>
                  <Input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="mt-1 h-9" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Salvar banner</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {banners.map((b) => (
          <Card key={b.id} className={`border-slate-200 ${!b.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 items-center justify-center" style={{ backgroundColor: b.accentColor + '20' }}>
                  {b.imageUrl ? <img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6" style={{ color: b.accentColor }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{b.title}</p>
                    <Badge variant="outline" className="text-[9px] capitalize">{b.surface}</Badge>
                  </div>
                  {b.subtitle && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{b.subtitle}</p>}
                  {b.ctaLabel && <p className="text-[10px] text-slate-400 mt-1">CTA: {b.ctaLabel} → {b.ctaHref || '—'}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">{b.isActive ? 'Ativo' : 'Inativo'}</span>
                <Switch checked={b.isActive} onCheckedChange={() => toggleActive(b)} className="ml-auto" />
                <Button size="sm" variant="ghost" className="h-7 text-red-600 hover:bg-red-50" onClick={() => handleDelete(b)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
