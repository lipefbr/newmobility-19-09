'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Store, Package, ClipboardList, TrendingUp, Car, Tag, Image as ImageIcon, Loader2, ArrowUpRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type DashboardData, formatBRL, formatDateTime } from '../types'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  preparo: { label: 'Em preparo', color: 'bg-blue-100 text-blue-700' },
  entrega: { label: 'A caminho', color: 'bg-purple-100 text-purple-700' },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

export function DashboardSection() {
  const router = useRouter()
  const { user } = useStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    apiFetch<DashboardData>(`/admingeral/dashboard?userId=${user.id}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!data) return <p className="text-sm text-slate-500">Erro ao carregar dados.</p>

  const stats = [
    { label: 'Clientes', value: data.users.clientes, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Motoristas', value: data.users.motoristas, icon: Car, color: 'text-amber-600 bg-amber-50' },
    { label: 'Lojistas', value: data.users.lojistas, icon: Store, color: 'text-purple-600 bg-purple-50' },
    { label: 'Entregadores', value: data.users.entregadores, icon: Car, color: 'text-orange-600 bg-orange-50' },
    { label: 'Lojas ativas', value: data.stores.active, icon: Store, color: 'text-green-600 bg-green-50' },
    { label: 'Produtos', value: data.products.total, icon: Package, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Pedidos hoje', value: data.orders.today, icon: ClipboardList, color: 'text-pink-600 bg-pink-50' },
    { label: 'Categorias', value: data.categories.active, icon: Tag, color: 'text-cyan-600 bg-cyan-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-700 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-300 font-medium">Faturamento hoje</p>
                <p className="text-3xl font-bold mt-1">{formatBRL(data.revenue.todayCents)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{data.orders.today} pedidos hoje</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-100 to-slate-50 border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Faturamento 7 dias</p>
                <p className="text-3xl font-bold mt-1 text-slate-900">{formatBRL(data.revenue.weekCents)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200">
                <TrendingUp className="h-6 w-6 text-slate-700" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">{data.orders.week} pedidos na semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="border-slate-200">
              <CardContent className="p-4">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg mb-2 ${s.color}`}>
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pending alerts */}
      {(data.drivers.pending > 0 || data.stores.pendingApprovals > 0 || data.orders.pending > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">Itens pendentes de atenção</p>
            <div className="flex flex-wrap gap-2">
              {data.drivers.pending > 0 && (
                <button onClick={() => router.push('/admingeral/inicio')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-medium text-amber-700 hover:bg-amber-100">
                  <Car className="h-3 w-3" /> {data.drivers.pending} motoristas para aprovar
                </button>
              )}
              {data.stores.pendingApprovals > 0 && (
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-medium text-amber-700 hover:bg-amber-100">
                  <Store className="h-3 w-3" /> {data.stores.pendingApprovals} lojas para verificar
                </button>
              )}
              {data.orders.pending > 0 && (
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-medium text-amber-700 hover:bg-amber-100">
                  <ClipboardList className="h-3 w-3" /> {data.orders.pending} pedidos pendentes
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent orders */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pedidos recentes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Nenhum pedido ainda.</p>
          ) : (
            <div className="space-y-2">
              {data.recentOrders.map((order) => {
                const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending
                return (
                  <div key={order.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">#{order.number}</p>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {order.customer.name} · {order.store.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatBRL(order.totalCents)}</p>
                      <p className="text-[10px] text-slate-400">{formatDateTime(order.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
