'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Bell,
  Search,
  ChevronRight,
  ArrowUpToLine,
  Plus,
  ArrowDownToLine,
  Heart,
  Bike,
  ChevronDown,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import {
  MOBILE_CATEGORIES,
  MOBILE_QUICK_LINKS,
  formatBRL,
} from '@/components/mobile/mobile-categories'

// ============================================================================
// /mobile/inicio — Tela inicial do App Usuário NewMobility.
// ----------------------------------------------------------------------------
// Layout (fiel ao design):
//   1. Header azul fixo: status bar spacer, "Entregar para" + localização,
//      sino + avatar, campo de busca.
//   2. Card de carteira flutuante: saldo total real + 3 botões (Enviar /
//      Depositar / Receber) + link "Toque para ver histórico".
//   3. Grade de 8 categorias (4 col x 2 linhas) com ícones em fundo verde-água.
//   4. Banner promocional (carrossel com dots).
//   5. Produtos em destaque (scroll horizontal).
//   6. Atalhos rápidos (4 pills).
//   7. Bottom nav (no MobileAppShell).
//
// Dados:
//   - Wallet: API /api/mobile/home (lê as mesmas colunas de saldo do sistema).
//   - Localização: campo address/city/state do perfil do usuário.
//   - Banners/Produtos: API /api/mobile/home (mock se tabelas não existirem).
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'

interface HomeData {
  user: { id: string; name: string; profileImage: string | null; phone: string | null }
  wallet: {
    totalCents: number
    withdrawalCents: number
    shoppingCents: number
    foodCents: number
    pharmacyCents: number
    mobilityCents: number
    freeCents: number
  }
  location: { shortLabel: string; address: string | null }
  banners: Array<{
    id: string
    title: string
    subtitle: string
    ctaLabel: string
    ctaHref: string
    image?: string
    isMock?: boolean
  }>
  products: Array<{
    id: string
    name: string
    description?: string
    priceCents: number
    image?: string
    storeName?: string
    isMock?: boolean
  }>
  isClient: boolean
  hasMockData: boolean
}

export default function MobileInicioPage() {
  const router = useRouter()
  const { user, logout } = useStore()
  const { wallet: authWallet } = useMobileAuth()

  // NOTE: Desktop redirect (>= 768px → /) is handled globally by
  // <MobileDesktopRedirect /> in /mobile/layout.tsx. No need to duplicate
  // it here — that would cause a double-redirect race condition.
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [bannerIdx, setBannerIdx] = useState(0)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    if (!user?.id) {
      router.replace('/mobile/login')
      return
    }
    try {
      const resp = await apiFetch<HomeData>(`/mobile/home?userId=${user.id}`)
      setData(resp)
      // Secondary guard: if somehow a non-client reaches here, kick to login
      if (!resp.isClient) {
        logout()
        router.replace('/mobile/login')
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

  // Keep wallet in sync when the auth hook finishes (e.g. after a transfer).
  useEffect(() => {
    if (authWallet && data) {
      setData({ ...data, wallet: { ...data.wallet, ...authWallet } as HomeData['wallet'] })
    }
     
  }, [authWallet])

  // Banner auto-advance
  useEffect(() => {
    if (!data?.banners || data.banners.length <= 1) return
    const t = setInterval(() => {
      setBannerIdx((i) => (i + 1) % data.banners.length)
    }, 5000)
    return () => clearInterval(t)
  }, [data?.banners])

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  const firstName = data.user.name?.split(' ')[0] || 'usuário'

  return (
    <MobileAppShell>
      {/* ════════════════ 1. HEADER AZUL ════════════════ */}
      <header
        className="sticky top-0 z-10 pb-12 pt-3"
        style={{
          background: `linear-gradient(160deg, ${PRIMARY} 0%, #0B4FE0 100%)`,
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
        }}
      >
        {/* Row 1: location + bell + avatar */}
        <div className="px-4 pt-2 pb-2 flex items-center justify-between gap-3">
          {/* Location */}
          <button
            onClick={() => toast.info('Seleção de endereço em breve')}
            className="flex items-center gap-1.5 min-w-0 flex-1 min-h-[44px]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 flex-shrink-0">
              <MapPin className="h-4 w-4 text-white" />
            </span>
            <div className="text-left min-w-0">
              <p className="text-[10px] text-white/70 font-medium leading-none">Entregar para</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="text-sm font-semibold text-white truncate">
                  {data.location.shortLabel}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-white/80 flex-shrink-0" />
              </div>
            </div>
          </button>

          {/* Bell + Avatar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push('/mobile/notificacoes')}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4 text-white" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-400 ring-2 ring-blue-600" />
            </button>
            <button
              onClick={() => router.push('/mobile/perfil')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 overflow-hidden ring-2 ring-white/30 hover:ring-white/50 transition-all min-w-[44px] min-h-[44px]"
              aria-label="Perfil"
            >
              {data.user.profileImage ? (
                <img
                  src={data.user.profileImage}
                  alt={firstName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: search */}
        <div className="px-4 pb-3">
          <button
            onClick={() => router.push('/mobile/procurar')}
            className="w-full flex items-center gap-2.5 h-11 px-4 rounded-xl bg-white shadow-sm min-h-[44px]"
          >
            <Search className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">Procurar</span>
          </button>
        </div>
      </header>

      {/* ════════════════ 2. CARD DE CARTEIRA (flutuante) ════════════════ */}
      <div className="px-4 -mt-6 relative z-30">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            {/* Left: balance (clickable → /mobile/carteira).
                Using a <div role="button"> instead of <button> to avoid
                the invalid HTML "<button> inside <button>" (the eye toggle
                below is also a <button>). Nested buttons cause hydration
                errors in production (next build/next start). */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => router.push('/mobile/carteira')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/mobile/carteira') } }}
              className="text-left min-w-0 flex-1 min-h-[44px] flex flex-col justify-center cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-gray-500 font-medium">Saldo total</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowBalance((v) => !v)
                  }}
                  className="inline-flex h-4 w-4 items-center justify-center text-gray-400 hover:text-gray-700"
                  aria-label={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
                >
                  {showBalance ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="text-2xl font-bold text-gray-900 leading-tight">
                {showBalance ? `R$ ${formatBRL(data.wallet.totalCents)}` : 'R$ ••••'}
              </p>
              <span
                className="text-[11px] font-semibold inline-flex items-center gap-0.5 mt-0.5"
                style={{ color: GREEN }}
              >
                Toque para ver histórico
                <ChevronRight className="h-3 w-3" style={{ color: GREEN }} />
              </span>
            </div>

            {/* Right: 3 action buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <WalletAction
                icon={ArrowUpToLine}
                label="Enviar"
                onClick={() => router.push('/mobile/enviar')}
              />
              <WalletAction
                icon={Plus}
                label="Depositar"
                onClick={() => router.push('/mobile/depositar')}
              />
              <WalletAction
                icon={ArrowDownToLine}
                label="Receber"
                onClick={() => router.push('/mobile/receber')}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ════════════════ 3. GRADE DE CATEGORIAS ════════════════ */}
      <section className="px-4 mt-5">
        <div className="grid grid-cols-4 gap-3">
          {MOBILE_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon
            return (
              <motion.button
                key={cat.slug}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => router.push(`/mobile/${cat.slug}`)}
                className="flex flex-col items-center gap-1.5 min-h-[44px]"
              >
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: MINT_BG }}
                >
                  <Icon className="h-6 w-6" style={{ color: '#059669' }} strokeWidth={2} />
                </span>
                <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                  {cat.label}
                </span>
              </motion.button>
            )
          })}
        </div>
      </section>

      {/* ════════════════ 4. BANNER PROMOCIONAL ════════════════ */}
      {data.banners.length > 0 && (
        <section className="px-4 mt-5">
          <div className="relative rounded-2xl overflow-hidden shadow-md">
            {/* Banner content */}
            <div
              className="relative h-40 flex items-center"
              style={{
                background: `linear-gradient(105deg, #0F172A 0%, #1E293B 50%, #334155 100%)`,
              }}
            >
              {/* Decorative food image (gradient blob since no real image yet) */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2/5 opacity-60"
                style={{
                  background: `radial-gradient(circle at 70% 50%, ${PRIMARY}40, transparent 70%)`,
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Bike className="h-16 w-16 text-white/15" strokeWidth={1.5} />
              </div>

              {/* Text content */}
              <div className="relative z-10 px-5 max-w-[65%]">
                <h3 className="text-xl font-bold text-white leading-tight">
                  {data.banners[bannerIdx].title}
                </h3>
                <p className="text-xs text-white/80 mt-1 leading-relaxed">
                  {data.banners[bannerIdx].subtitle}
                </p>
                <button
                  onClick={() => router.push(data.banners[bannerIdx].ctaHref)}
                  className="mt-3 inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                  style={{ backgroundColor: GREEN }}
                >
                  <Bike className="h-3.5 w-3.5" />
                  {data.banners[bannerIdx].ctaLabel}
                </button>
              </div>

              {data.banners[bannerIdx].isMock && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[9px] font-bold">
                  DEMO
                </span>
              )}
            </div>

            {/* Pagination dots */}
            {data.banners.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-2 bg-white">
                {data.banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIdx(i)}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === bannerIdx ? 18 : 6,
                      backgroundColor: i === bannerIdx ? PRIMARY : '#D1D5DB',
                    }}
                    aria-label={`Banner ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ════════════════ 5. PRODUTOS EM DESTAQUE ════════════════ */}
      <section className="mt-5">
        <div className="px-4 flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Produtos em destaque</h2>
          <button
            onClick={() => toast.info('Ver todos em breve')}
            className="text-xs font-semibold flex items-center gap-0.5"
            style={{ color: PRIMARY }}
          >
            Ver todos
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
          {data.products.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex-shrink-0 w-40 rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Product image */}
              <div className="relative h-28 bg-gray-100">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="h-full w-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${MINT_BG} 0%, #F0FDF4 100%)` }}
                  >
                    <Search className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                {/* Favorite heart */}
                <button
                  onClick={() => toggleFav(product.id)}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-sm min-w-[44px] min-h-[44px]"
                  aria-label="Favoritar"
                >
                  <Heart
                    className="h-4 w-4"
                    style={{
                      color: favorites.has(product.id) ? '#EF4444' : '#9CA3AF',
                      fill: favorites.has(product.id) ? '#EF4444' : 'none',
                    }}
                  />
                </button>
                {product.isMock && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-white text-[8px] font-bold">
                    DEMO
                  </span>
                )}
              </div>
              {/* Product info */}
              <div className="p-3">
                {product.storeName && (
                  <p className="text-[10px] text-gray-400 mb-0.5 truncate">{product.storeName}</p>
                )}
                <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2rem]">
                  {product.name}
                </p>
                {product.description && (
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{product.description}</p>
                )}
                <p className="text-sm font-bold text-gray-900 mt-1.5">
                  R$ {formatBRL(product.priceCents)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════════════ 6. ATALHOS RÁPIDOS ════════════════ */}
      <section className="px-4 mt-5">
        <div className="grid grid-cols-2 gap-3">
          {MOBILE_QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.slug}
                onClick={() => router.push(`/mobile/${link.slug}`)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow min-h-[44px]"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ backgroundColor: MINT_BG }}
                >
                  <Icon className="h-5 w-5" style={{ color: '#059669' }} strokeWidth={2} />
                </span>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{link.label}</p>
                  <p className="text-[11px] font-medium flex items-center gap-0.5" style={{ color: PRIMARY }}>
                    Ver mais
                    <ChevronRight className="h-3 w-3" />
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ════════════════ Mock data notice ════════════════ */}
      {data.hasMockData && (
        <div className="px-4 mt-5">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Banners e produtos em demonstração. Em breve, lojas e produtos
              reais gerenciados pelo painel administrativo.
            </p>
          </div>
        </div>
      )}

      {/* ════════════════ Footer spacer (bottom nav + FAB) ════════════════ */}
      <div className="h-24" />
    </MobileAppShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WalletAction — small square blue button (Enviar / Depositar / Receber)
// ─────────────────────────────────────────────────────────────────────────────
function WalletAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ArrowUpToLine
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px]"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
        style={{ backgroundColor: PRIMARY }}
      >
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="text-[10px] font-medium text-gray-700">{label}</span>
    </button>
  )
}
