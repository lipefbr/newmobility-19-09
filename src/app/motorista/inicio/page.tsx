'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Menu,
  ChevronDown,
  Loader2,
  ShieldAlert,
  LogOut,
  Crosshair,
  Car,
  Navigation,
  Star,
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
import { MotoristaAppShell } from '@/components/motorista/motorista-app-shell'

// ============================================================================
// /motorista/inicio — Tela inicial do App Motorista NewMobility.
// ----------------------------------------------------------------------------
// Layout (fiel ao design anexado — "map-first ride-hailing"):
//   1. Header azul fixo: menu hambúrguer + "Olá, Motorista / Nome" + sino + avatar
//   2. Card de status flutuante: "Você está Online/Offline" + toggle verde
//   3. Mapa simulado (grid de ruas + labels de bairros de São Paulo)
//   4. GPS button (canto inferior esquerdo) — recentra o mapa
//   5. Stats overlay (ganhos hoje / corridas / avaliação)
//   6. Bottom nav (no MotoristaAppShell) com FAB central de carro
//
// Dados:
//   - Wallet/stats: API /api/motorista/home (lê as mesmas colunas de saldo).
//   - Online status: estado transitório client-side (toggle).
//   - Vehicle: mock até o modelo Vehicle existir no schema.
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
    mobilityCents: number
    gratificationCents: number
  }
  stats: {
    totalRides: number
    stars: number
    todayEarningsCents: number
    weekEarningsCents: number
    isMock: boolean
  }
  vehicle: {
    model: string | null
    plate: string | null
    type: string | null
    isMock: boolean
  }
  isDriver: boolean
  blockReason: string | null
}

export default function MotoristaInicioPage() {
  const router = useRouter()
  const { user, logout } = useStore()
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.id) {
      router.replace('/motorista/login')
      return
    }
    try {
      const resp = await apiFetch<HomeData>(`/motorista/home?userId=${user.id}`)
      setData(resp)
      if (!resp.isDriver) {
        logout()
        router.replace('/motorista/login')
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
        <p className="text-sm text-gray-500 mt-2">Carregando...</p>
      </div>
    )
  }

  if (!data) return null

  const firstName = data.user.name?.split(' ')[0] || 'Motorista'
  const initials = data.user.name
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('') || 'MO'

  return (
    <MotoristaAppShell>
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
              <p className="text-[10px] text-white/70 font-medium leading-none">Olá, Motorista</p>
              <button
                onClick={() => setMenuOpen(true)}
                className="flex items-center gap-1 mt-0.5 min-w-0"
              >
                <span className="text-sm font-semibold text-white truncate">{data.user.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-white/80 flex-shrink-0" />
              </button>
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
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-400 ring-2" style={{ '--tw-ring-color': PRIMARY } as React.CSSProperties} />
            </button>
            <button
              onClick={() => router.push('/motorista/mais')}
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

      {/* ════════════════ MAPA + OVERLAYS ════════════════ */}
      <div className="relative" style={{ height: 'calc(100vh - 64px - env(safe-area-inset-top) - 88px)' }}>
        {/* 2. Card de status flutuante */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-3 left-3 right-3 z-20"
        >
          <div className="bg-white rounded-2xl shadow-lg border border-gray-50 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500 font-medium leading-none">Você está</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="text-base font-bold"
                  style={{ color: isOnline ? GREEN : '#9CA3AF' }}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {isOnline && (
                  <span
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: GREEN }}
                  />
                )}
              </div>
            </div>
            <Switch
              checked={isOnline}
              onCheckedChange={(v) => {
                setIsOnline(v)
                toast.success(v ? 'Você está online — disponível para corridas' : 'Você está offline')
              }}
              aria-label="Alternar status online"
            />
          </div>
        </motion.div>

        {/* 3. Mapa simulado */}
        <SimulatedMap />

        {/* Stats overlay (top-right of map, below status card) */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute top-24 right-3 z-20 space-y-2"
        >
          <StatPill
            icon={TrendingUp}
            label="Ganhos hoje"
            value={`R$ ${((data.stats.todayEarningsCents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            isMock={data.stats.isMock}
          />
          <StatPill
            icon={Car}
            label="Corridas"
            value={String(data.stats.totalRides)}
          />
          <StatPill
            icon={Star}
            label="Avaliação"
            value={`${(data.stats.stars || 0).toFixed(1)} ★`}
          />
        </motion.div>

        {/* 4. GPS button (bottom-left, above nav) */}
        <button
          onClick={() => toast.info('Mapa centralizado na sua localização')}
          className="absolute bottom-4 left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg border border-gray-100 hover:bg-gray-50 transition-colors min-w-[44px] min-h-[44px]"
          aria-label="Centralizar mapa"
        >
          <Crosshair className="h-5 w-5" style={{ color: PRIMARY }} strokeWidth={2.5} />
        </button>

        {/* Vehicle info chip (bottom-center, above FAB) */}
        {data.vehicle.model && (
          <div className="absolute bottom-4 right-4 z-20 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2">
            <Car className="h-4 w-4" style={{ color: PRIMARY }} />
            <div>
              <p className="text-[10px] text-gray-500 leading-none">{data.vehicle.plate || '—'}</p>
              <p className="text-xs font-semibold text-gray-900 leading-tight">{data.vehicle.model}</p>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════ SIDE MENU (Sheet) ════════════════ */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="p-4 pb-3" style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #0B4FE0 100%)` }}>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-white/30">
                <AvatarImage src={data.user.profileImage || undefined} alt={firstName} />
                <AvatarFallback className="bg-white/20 text-white text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <SheetTitle className="text-white text-base font-semibold">{data.user.name}</SheetTitle>
                <p className="text-[11px] text-white/70">Motorista NewMobility</p>
              </div>
            </div>
          </SheetHeader>

          <div className="py-2">
            {/* Wallet summary */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Saldo disponível</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {((data.wallet.withdrawalCents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <button
                onClick={() => router.push('/motorista/carteira')}
                className="text-[11px] font-semibold mt-1"
                style={{ color: PRIMARY }}
              >
                Ver carteira completa →
              </button>
            </div>

            {/* Menu items */}
            <MenuItem label="Início" onClick={() => { setMenuOpen(false); router.push('/motorista/inicio') }} />
            <MenuItem label="Minhas corridas" onClick={() => { setMenuOpen(false); router.push('/motorista/corridas') }} />
            <MenuItem label="Carteira" onClick={() => { setMenuOpen(false); router.push('/motorista/carteira') }} />
            <MenuItem label="Mais opções" onClick={() => { setMenuOpen(false); router.push('/motorista/mais') }} />

            <div className="border-t border-gray-100 my-2" />

            <MenuItem
              label="Sair do app"
              icon={LogOut}
              destructive
              onClick={() => {
                logout()
                router.replace('/motorista/login')
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </MotoristaAppShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SimulatedMap — placeholder for the real map (Mapbox/Google Maps). Shows a
// stylized street grid with São Paulo neighborhood labels so the UI looks
// alive without an API key. Will be replaced by a real <Map> component.
// ─────────────────────────────────────────────────────────────────────────────
function SimulatedMap() {
  const NEIGHBORHOODS = [
    { name: 'PINHEIROS', x: '20%', y: '25%' },
    { name: 'JARDINS', x: '55%', y: '30%' },
    { name: 'VILA OLÍMPIA', x: '70%', y: '55%' },
    { name: 'ITAIM BIBI', x: '45%', y: '60%' },
    { name: 'MOEMA', x: '25%', y: '75%' },
  ]
  const STREETS = [
    { label: 'Av. Rebouças', x: '15%', y: '40%', rotate: -25 },
    { label: 'Av. Paulista', x: '60%', y: '20%', rotate: 0 },
    { label: 'Av. Santo Amaro', x: '80%', y: '70%', rotate: 35 },
  ]

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg, #E8F0FE 0%, #F0F9FF 50%, #ECFEFF 100%)
        `,
      }}
    >
      {/* Street grid lines */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CBD5E1" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <pattern id="gridMajor" width="160" height="160" patternUnits="userSpaceOnUse">
            <path d="M 160 0 L 0 0 0 160" fill="none" stroke="#94A3B8" strokeWidth="1.2" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#gridMajor)" />

        {/* "Avenues" — thicker diagonal/curved roads */}
        <line x1="0%" y1="40%" x2="100%" y2="60%" stroke="#94A3B8" strokeWidth="3" opacity="0.5" />
        <line x1="60%" y1="0%" x2="40%" y2="100%" stroke="#94A3B8" strokeWidth="3" opacity="0.5" />
        <line x1="80%" y1="0%" x2="100%" y2="80%" stroke="#94A3B8" strokeWidth="2.5" opacity="0.5" />

        {/* "Park" — green blob (Ibirapuera) */}
        <ellipse cx="30%" cy="80%" rx="60" ry="40" fill="#86EFAC" opacity="0.4" />
      </svg>

      {/* Neighborhood labels */}
      {NEIGHBORHOODS.map((n) => (
        <div
          key={n.name}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: n.x, top: n.y }}
        >
          <span className="text-[10px] font-bold text-gray-400 tracking-wider bg-white/40 px-1.5 py-0.5 rounded">
            {n.name}
          </span>
        </div>
      ))}

      {/* Street labels */}
      {STREETS.map((s) => (
        <div
          key={s.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: s.x, top: s.y, transform: `translate(-50%, -50%) rotate(${s.rotate}deg)` }}
        >
          <span className="text-[9px] text-gray-500 italic">{s.label}</span>
        </div>
      ))}

      {/* Driver location pin (center) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          {/* Pulsing halo */}
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: PRIMARY + '40', width: 48, height: 48, left: -12, top: -12 }}
          />
          {/* Pin */}
          <div
            className="relative flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white shadow-lg"
            style={{ backgroundColor: PRIMARY }}
          >
            <Car className="h-3 w-3 text-white" strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div className="absolute bottom-2 right-3">
        <span className="text-[9px] text-gray-300 font-medium">NewMobility Maps</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StatPill — small floating stat card on the map
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({
  icon: Icon,
  label,
  value,
  isMock,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  isMock?: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-50 px-3 py-2 min-w-[120px]">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-gray-400" />
        <span className="text-[10px] text-gray-500 font-medium">{label}</span>
        {isMock && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-bold">DEMO</span>}
      </div>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
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
