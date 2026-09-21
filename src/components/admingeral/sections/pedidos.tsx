'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Order {
  id: string
  number: string
  status: string
  totalCents: number
  subtotalCents: number
  deliveryFeeCents: number
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  store: { name: string }
  customer: { name: string; email: string }
  items: Array<{ id: string; productName: string; quantity: number; totalCents: number }>
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  preparo: { label: 'Em preparo', color: 'bg-blue-100 text-blue-700' },
  entrega: { label: 'A caminho', color: 'bg-purple-100 text-purple-700' },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

export function PedidosSection() {
  const { user } = useStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const url = `/admingeral/orders?userId=${user.id}${filter !== 'all' ? `&status=${filter}` : ''}`
      const r = await apiFetch<{ orders: Order[] }>(url)
      setOrders(r.orders)
    } catch { toast.error('Erro ao carregar pedidos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.id, filter])

  const formatBRL = (cents: number) => `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>

  const filters = ['all', 'pending', 'preparo', 'entrega', 'entregue', 'cancelado']

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Todos' : STATUS_CONFIG[f]?.label || f}
          </Button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-10 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum pedido encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            return (
              <Card key={order.id} className="border-slate-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900">#{order.number}</p>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${sc.color}`}>{sc.label}</span>
                        <Badge variant="outline" className="text-[9px]">{order.paymentStatus}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {order.customer.name} · {order.store.name} · {order.items.length} item(ns)
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatBRL(order.totalCents)}</p>
                      <p className="text-[10px] text-slate-400">{order.paymentMethod}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
