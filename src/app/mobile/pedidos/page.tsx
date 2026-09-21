'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  ClipboardList,
  Package,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'
import { formatBRL } from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/pedidos — User's marketplace order history.
// ----------------------------------------------------------------------------
// Fetches GET /api/marketplace/orders?userId=X. Shows filter chips by status
// and order cards with: order #, store, date, status badge, total, item count.
// Empty state → /mobile/inicio.
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'
const ERROR_RED = '#EF4444'
const WARNING = '#F59E0B'

type StatusFilter = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'processing', label: 'Em preparo' },
  { key: 'shipped', label: 'Em entrega' },
  { key: 'delivered', label: 'Entregues' },
  { key: 'cancelled', label: 'Cancelados' },
]

interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  cashbackPercent: number
  category?: string
  imageUrl?: string | null
  sellerName?: string | null
}

interface Order {
  id: string
  userId: string
  status: string
  totalAmount: number
  cashbackEarned: number
  shippingAddress?: string | null
  paymentMethod?: string | null
  paidAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
  items: OrderItem[]
}

interface OrdersResponse {
  orders: Order[]
}

function statusMeta(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: 'Pendente', color: WARNING }
    case 'processing':
      return { label: 'Em preparo', color: PRIMARY }
    case 'shipped':
      return { label: 'Em entrega', color: PRIMARY }
    case 'delivered':
      return { label: 'Entregue', color: GREEN }
    case 'cancelled':
      return { label: 'Cancelado', color: ERROR_RED }
    default:
      return { label: status, color: '#6B7280' }
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function PedidosPage() {
  const router = useRouter()
  const { user, loading } = useMobileAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [fetching, setFetching] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')

  const loadOrders = useCallback(async () => {
    if (!user?.id) return
    setFetching(true)
    try {
      const resp = await apiFetch<OrdersResponse>(
        `/marketplace/orders?userId=${user.id}`
      )
      setOrders(resp.orders || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar pedidos')
    } finally {
      setFetching(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const filtered = orders.filter((o) => filter === 'all' || o.status === filter)

  if (loading) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Meus Pedidos" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
        </div>
      </MobileAppShell>
    )
  }

  return (
    <MobileAppShell>
      <MobilePageHeader title="Meus Pedidos" />

      <div className="px-4 pt-4">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            const count =
              f.key === 'all'
                ? orders.length
                : orders.filter((o) => o.status === f.key).length
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-all flex items-center gap-1 min-h-[44px]"
                style={{
                  backgroundColor: active ? PRIMARY : '#F3F4F6',
                  color: active ? 'white' : '#6B7280',
                }}
              >
                {f.label}
                {count > 0 && (
                  <span
                    className="px-1 h-4 rounded-full text-[9px] font-bold flex items-center"
                    style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#E5E7EB',
                      color: active ? 'white' : '#6B7280',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Orders list */}
        <div className="mt-3 space-y-3">
          {fetching ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: PRIMARY }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-3"
                style={{ backgroundColor: MINT_BG }}
              >
                <ClipboardList className="h-7 w-7" style={{ color: '#059669' }} />
              </div>
              <p className="text-sm font-bold text-gray-900">
                {orders.length === 0
                  ? 'Você ainda não fez pedidos'
                  : 'Nenhum pedido nesta categoria'}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-[260px] mx-auto">
                {orders.length === 0
                  ? 'Explore o app e faça sua primeira compra!'
                  : 'Tente outro filtro para ver mais pedidos.'}
              </p>
              {orders.length === 0 && (
                <button
                  onClick={() => router.push('/mobile/inicio')}
                  className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-white text-xs font-bold min-h-[44px]"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Explorar produtos
                </button>
              )}
            </div>
          ) : (
            filtered.map((order, idx) => {
              const st = statusMeta(order.status)
              const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)
              const storeName =
                order.items[0]?.sellerName ||
                order.items[0]?.productName ||
                'Marketplace'
              const orderNumber = order.id.slice(-8).toUpperCase()
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
                        style={{ backgroundColor: MINT_BG }}
                      >
                        <Package className="h-4 w-4" style={{ color: '#059669' }} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900">
                          Pedido #{orderNumber}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center px-2 h-5 rounded-full text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: `${st.color}20`, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 mb-1">
                    <span className="text-gray-500">Loja:</span>{' '}
                    <span className="font-semibold">{storeName}</span>
                  </p>

                  {/* Items preview (first 2 + "e mais X") */}
                  <div className="mt-2 space-y-1">
                    {order.items.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded bg-gray-100 text-gray-700 font-bold px-1">
                          {item.quantity}x
                        </span>
                        <span className="flex-1 text-gray-700 truncate">
                          {item.productName}
                        </span>
                        <span className="text-gray-500 font-semibold">
                          R$ {formatBRL(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-[10px] text-gray-500 pl-6">
                        + {order.items.length - 2} itens
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-500">{itemCount} item(s)</p>
                      {order.cashbackEarned > 0 && (
                        <p className="text-[10px] font-semibold" style={{ color: GREEN }}>
                          + R$ {formatBRL(order.cashbackEarned)} cashback
                        </p>
                      )}
                    </div>
                    <p className="text-base font-bold text-gray-900">
                      R$ {formatBRL(order.totalAmount)}
                    </p>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}
