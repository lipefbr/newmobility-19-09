'use client'

import { useState, useEffect } from 'react'
import { Store, Loader2, BadgeCheck, Star, Search, MapPin, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface StoreItem {
  id: string
  name: string
  category: string
  description: string | null
  logoUrl: string | null
  city: string | null
  state: string | null
  rating: number
  totalOrders: number
  isVerified: boolean
  isFeatured: boolean
  isActive: boolean
  isOpen: boolean
  owner: { id: string; name: string; email: string; phone: string | null }
  _count: { products: number; orders: number }
}

export function LojasSection() {
  const { user } = useStore()
  const [stores, setStores] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all')
  const [q, setQ] = useState('')

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const r = await apiFetch<{ stores: StoreItem[] }>(`/admingeral/stores?userId=${user.id}&status=${filter}`)
      const filtered = q ? r.stores.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.owner.name.toLowerCase().includes(q.toLowerCase())) : r.stores
      setStores(filtered)
    } catch { toast.error('Erro ao carregar lojas') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id, filter])

  const toggleVerify = async (store: StoreItem) => {
    try {
      await apiFetch(`/admingeral/stores/${store.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: user?.id, isVerified: !store.isVerified }),
      })
      toast.success(store.isVerified ? 'Verificação removida' : 'Loja verificada')
      load()
    } catch { toast.error('Erro') }
  }

  const toggleFeature = async (store: StoreItem) => {
    try {
      await apiFetch(`/admingeral/stores/${store.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: user?.id, isFeatured: !store.isFeatured }),
      })
      toast.success(store.isFeatured ? 'Destaque removido' : 'Loja em destaque')
      load()
    } catch { toast.error('Erro') }
  }

  const toggleActive = async (store: StoreItem) => {
    try {
      await apiFetch(`/admingeral/stores/${store.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: user?.id, isActive: !store.isActive }),
      })
      toast.success(store.isActive ? 'Loja desativada' : 'Loja ativada')
      load()
    } catch { toast.error('Erro') }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'pending', 'verified'] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Verificadas'}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); load() }} placeholder="Buscar loja..." className="pl-9 w-full sm:w-64" />
        </div>
      </div>

      {stores.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-10 text-center">
            <Store className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhuma loja encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stores.map((store) => (
            <Card key={store.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 rounded-lg">
                    {store.logoUrl ? <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover rounded-lg" /> : null}
                    <AvatarFallback className="rounded-lg bg-slate-100"><Store className="h-5 w-5 text-slate-400" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900 truncate">{store.name}</p>
                      {store.isVerified && <BadgeCheck className="h-4 w-4 text-green-500 flex-shrink-0" fill="#22C55E" stroke="white" />}
                      {store.isFeatured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500">{store.category} · {store.owner.name}</p>
                    {store.city && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {store.city}, {store.state}
                      </p>
                    )}
                    <div className="flex gap-3 mt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-400" /> {store.rating.toFixed(1)}</span>
                      <span>{store._count.products} produtos</span>
                      <span>{store._count.orders} pedidos</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <Button size="sm" variant={store.isVerified ? 'outline' : 'default'} className="h-7 text-xs" onClick={() => toggleVerify(store)}>
                    {store.isVerified ? 'Remover verificação' : 'Verificar'}
                  </Button>
                  <Button size="sm" variant={store.isFeatured ? 'outline' : 'secondary'} className="h-7 text-xs" onClick={() => toggleFeature(store)}>
                    {store.isFeatured ? 'Tirar destaque' : 'Destacar'}
                  </Button>
                  <Button size="sm" variant={store.isActive ? 'outline' : 'destructive'} className="h-7 text-xs ml-auto" onClick={() => toggleActive(store)}>
                    {store.isActive ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
