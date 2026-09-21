'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Menu,
  ChevronDown,
  Loader2,
  LogOut,
  Store,
  ChevronRight,
  BadgeCheck,
  ClipboardList,
  UtensilsCrossed,
  Wallet,
  Rocket,
  Percent,
  Clock,
  Star,
  BarChart3,
  Bike,
  Headset,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Bike as BikeIcon,
  TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { LojistaAppShell } from '@/components/lojista/lojista-app-shell'

// ============================================================================
// /lojista/inicio — Painel da Loja NewMobility.
// ----------------------------------------------------------------------------
// Layout (fiel ao design enviado — "merchant dashboard"):
//   1. Header azul fixo: menu hambúrguer + "Olá, Lojista / Nome da loja" +
//      sino + avatar
//   2. Card de status flutuante: "Loja aberta/fechada" + toggle verde
//   3. Card de vendas: "Vendas de hoje" + valor + delta + 3 ações rápidas
//      (Pedidos / Produtos / Financeiro)
//   4. Card motivacional (fundo verde menta): "Sua loja está indo muito bem!"
//   5. Grid de atalhos 4×2 (Pedidos, Produtos, Cupons, Horário, Avaliações,
//      Relatórios, Entrega, Suporte)
//   6. Últimos pedidos (lista com status coloridos)
//   7. Banner promocional "Aumente suas vendas" (fundo escuro + CTA verde)
//   8. Bottom nav (no LojistaAppShell) com FAB central de loja
//
// Dados:
//   - Wallet/sales/orders: API /api/lojista/home (lê as mesmas colunas de
//     saldo; vendas/pedidos são mock até existir um modelo Order no schema).
//   - Open status: estado transitório client-side (toggle).
//   - Store profile: mock até existir um modelo Store no schema.
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'

interface HomeData {
  user: {
    id: string
    name: string
    profileImage: string | null
    phone: string | null
  }
  wallet: {
    totalCents: number
    withdrawalCents: number
    foodCents: number
    shoppingCents: number
    pendingCents: number
  }
  store: {
    id: string | null
    name: string | null
    category: string | null
    logo: string | null
    isVerified: boolean
    rating: number
    totalOrders: number
    isMock: boolean
  }
  sales: {
    todayRevenueCents: number
    todayOrders: number
    deltaPctVsYesterday: number
    weekRevenueCents: number
    isMock: boolean
  }
  orders: Array<{
    id: string
    number: string
    customerName: string
    itemsSummary: string
    priceCents: number
    status: 'preparo' | 'entrega' | 'entregue' | 'cancelado'
    minutesAgo: number
    isMock: boolean
  }>
  isLojista: boolean
  hasMockData: boolean
  blockReason: string | null
}

export default function LojistaInicioPage() {
  const router = useRouter()
  const { user, logout } = useStore()
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.id) {
      router.replace('/lojista/login')
      return
    }
    try {
      const resp = await apiFetch<HomeData>(`/lojista/home?userId=${user.id}`)
      setData(resp)
      if (!resp.isLojista) {
        logout()
        router.replace('/lojista/login')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [user?.id, router, logout])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
        <p className="text-sm text-gray-500 mt-2">Carregando painel...</p>
      </div>
    )
  }

  if (!data) return null

  const storeName = data.store.name || 'Minha Loja'
  const storeCategory = data.store.category || 'Painel da sua loja'
  const firstName = data.user.name?.split(' ')[0] || 'Lojista'
  const initials = data.user.name
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('') || 'LO'

  const formatBRL = (cents: number) =>
    `R$ ${(cents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  return (
    <LojistaAppShell>
      {/* ════════════════ 1. HEADER AZUL ════════════════ */}
      <header
        className="sticky top-0 z-30"
        style={{ background: `linear-gradient(160deg, ${PRIMARY} 0%, #0B4FE0 100%)` }}
      >
        <div style={{ height: 'env(safe-area-inset-top)' }} />

        <div className="px-4 py-3 flex items-center justify-between gap-3">
          {/* Left: menu + greeting */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px]"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] text-white/70 font-medium leading-none">Olá, Lojista</p>
              <button
                onClick={() => setMenuOpen(true)}
                className="flex items-center gap-1 mt-0.5 min-w-0"
              >
                <span className="text-sm font-semibold text-white truncate">{storeName}</span>
                {data.store.isVerified && (
                  <BadgeCheck className="h-3.5 w-3.5 text-white flex-shrink-0" fill="#22C55E" stroke="white" />
                )}
                <ChevronDown className="h-3.5 w-3.5 text-white/80 flex-shrink-0" />
              </button>
              <p className="text-[10px] text-white/60 leading-none mt-0.5 truncate">{storeCategory}</p>
            </div>
          </div>

          {/* Right: bell + avatar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toast.info('Notificações em breve')}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4 text-white" />
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-400 ring-2"
                style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties}
              />
            </button>
            <button
              onClick={() => router.push('/lojista/mais')}
              className="min-w-[44px] min-h-[44px]"
              aria-label="Perfil"
            >
              <Avatar className="h-9 w-9 ring-2 ring-white/30">
                <AvatarImage src={data.user.profileImage || undefined} alt={firstName} />
                <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════ 2. STORE STATUS CARD ════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 -mt-3 relative z-20"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-50 p-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: isOpen ? GREEN : '#9CA3AF' }}
              />
              <span className="text-base font-bold text-gray-900">
                {isOpen ? 'Loja aberta' : 'Loja fechada'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isOpen ? 'Recebendo pedidos' : 'Não recebe novos pedidos'}
            </p>
          </div>
          <Switch
            checked={isOpen}
            onCheckedChange={(v) => {
              setIsOpen(v)
              toast.success(v ? 'Loja aberta — recebendo pedidos' : 'Loja fechada')
            }}
            aria-label="Alternar status da loja"
          />
        </div>
      </motion.div>

      {/* ════════════════ 3. SALES CARD ════════════════ */}
      <section className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3">
            {/* Left: revenue */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-gray-500 font-medium">Vendas de hoje</p>
                {data.sales.isMock && (
                  <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-bold">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatBRL(data.sales.todayRevenueCents)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" style={{ color: GREEN }} />
                <span className="text-xs font-medium" style={{ color: GREEN }}>
                  +{data.sales.deltaPctVsYesterday.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-400">em relação a ontem</span>
              </div>
            </div>

            {/* Right: 3 quick actions */}
            <div className="flex gap-2 flex-shrink-0">
              <QuickAction
                icon={ClipboardList}
                label="Pedidos"
                onClick={() => router.push('/lojista/pedidos')}
              />
              <QuickAction
                icon={UtensilsCrossed}
                label="Produtos"
                onClick={() => router.push('/lojista/produtos')}
              />
              <QuickAction
                icon={Wallet}
                label="Financeiro"
                onClick={() => router.push('/lojista/financeiro')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ 4. MOTIVATIONAL CARD ════════════════ */}
      <section className="px-4 mt-3">
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ backgroundColor: '#ECFDF5' }}
        >
          {/* Storefront illustration (CSS-only) */}
          <div className="flex-shrink-0">
            <div className="relative h-14 w-14 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
              <Store className="h-7 w-7" style={{ color: PRIMARY }} strokeWidth={2} />
              <div
                className="absolute bottom-0 left-0 right-0 h-2"
                style={{ backgroundColor: '#22C55E' }}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">Sua loja está indo muito bem!</p>
            <p className="text-xs text-gray-600 mt-0.5 leading-snug">
              Continue assim e venda ainda mais hoje.
            </p>
          </div>

          <div
            className="flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0"
            style={{ backgroundColor: GREEN }}
          >
            <Rocket className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
        </div>
      </section>

      {/* ════════════════ 5. SHORTCUTS GRID ════════════════ */}
      <section className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Atalhos</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <ShortcutItem
            icon={ClipboardList}
            label="Pedidos"
            sublabel="Gerenciar"
            onClick={() => router.push('/lojista/pedidos')}
          />
          <ShortcutItem
            icon={UtensilsCrossed}
            label="Produtos"
            sublabel="Fotos e specs"
            onClick={() => router.push('/lojista/produtos')}
          />
          <ShortcutItem
            icon={Percent}
            label="Cupons"
            sublabel="Criar ofertas"
            onClick={() => toast.info('Cupons em breve')}
          />
          <ShortcutItem
            icon={Clock}
            label="Horário"
            sublabel="Horários da loja"
            onClick={() => toast.info('Horários em breve')}
          />
          <ShortcutItem
            icon={Star}
            label="Avaliações"
            sublabel="Ver comentários"
            onClick={() => toast.info('Avaliações em breve')}
          />
          <ShortcutItem
            icon={BarChart3}
            label="Relatórios"
            sublabel="Ver vendas"
            onClick={() => toast.info('Relatórios em breve')}
          />
          <ShortcutItem
            icon={Bike}
            label="Entrega"
            sublabel="Configurações"
            onClick={() => toast.info('Entrega em breve')}
          />
          <ShortcutItem
            icon={Headset}
            label="Suporte"
            sublabel="Central de ajuda"
            onClick={() => toast.info('Suporte em breve')}
          />
        </div>
      </section>

      {/* ════════════════ 6. RECENT ORDERS ════════════════ */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Últimos pedidos</h2>
          <button
            onClick={() => router.push('/lojista/pedidos')}
            className="text-xs font-semibold flex items-center gap-0.5"
            style={{ color: PRIMARY }}
          >
            Ver todos
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {data.orders.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
              <ClipboardList className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhum pedido ainda hoje.</p>
            </div>
          )}
          {data.orders.map((order) => (
            <OrderCard key={order.id} order={order} formatBRL={formatBRL} />
          ))}
        </div>
      </section>

      {/* ════════════════ 7. PROMO BANNER ════════════════ */}
      <section className="px-4 mt-6">
        <div
          className="relative rounded-2xl overflow-hidden p-5"
          style={{ backgroundColor: '#111827' }}
        >
          {/* Decorative food image (right side, CSS gradient placeholder) */}
          <div
            className="absolute right-0 top-0 bottom-0 w-32 opacity-60"
            style={{
              background:
                'radial-gradient(circle at 70% 50%, rgba(245,158,11,0.4) 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <h3 className="text-base font-bold text-white">Aumente suas vendas</h3>
            <p className="text-xs text-white/70 mt-1 max-w-[60%] leading-relaxed">
              Divulgue sua loja e conquiste mais clientes no app!
            </p>
            <button
              onClick={() => toast.info('Criação de promoção em breve')}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white shadow-md"
              style={{ backgroundColor: '#16A34A' }}
            >
              <Rocket className="h-3.5 w-3.5" />
              Criar promoção
            </button>
          </div>
        </div>
      </section>

      {/* Mock data notice */}
      {data.hasMockData && (
        <div className="px-4 mt-4 mb-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Dados de demonstração. Vendas, pedidos e o perfil da loja são
              fictícios até o painel administrativo cadastrar sua loja real.
            </p>
          </div>
        </div>
      )}

      {/* ════════════════ SIDE MENU (Sheet) ════════════════ */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader
            className="p-4 pb-3"
            style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #0B4FE0 100%)` }}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-white/30">
                <AvatarImage src={data.user.profileImage || undefined} alt={firstName} />
                <AvatarFallback className="bg-white/20 text-white text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left min-w-0">
                <SheetTitle className="text-white text-base font-semibold truncate">
                  {storeName}
                </SheetTitle>
                <p className="text-[11px] text-white/70 truncate">{storeCategory}</p>
              </div>
            </div>
          </SheetHeader>

          <div className="py-2">
            {/* Wallet summary */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Saldo disponível
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatBRL(data.wallet.withdrawalCents)}
              </p>
              <button
                onClick={() => router.push('/lojista/financeiro')}
                className="text-[11px] font-semibold mt-1"
                style={{ color: PRIMARY }}
              >
                Ver financeiro completo →
              </button>
            </div>

            {/* Menu items */}
            <MenuItem label="Início" onClick={() => { setMenuOpen(false); router.push('/lojista/inicio') }} />
            <MenuItem label="Pedidos" onClick={() => { setMenuOpen(false); router.push('/lojista/pedidos') }} />
            <MenuItem label="Financeiro" onClick={() => { setMenuOpen(false); router.push('/lojista/financeiro') }} />
            <MenuItem label="Mais opções" onClick={() => { setMenuOpen(false); router.push('/lojista/mais') }} />

            <div className="border-t border-gray-100 my-2" />

            <MenuItem
              label="Sair do painel"
              icon={LogOut}
              destructive
              onClick={() => {
                logout()
                router.replace('/lojista/login')
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </LojistaAppShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickAction — small square action button in the sales card (Pedidos,
// Cardápio, Financeiro)
// ─────────────────────────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ClipboardList
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[56px]"
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: '#DBEAFE' }}
      >
        <Icon className="h-5 w-5" style={{ color: '#2563EB' }} strokeWidth={2.2} />
      </span>
      <span className="text-[10px] font-medium text-gray-700">{label}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ShortcutItem — item in the 4×2 shortcuts grid
// ─────────────────────────────────────────────────────────────────────────────
function ShortcutItem({
  icon: Icon,
  label,
  sublabel,
  onClick,
}: {
  icon: typeof ClipboardList
  label: string
  sublabel: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-1 active:scale-95 transition-transform"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: '#D1FAE5' }}
      >
        <Icon className="h-5 w-5" style={{ color: '#059669' }} strokeWidth={2.2} />
      </span>
      <div className="text-center">
        <p className="text-[11px] font-semibold text-gray-900 leading-tight">{label}</p>
        <p className="text-[9px] text-gray-400 leading-tight">{sublabel}</p>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderCard — a single recent order row
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  'preparo' | 'entrega' | 'entregue' | 'cancelado',
  { label: string; bg: string; fg: string; icon: typeof Clock }
> = {
  preparo: { label: 'Em preparo', bg: '#FEF3C7', fg: '#D97706', icon: Clock },
  entrega: { label: 'Saiu para entrega', bg: '#D1FAE5', fg: '#059669', icon: BikeIcon },
  entregue: { label: 'Entregue', bg: '#F3F4F6', fg: '#6B7280', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', bg: '#FEE2E2', fg: '#DC2626', icon: ChevronLeft },
}

function OrderCard({
  order,
  formatBRL,
}: {
  order: HomeData['orders'][number]
  formatBRL: (cents: number) => string
}) {
  const cfg = STATUS_CONFIG[order.status]
  const StatusIcon = cfg.icon
  const timeLabel =
    order.minutesAgo === 0
      ? 'Agora'
      : order.minutesAgo < 60
        ? `${order.minutesAgo} min`
        : `${Math.floor(order.minutesAgo / 60)}h`

  return (
    <button
      onClick={() => toast.info(`Pedido #${order.number} — detalhes em breve`)}
      className="w-full bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 hover:border-gray-200 transition-colors text-left"
    >
      {/* Product image placeholder */}
      <div
        className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: '#F3F4F6' }}
      >
        <UtensilsCrossed className="h-5 w-5 text-gray-400" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900">Pedido #{order.number}</p>
          <span className="text-[10px] text-gray-400">{timeLabel}</span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{order.itemsSummary}</p>
        <div
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full mt-1.5"
          style={{ backgroundColor: cfg.bg }}
        >
          <StatusIcon className="h-2.5 w-2.5" style={{ color: cfg.fg }} strokeWidth={2.5} />
          <span className="text-[9px] font-semibold" style={{ color: cfg.fg }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Price + chevron */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <p className="text-sm font-bold text-gray-900">{formatBRL(order.priceCents)}</p>
        <ChevronRight className="h-4 w-4 text-gray-300" />
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MenuItem — row in the side Sheet menu
// ─────────────────────────────────────────────────────────────────────────────
function MenuItem({
  label,
  icon: Icon,
  onClick,
  destructive,
}: {
  label: string
  icon?: typeof LogOut
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
    >
      {Icon && (
        <Icon className={`h-4 w-4 ${destructive ? 'text-red-500' : 'text-gray-500'}`} />
      )}
      <span className={`text-sm font-medium ${destructive ? 'text-red-500' : 'text-gray-700'}`}>
        {label}
      </span>
    </button>
  )
}
