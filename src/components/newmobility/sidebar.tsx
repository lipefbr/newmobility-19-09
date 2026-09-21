'use client'

import {
  Home,
  Smartphone,
  Building2,
  User,
  CreditCard,
  ShoppingCart,
  Store,
  Gamepad2,
  Trophy,
  Gift,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Wallet,
  Ticket,
  Headphones,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Circle,
  Bell,
  Sparkles,
  Zap,
  Shield,
  BarChart3,
  Target,
  Calculator,
  Flame,
  ShoppingBag,
  Wrench,
  Network,
  FileText,
  ShieldCheck,
  Wifi,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react'
import { useStore, type PageKey } from '@/lib/store'
import { cn, getPlanName, formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
  isDriverQualification,
  isDeliveryQualification,
  isConductorQualification,
  isLojistaQualification,
  resolveUserQualification,
} from '@/lib/qualifications'
import { SidebarSearch } from './search/search-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

// Task 2-c / Item 7 — shape returned by the public /api/gratifications-config
// endpoint. Used to decide whether to show the "Metas" (gratifications) menu
// item to the current user.
interface MetasConfig {
  // Legacy single-value field ('motorista' | 'entregador' | 'ambos'). Kept
  // for backwards compatibility — superseded by `allowedQualifications`.
  targetQualification?: 'motorista' | 'entregador' | 'ambos'
  // Task 2-c / Item 7.3 — preferred array-based config. JSON array stored on
  // the SystemConfig table under the key `metas.allowedQualifications`.
  // Example: ["motorista","entregador"]. When present and non-empty, this is
  // the authoritative source of truth; the legacy targetQualification is only
  // consulted as a fallback when allowedQualifications is missing.
  allowedQualifications?: string[]
}

// Decide whether the current user is allowed to see the Metas menu item based
// on the admin-configured `allowedQualifications` (preferred) or the legacy
// `targetQualification` (fallback). Falls back to true (visible) when the
// config can't be loaded — this preserves the original behaviour for
// motorista/entregador users on first run before the admin sets anything.
//
// "Motorista" identity is inferred from any of:
//   - userType === 'motorista' (UserType.code set by admin)
//   - qualification === 'motorista'
//   - isDriver === true (legacy boolean flag)
// Plus the new conductor categories that are motorista-equivalent:
//   - mototaxista, motorista_app, taxista (also transport passengers)
//
// "Entregador" identity is inferred from:
//   - userType === 'entregador'
//   - qualification === 'entregador'
//   - isDelivery === true (legacy boolean flag)
// Plus the new conductor categories that are entregador-equivalent:
//   - motofretista, caminhoneiro (also transport cargo)
//
// The helpers `isDriverQualification` / `isDeliveryQualification` /
// `resolveUserQualification` (from @/lib/qualifications) centralise the
// resolution so we don't repeat the fallback chain in every component.
function userCanSeeMetas(
  user: { userType?: string; qualification?: string | null; isDriver?: boolean; isDelivery?: boolean } | null,
  config: MetasConfig | null
): boolean {
  const u = user as any
  // Resolve the qualification code from any of the possible fields
  const qual = resolveUserQualification({
    qualification: u?.qualification,
    userType: u?.userType,
    isDriver: u?.isDriver,
    isDelivery: u?.isDelivery,
  })
  const isMotorista = isDriverQualification(qual) || u?.isDriver === true
  const isEntregador = isDeliveryQualification(qual) || u?.isDelivery === true

  // Preferred path: array-based `allowedQualifications` from SystemConfig
  // (key `metas.allowedQualifications`). An empty array hides the module
  // from everyone; a missing array falls through to the legacy logic.
  const allowed = config?.allowedQualifications
  if (Array.isArray(allowed)) {
    if (allowed.length === 0) return false
    const matches = allowed.some((code) => {
      const c = String(code || '').toLowerCase()
      if (c === 'motorista') return isMotorista
      if (c === 'entregador') return isEntregador
      // Unknown codes are ignored (defensive — admin form only exposes
      // motorista/entregador, but the array may contain custom codes
      // added by future admin tooling).
      return false
    })
    return matches
  }

  // Legacy fallback — single-value `targetQualification` stored on the
  // Gratification row with type='driver_goals_config'.
  const target = config?.targetQualification || 'ambos'
  if (target === 'motorista') return isMotorista
  if (target === 'entregador') return isEntregador
  // 'ambos' (or any unknown value) — show to motorista OR entregador only.
  return isMotorista || isEntregador
}

interface MenuItem {
  key: PageKey
  labelKey: string
  icon: React.ElementType
  groupKey: string
  isNew?: boolean
  isBeta?: boolean
  shortcut?: string
  adminOnly?: boolean
  lojistaOnly?: boolean
}

const allMenuItems: MenuItem[] = [
  { key: 'dashboard', labelKey: 'sidebar.dashboard', icon: Home, groupKey: 'sidebar.group.main', shortcut: '⌘1' },
  { key: 'apps', labelKey: 'sidebar.apps', icon: Smartphone, groupKey: 'sidebar.group.main', shortcut: '⌘2' },
  { key: 'talkmobi', labelKey: 'sidebar.talkmobi', icon: Wifi, groupKey: 'sidebar.group.main', isNew: true },
  { key: 'telemedicina', labelKey: 'sidebar.telemedicina', icon: HeartPulse, groupKey: 'sidebar.group.main', isNew: true },
  { key: 'bank', labelKey: 'sidebar.bank', icon: Building2, groupKey: 'sidebar.group.main' },
  { key: 'profile', labelKey: 'sidebar.profile', icon: User, groupKey: 'sidebar.group.main' },
  { key: 'kyc', labelKey: 'sidebar.kyc', icon: ShieldCheck, groupKey: 'sidebar.group.main', isNew: true },
  { key: 'billing', labelKey: 'sidebar.billing', icon: FileText, groupKey: 'sidebar.group.main', isNew: true },
  { key: 'myplan', labelKey: 'sidebar.myplan', icon: CreditCard, groupKey: 'sidebar.group.main' },
  { key: 'purchases', labelKey: 'sidebar.purchases', icon: ShoppingCart, groupKey: 'sidebar.group.main' },
  { key: 'marketplace', labelKey: 'sidebar.marketplace', icon: ShoppingBag, groupKey: 'sidebar.group.main', isNew: true },
  { key: 'services', labelKey: 'sidebar.services', icon: Wrench, groupKey: 'sidebar.group.main', isNew: true },
  { key: 'portal-lojista', labelKey: 'sidebar.portal-lojista', icon: Store, groupKey: 'sidebar.group.portals', isBeta: true, lojistaOnly: true },
  { key: 'portal-gamer', labelKey: 'sidebar.portal-gamer', icon: Gamepad2, groupKey: 'sidebar.group.portals', isBeta: true },
  { key: 'portal-sportbet', labelKey: 'sidebar.portal-sportbet', icon: Trophy, groupKey: 'sidebar.group.portals', isBeta: true },
  { key: 'gratifications', labelKey: 'sidebar.gratifications', icon: Gift, groupKey: 'sidebar.group.financial' },
  { key: 'points', labelKey: 'sidebar.points', icon: Star, groupKey: 'sidebar.group.financial' },
  { key: 'career', labelKey: 'sidebar.career', icon: TrendingUp, groupKey: 'sidebar.group.financial' },
  { key: 'referrals', labelKey: 'sidebar.referrals', icon: Users, groupKey: 'sidebar.group.financial', shortcut: '⌘3' },
  { key: 'minha-rede', labelKey: 'sidebar.minha-rede', icon: Network, groupKey: 'sidebar.group.financial', isNew: true },
  { key: 'cashback', labelKey: 'sidebar.cashback', icon: DollarSign, groupKey: 'sidebar.group.financial', shortcut: '⌘4' },
  { key: 'financial', labelKey: 'sidebar.financial', icon: Wallet, groupKey: 'sidebar.group.financial', shortcut: '⌘5' },
  { key: 'voucher', labelKey: 'sidebar.voucher', icon: Ticket, groupKey: 'sidebar.group.financial' },
  { key: 'simulator', labelKey: 'sidebar.simulator', icon: Calculator, groupKey: 'sidebar.group.financial' },
  { key: 'leaderboard', labelKey: 'sidebar.leaderboard', icon: BarChart3, groupKey: 'sidebar.group.financial', isNew: true },
  { key: 'gamification', labelKey: 'sidebar.gamification', icon: Flame, groupKey: 'sidebar.group.financial' },
  { key: 'events', labelKey: 'sidebar.events', icon: Bell, groupKey: 'sidebar.group.system', isNew: true },
  { key: 'reports', labelKey: 'sidebar.reports', icon: BarChart3, groupKey: 'sidebar.group.system' },
  { key: 'support', labelKey: 'sidebar.support', icon: Headphones, groupKey: 'sidebar.group.system', shortcut: '⌘?' },
  { key: 'admin', labelKey: 'sidebar.admin', icon: Shield, groupKey: 'sidebar.group.system', adminOnly: true },
]

export function Sidebar() {
  const { activePage, setActivePage, logout, sidebarCollapsed, setSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen, user } = useStore()
  const { t } = useTranslation()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  // Task 2-c / Item 7 — admin-configured Metas module visibility.
  // Loaded once on mount from the public /api/gratifications-config endpoint
  // (no admin role required). When null (loading or fetch error) we keep the
  // Metas item visible by default — `userCanSeeMetas` falls back to 'ambos'.
  const [metasConfig, setMetasConfig] = useState<MetasConfig | null>(null)
  // Tarefa 2 (22/09): config para ativar/desativar Bet e Jogos
  const [featuresConfig, setFeaturesConfig] = useState<{ bet_enabled?: string; games_enabled?: string }>({})

  useEffect(() => {
    let cancelled = false
    async function loadConfig() {
      try {
        const data = await apiFetch<MetasConfig>('/gratifications-config')
        if (!cancelled && data && (data.allowedQualifications || data.targetQualification)) {
          setMetasConfig(data)
        }
      } catch {
        // Silent fail
      }
      // Tarefa 2 (22/09): carrega features configs (bet_enabled, games_enabled)
      try {
        const settingsRes = await apiFetch<{ settings: Array<{ key: string; value: string }> }>('/system-settings/public')
        if (!cancelled && settingsRes?.settings) {
          const map: Record<string, string> = {}
          for (const s of settingsRes.settings) map[s.key] = s.value
          setFeaturesConfig({
            bet_enabled: map['features.bet_enabled'] ?? 'true',
            games_enabled: map['features.games_enabled'] ?? 'true',
          })
        }
      } catch {
        // Silent fail — mantém defaults (true = visível)
      }
    }
    loadConfig()
    return () => { cancelled = true }
  }, [])

  const handleItemClick = (key: PageKey) => {
    setActivePage(key)
    setMobileSidebarOpen(false)
  }

  const handleLogout = () => {
    if (!showLogoutConfirm) {
      setShowLogoutConfirm(true)
      setTimeout(() => setShowLogoutConfirm(false), 3000)
      return
    }
    logout()
  }

  // Filter menu items based on user role (admin-only items hidden for normal users)
  const isAdmin = user?.role === 'admin'
  // A user is a "Lojista" if their qualification (or userType) matches the
  // lojista category. We use the centralised `isLojistaQualification` helper
  // so both 'lojista' and the legacy 'comercio' code are recognised, and we
  // also check `userType === 'lojista'` for backward compat with users
  // created via the admin "Tipos de Usuário" flow.
  const isLojista =
    user?.userType === 'lojista' ||
    isLojistaQualification(user?.qualification) ||
    isLojistaQualification(user?.userType)
  // Task 2-c / Item 7 — Metas (gratifications) menu item is gated by the
  // admin-configured targetQualification. Only motorista/entregador users
  // (and the new conductor categories: mototaxista, motofretista,
  // motorista_app, taxista, caminhoneiro) matching the config see it.
  // Admins always see it so they can preview.
  const canSeeMetas = isAdmin || userCanSeeMetas(user, metasConfig)
  const menuItems = allMenuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    if (item.lojistaOnly && !isLojista) return false
    if (item.key === 'gratifications' && !canSeeMetas) return false
    // Tarefa 2 (22/09): admin pode desativar Bet e Jogos via SystemConfig
    if (item.key === 'portal-sportbet' && featuresConfig.bet_enabled === 'false') return false
    if (item.key === 'portal-gamer' && featuresConfig.games_enabled === 'false') return false
    if ((item.key === 'bets' || item.key === 'jogos') && featuresConfig.games_enabled === 'false') return false
    return true
  })

  // Group menu items
  const groupedItems: { groupKey: string; items: MenuItem[] }[] = []
  let currentGroup = ''
  for (const item of menuItems) {
    if (item.groupKey !== currentGroup) {
      currentGroup = item.groupKey
      groupedItems.push({ groupKey: currentGroup, items: [item] })
    } else {
      groupedItems[groupedItems.length - 1].items.push(item)
    }
  }

  // Check if user has PRO plan (blue5+)
  const isProPlan = user?.plan === 'blue5'

  const sidebarContent = (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full bg-gradient-to-b from-gray-950 to-gray-900 backdrop-blur-xl">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-lg shrink-0 shadow-lg shadow-emerald-500/25 animate-glow">
            NM
          </div>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-white font-bold text-base truncate">NewMobility</span>
              <span className="text-emerald-400 text-xs truncate">{t('header.backoffice')}</span>
            </motion.div>
          )}
          {/* Desktop collapse button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex ml-auto text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          </Button>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-auto text-white/60 hover:text-white hover:bg-white/10 h-11 w-11 shrink-0"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User info with glow effect */}
        {!sidebarCollapsed && user && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
              <div className="relative">
                <Avatar className="h-9 w-9 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20">
                  <AvatarFallback className="bg-emerald-700 text-white text-sm">
                    {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator with glow */}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-gray-950 animate-pulse-glow" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white text-sm font-medium truncate">{user.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-xs truncate">{user.referralCode}</span>
                  {/* PRO badge with premium effect */}
                  {isProPlan ? (
                    <Badge className="h-4 px-1.5 text-[9px] bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shrink-0 shadow-md shadow-amber-500/30 font-bold tracking-wider">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      PRO
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-emerald-600/30 text-emerald-300 border-0 shrink-0">
                      {getPlanName(user.plan)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {sidebarCollapsed && user && (
          <div className="px-2 py-3 border-b border-white/10 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-9 w-9 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20">
                    <AvatarFallback className="bg-emerald-700 text-white text-sm">
                      {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-gray-950" />
                  {isProPlan && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 border border-gray-950 animate-pulse-soft" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <p className="font-medium">{user.name}</p>
                <p className="text-muted-foreground">{getPlanName(user.plan)}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Search input - only show when not collapsed */}
        {!sidebarCollapsed && <SidebarSearch />}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scrollbar px-2 py-2 scroll-smooth relative">
          {/* Top fade gradient overlay */}
          <div className="sticky top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-10" />
          <div className="space-y-1">
            {groupedItems.map((group, gi) => (
              <div key={group.groupKey}>
                {/* Group label with gradient fade separator */}
                {gi > 0 && !sidebarCollapsed && (
                  <div className="mx-3 my-2 relative h-px">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  </div>
                )}
                {!sidebarCollapsed && (
                  <div className="px-3 pt-2 pb-1 first:pt-0">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                      {t(group.groupKey)}
                    </span>
                  </div>
                )}
                {sidebarCollapsed && gi > 0 && (
                  <div className="mx-3 my-2 relative h-px">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                )}
                {/* Group items */}
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activePage === item.key
                  
                  const menuItem = (
                    <motion.button
                      key={item.key}
                      onClick={() => handleItemClick(item.key)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 min-h-[44px] lg:min-h-0 lg:py-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative group/item touch-manipulation",
                        isActive
                          ? "text-white shadow-lg relative overflow-hidden"
                          : "text-white/60 hover:text-white hover:bg-white/8"
                      )}
                      whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Active background with animated gradient */}
                      {isActive && (
                        <motion.div
                          layoutId="activeBg"
                          className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg"
                          layout
                          transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
                        />
                      )}
                      {/* Active shimmer effect */}
                      {isActive && (
                        <div className="absolute inset-0 animate-shimmer rounded-lg" />
                      )}
                      {/* Active indicator bar */}
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-300 rounded-r-full z-10"
                          layout
                          transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
                        />
                      )}
                      <Icon className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-colors relative z-10",
                        isActive ? "text-white" : "text-emerald-400 group-hover/item:text-emerald-300"
                      )} />
                      {!sidebarCollapsed && (
                        <span className="truncate relative z-10">{t(item.labelKey)}</span>
                      )}
                      {/* New badge */}
                      {item.isNew && !sidebarCollapsed && (
                        <Badge className="bg-rose-500 text-white text-[8px] px-1.5 py-0 h-4 border-0 ml-auto relative z-10 animate-bounce-subtle">
                          NOVO
                        </Badge>
                      )}
                      {/* Beta badge */}
                      {item.isBeta && !item.isNew && !sidebarCollapsed && (
                        <Badge className="bg-amber-500/80 text-white text-[8px] px-1.5 py-0 h-4 border-0 ml-auto relative z-10">
                          BETA
                        </Badge>
                      )}
                      {item.isNew && sidebarCollapsed && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full z-10" />
                      )}
                      {item.isBeta && !item.isNew && sidebarCollapsed && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full z-10" />
                      )}
                      {/* Keyboard shortcut hint */}
                      {item.shortcut && !sidebarCollapsed && !item.isNew && !item.isBeta && (
                        <span className="kbd-shortcut ml-auto relative z-10">{item.shortcut}</span>
                      )}
                    </motion.button>
                  )

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.key}>
                        <TooltipTrigger asChild>
                          {menuItem}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs flex items-center gap-2">
                          <span>{t(item.labelKey)}</span>
                          {item.isNew && (
                            <Badge className="bg-rose-500 text-white text-[8px] px-1 py-0 h-3.5 border-0">
                              NOVO
                            </Badge>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return menuItem
                })}
              </div>
            ))}
          </div>
          {/* Bottom fade gradient overlay */}
          <div className="sticky bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none z-10" />
        </nav>

        {/* Quick Stats Row at bottom */}
        {!sidebarCollapsed && user && (
          <div className="px-4 py-2 border-t border-white/10">
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] text-gray-400">Saldo:</span>
                <span className="text-[10px] font-bold text-emerald-400">{formatCurrency(user.balanceWithdrawal)}</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] text-gray-400">Refs:</span>
                <span className="text-[10px] font-bold text-blue-400">6</span>
              </div>
            </div>
          </div>
        )}

        {/* Version & Logout with confirmation tooltip */}
        <div className="px-2 pb-3 pt-2 border-t border-white/10">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative overflow-hidden group/logout"
                style={{ color: showLogoutConfirm ? '#f87171' : undefined }}
                onMouseLeave={() => setShowLogoutConfirm(false)}
              >
                <div className={`absolute inset-0 rounded-lg transition-colors ${showLogoutConfirm ? 'bg-red-500/15' : 'group-hover/logout:bg-red-500/10'}`} />
                <LogOut className={`h-4.5 w-4.5 shrink-0 relative z-10 transition-colors ${showLogoutConfirm ? 'text-red-400' : 'text-red-400/70 group-hover/logout:text-red-400'}`} />
                {!sidebarCollapsed && (
                  <span className="relative z-10 transition-colors text-red-400/70 group-hover/logout:text-red-400">
                    {showLogoutConfirm ? 'Confirmar saída?' : t('sidebar.logout')}
                  </span>
                )}
                {!sidebarCollapsed && showLogoutConfirm && (
                  <Zap className="h-3.5 w-3.5 text-red-400 ml-auto relative z-10 animate-pulse-soft" />
                )}
              </button>
            </TooltipTrigger>
            {!showLogoutConfirm && (
              <TooltipContent side="right" className="text-xs">
                Clique duas vezes para sair
              </TooltipContent>
            )}
          </Tooltip>
          {!sidebarCollapsed && (
            <p className="text-[10px] text-gray-600 text-center mt-2">v1.0.0</p>
          )}
        </div>
      </div>
    </TooltipProvider>
  )

  return (
    <>
      {/* Desktop Sidebar - Fixed position */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-30 border-r border-white/10",
          sidebarCollapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Glow effect on right border */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/10 to-emerald-500/40" />
        {sidebarContent}
      </aside>
      {/* Spacer to account for fixed sidebar */}
      <div className={cn("hidden lg:block shrink-0", sidebarCollapsed ? "w-[68px]" : "w-64")} />

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.aside
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            exit={{ x: -288 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 bottom-0 w-72 z-50 lg:hidden"
          >
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 via-emerald-500/10 to-emerald-500/40" />
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
