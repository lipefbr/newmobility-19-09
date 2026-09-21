'use client'

import { useState, useEffect } from 'react'
import { Package, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Product {
  id: string
  name: string
  description: string | null
  priceCents: number
  oldPriceCents: number | null
  imageUrl: string | null
  category: string | null
  isAvailable: boolean
  isFeatured: boolean
  store: { name: string }
}

export function ProdutosSection() {
  const { user } = useStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = async () => {
    if (!user?.id) return
    try {
      const r = await apiFetch<{ products: Product[] }>(`/admingeral/products?userId=${user.id}`)
      setProducts(r.products)
    } catch { toast.error('Erro ao carregar produtos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id])

  const filtered = q ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.store.name.toLowerCase().includes(q.toLowerCase())) : products
  const formatBRL = (cents: number) => `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{products.length} produtos cadastrados</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." className="pl-9 w-full sm:w-64" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-10 text-center">
            <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum produto encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Card key={p.id} className={`border-slate-200 ${!p.isAvailable ? 'opacity-60' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 rounded-lg bg-slate-100 items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                      {p.isFeatured && <Badge className="text-[9px] bg-amber-100 text-amber-700 hover:bg-amber-100">★</Badge>}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{p.store.name}</p>
                    {p.description && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{p.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-sm font-bold text-slate-900">{formatBRL(p.priceCents)}</p>
                      {p.oldPriceCents && <p className="text-[10px] text-slate-400 line-through">{formatBRL(p.oldPriceCents)}</p>}
                    </div>
                    {!p.isAvailable && <Badge variant="secondary" className="text-[9px] mt-1">Indisponível</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
