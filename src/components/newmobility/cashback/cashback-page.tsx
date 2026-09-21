'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MatrixVisualization } from './matrix-visualization'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { DollarSign, TrendingUp, ShoppingBag, ArrowDownRight, Download, TrendingDown, Users, Layers, BarChart3, Activity, Wallet } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { EmptyState } from '../ui/empty-states'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'

// Initial loading state — replaced with API data on mount.
// All values are MEMBER COUNTS (not monetary totals). Privacy
// requirement: no personal R$ earnings on user-facing pages.
// `total` here represents the size of the user's network in that
// matrix (entrada/residual/vendas). `lastMonth` / `lastWeek` /
// `pending` are left at 0 until the API exposes per-period
// member counts — the UI now displays them as counts, not R$.
const INITIAL_CASHBACK_SUMMARY = {
  entrada: { total: 0, lastMonth: 0, lastWeek: 0, pending: 0, totalUsers: 0 },
  residual: { total: 0, lastMonth: 0, lastWeek: 0, pending: 0, totalUsers: 0 },
  vendas: { total: 0, lastMonth: 0, lastWeek: 0, pending: 0, totalUsers: 0 },
}

type Period = '7d' | '30d' | 'all'

// Loading skeleton shown while the dashboard API is being fetched.
// The dashboard API can take several seconds to respond (it walks the
// full referral tree), so without this the user would briefly see the
// EmptyState ("Nenhum CashBack registrado ainda") even if they have
// referrals — because `cashbackSummary` is still the all-zero INITIAL
// state during that window.
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      {/* Hero card placeholder */}
      <Card className="border-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-lg overflow-hidden">
        <CardContent className="p-5 md:p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48 bg-white/20" />
            <Skeleton className="h-9 w-40 bg-white/20" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24 bg-white/20" />
              <Skeleton className="h-10 w-24 bg-white/20" />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Charts placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-[140px] w-full" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-[140px] w-full" /></div></CardContent></Card>
      </div>
      {/* Tabs placeholder */}
      <Skeleton className="h-10 w-full sm:w-80" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  )
}

// Animated number counter component
function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    const duration = 1200
    const steps = 40
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return (
    <span className={cn('font-bold tabular-nums', className)}>
      {display.toLocaleString('pt-BR')}
    </span>
  )
}

// Category config with icons and colors
const tabConfig = {
  entrada: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500', gradient: 'from-emerald-500 to-emerald-600' },
  residual: { icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-500', gradient: 'from-teal-500 to-teal-600' },
  vendas: { icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-500', gradient: 'from-amber-500 to-amber-600' },
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  animate = true,
  level,
  progressPct,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  trend?: number
  animate?: boolean
  level?: 'high' | 'medium' | 'low'
  progressPct?: number
}) {
  // Color-coded level badges
  const levelBadge = level ? {
    high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-700',
    low: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-700',
  }[level] : null

  // Circular progress SVG
  const displayPct = progressPct ?? 0
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (displayPct / 100) * circumference

  return (
    <Card className="shadow-sm bg-card hover:shadow-md transition-all duration-200 card-hover-lift group">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="relative flex items-center justify-center shrink-0">
          {progressPct !== undefined ? (
            <svg width="40" height="40" className="-rotate-90 shrink-0">
              <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
              <motion.circle
                cx="20" cy="20" r={radius} fill="none" strokeWidth="3" strokeLinecap="round"
                className="text-emerald-500"
                stroke="currentColor"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                strokeDasharray={circumference}
              />
            </svg>
          ) : null}
          {progressPct === undefined && (
            <div className={`p-2 rounded-xl ${color} group-hover:scale-105 transition-transform`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          {progressPct !== undefined && (
            <div className={`p-1.5 rounded-lg ${color} group-hover:scale-105 transition-transform absolute inset-0 flex items-center justify-center`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
            {levelBadge && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${levelBadge}`}>
                {level === 'high' ? 'ALTO' : level === 'medium' ? 'MÉDIO' : 'BAIXO'}
              </span>
            )}
          </div>
          {animate ? (
            <AnimatedCounter value={value} className="text-base text-foreground" />
          ) : (
            <p className="text-base font-bold text-foreground truncate">{value.toLocaleString('pt-BR')}</p>
          )}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-1 rounded-full shrink-0 ${trend >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-red-500 bg-red-50 dark:bg-red-950/30'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend >= 0 ? '+' : ''}{trend}%
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CashbackPage() {
  const [activeTab, setActiveTab] = useState('entrada')
  const [period, setPeriod] = useState<Period>('30d')
  const [cashbackSummary, setCashbackSummary] = useState(INITIAL_CASHBACK_SUMMARY)
  // `loading` is true until the dashboard API responds (success or
  // failure). While true we show a skeleton instead of the EmptyState,
  // so users with referrals don't briefly see "Nenhum CashBack
  // registrado ainda" during the ~8s dashboard fetch.
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const { setActivePage, user } = useStore()

  // Fetch live network summary. We use `/api/dashboard` because its
  // `cashback{Entrada,Residual,Vendas}.totalUsers` field is the REAL
  // network-descendant count for the user (computed from the referral
  // tree by `countNetworkDescendants` — see /api/dashboard/route.ts
  // task 3b notes). The `/api/cashback/{type}` routes return
  // `totalUsers` derived from CashbackEntry transactions, which is 0
  // for users who haven't received any payouts yet — not useful for a
  // "Total Members" headline.
  // Privacy (task 4b): no R$ values are read or displayed here. Only
  // member counts.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    fetch(`/api/dashboard?userId=${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        const entradaUsers = d?.cashbackEntrada?.totalUsers ?? 0
        const residualUsers = d?.cashbackResidual?.totalUsers ?? 0
        const vendasUsers = d?.cashbackVendas?.totalUsers ?? 0
        const newThisMonth = d?.network?.newReferrals ?? 0
        setCashbackSummary({
          entrada: {
            // `total` now holds the member count for this matrix (not R$).
            total: entradaUsers,
            lastMonth: newThisMonth,
            lastWeek: 0,
            pending: 0,
            totalUsers: entradaUsers,
          },
          residual: {
            total: residualUsers,
            lastMonth: newThisMonth,
            lastWeek: 0,
            pending: 0,
            totalUsers: residualUsers,
          },
          vendas: {
            total: vendasUsers,
            lastMonth: newThisMonth,
            lastWeek: 0,
            pending: 0,
            totalUsers: vendasUsers,
          },
        })
      })
      .catch((err) => console.error('Failed to load cashback summary:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  // The page is shown when the user has ANY members in the entrada
  // matrix network (this is the smallest/strictest matrix so it's a
  // good signal of "user has begun building a network"). Previously
  // this checked `entrada.total > 0` where `total` was R$ earned —
  // which meant a user with referrals but no payouts yet saw the
  // EmptyState. Now `total` IS the member count, so this works as
  // intended.
  const hasCashbackData = cashbackSummary.entrada.total > 0

  // While the dashboard API is loading, show a skeleton instead of the
  // EmptyState. This prevents the false "Nenhum CashBack registrado
  // ainda" flash for users who DO have referrals but whose data hasn't
  // loaded yet (dashboard API can take ~8s).
  if (loading) {
    return <LoadingSkeleton />
  }

  // EmptyState only shows after loading is COMPLETE and the user truly
  // has no entrada matrix members.
  if (!hasCashbackData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('cashback.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('cashback.subtitle')}</p>
        </div>
        <EmptyState
          icon={DollarSign}
          title="Nenhum CashBack registrado ainda"
          description="Comece a indicar pessoas para sua rede e ganhe CashBack em múltiplos níveis!"
          actionLabel="Comece a indicar"
          onAction={() => setActivePage('referrals')}
        />
      </div>
    )
  }

  // `totalMembers` is the sum of network sizes across the three
  // matrices. Each matrix counts descendants up to its own depth
  // (entrada: 5, residual: 7, vendas: 9), so a user with a deep
  // network will have a higher `vendas.total` than `entrada.total`.
  // The sum is therefore NOT a unique-member count — it's a useful
  // "network footprint" metric.
  const totalMembers = cashbackSummary.entrada.total + cashbackSummary.residual.total + cashbackSummary.vendas.total
  const totalUsers = cashbackSummary.entrada.totalUsers + cashbackSummary.residual.totalUsers + cashbackSummary.vendas.totalUsers
  const lastMonthTotal = cashbackSummary.entrada.lastMonth + cashbackSummary.residual.lastMonth + cashbackSummary.vendas.lastMonth

  const getFilteredSummary = (type: 'entrada' | 'residual' | 'vendas') => {
    const s = cashbackSummary[type]
    switch (period) {
      case '7d': return { ...s, total: s.lastWeek }
      case '30d': return { ...s, total: s.lastMonth }
      case 'all': return s
    }
  }

  const currentSummary = getFilteredSummary(activeTab as 'entrada' | 'residual' | 'vendas')

  // Distribution chart data — values are MEMBER COUNTS, not R$.
  // (The 4x5/4x7/4x9 names reflect the actual matrix width of 4 — see matrix-visualization.tsx.)
  const distributionData = [
    { name: 'Entrada 4x5', value: cashbackSummary.entrada.total, color: '#059669', users: cashbackSummary.entrada.totalUsers },
    { name: 'Residual 4x7', value: cashbackSummary.residual.total, color: '#0d9488', users: cashbackSummary.residual.totalUsers },
    { name: 'Vendas 4x9', value: cashbackSummary.vendas.total, color: '#f59e0b', users: cashbackSummary.vendas.totalUsers },
  ]

  // Donut chart data — also member counts.
  const donutData = [
    { name: 'Entrada', value: cashbackSummary.entrada.total, color: '#059669' },
    { name: 'Residual', value: cashbackSummary.residual.total, color: '#0d9488' },
    { name: 'Vendas', value: cashbackSummary.vendas.total, color: '#f59e0b' },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t('cashback.title')}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{t('cashback.subtitle')}</p>
        </div>
        {/* Action buttons live at the TOP so users can act on their cashback
            balance immediately, instead of hunting for them at the bottom of
            a long page. "Sacar" routes to the Financial page where the
            withdrawal flow lives; "Baixar Relatório" is kept for parity. */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="default"
            size="sm"
            className="gap-2 text-xs w-fit h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setActivePage('financial')}
          >
            <Wallet className="h-3.5 w-3.5" />
            Sacar
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs w-fit h-9">
            <Download className="h-3.5 w-3.5" />
            {t('cashback.downloadReport')}
          </Button>
        </div>
      </div>

      {/* Total Members Hero Card with large animated number */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 animate-gradient-shift border-0 shadow-lg overflow-hidden relative">
          <CardContent className="p-4 sm:p-5 md:p-6 relative">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            <div className="absolute inset-0 animate-shimmer" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm text-emerald-100 font-medium">Total de Membros na Rede</p>
                <AnimatedCounter value={totalMembers} className="text-2xl sm:text-3xl md:text-4xl text-white mt-1" />
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-emerald-200">vs. mês anterior</span>
                </div>
              </div>
              {/* Network Footprint Summary */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 sm:p-3 text-center border border-white/10">
                  <p className="text-[10px] text-emerald-200 uppercase tracking-wide">Este Mês</p>
                  <p className="text-base sm:text-lg font-bold text-white">{lastMonthTotal.toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-200" />
                  <span className="text-xs text-emerald-200">Total Usuários:</span>
                  <span className="text-xs font-bold text-white">{totalUsers.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-emerald-200" />
                  <span className="text-xs text-emerald-200">Níveis:</span>
                  <span className="text-xs font-bold text-white">5 · 7 · 9</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* CashBack Distribution Chart + Donut Chart side by side */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Bar Chart */}
          <Card className="shadow-sm bg-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-foreground">Distribuição de Membros</span>
              </div>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}`} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString('pt-BR')} membros`, 'Membros']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1000}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Donut Chart */}
          <Card className="shadow-sm bg-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-foreground">Proporção por Tipo</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                <div className="h-[120px] w-[120px] sm:h-[140px] sm:w-[140px] shrink-0 mx-auto sm:mx-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={1000}
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')} membros`, '']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {donutData.map((item) => {
                    const pct = ((item.value / Math.max(totalMembers, 1)) * 100).toFixed(1)
                    return (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{item.name}</span>
                            <span className="text-xs font-bold text-foreground">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Period Filter */}
      <div className="grid grid-cols-3 md:flex md:items-center gap-2">
        {[
          { key: '7d' as Period, label: t('cashback.period.7d') },
          { key: '30d' as Period, label: t('cashback.period.30d') },
          { key: 'all' as Period, label: t('cashback.period.all') },
        ].map(p => (
          <Button
            key={p.key}
            variant={period === p.key ? 'default' : 'outline'}
            size="sm"
            className={cn('text-xs min-h-[40px] h-10 md:min-h-[36px] md:h-9 px-3 md:px-2 w-full md:w-auto', period === p.key && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* CashBack Tips Card — text-first layout.
          Previously a 4px gradient bar was rendered ABOVE the CardContent,
          pushing the title+description down and making the decorative bar
          the visual headline. The user explicitly complained that "a figura
          fica em cima da escrita" (the figure is on top of the writing).
          Fix: lead with the icon+text (the actual content the user needs to
          read), and demote the gradient to a subtle bottom accent so it
          reads as a footer underline rather than a header banner. */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-sm bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 overflow-hidden relative">
          {/* Subtle dots background pattern */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle, #059669 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }} />
          <CardContent className="p-4 relative">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Dica de CashBack</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                  Indique pelo menos 3 pessoas ativas para maximizar seus ganhos no CashBack Entrada.
                  Quanto maior sua rede, maior o retorno em todos os níveis!
                </p>
              </div>
            </div>
          </CardContent>
          {/* Subtle bottom accent — replaces the previous top "figure".
              Thin, low-contrast, sits BELOW the text so it reads as a
              decorative underline instead of competing with the headline. */}
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 opacity-70" />
        </Card>
      </motion.div>

      {/* Tabs with animated slide indicator */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex h-auto sm:h-9 gap-1 p-1">
          <TabsTrigger value="entrada" className="flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0 py-2 sm:py-1 px-1 sm:px-2 min-w-0 text-[10px] sm:text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 glow-tab-indicator">
            <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="truncate">Entrada</span>
          </TabsTrigger>
          <TabsTrigger value="residual" className="flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0 py-2 sm:py-1 px-1 sm:px-2 min-w-0 text-[10px] sm:text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 glow-tab-indicator">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="truncate">Residual</span>
          </TabsTrigger>
          <TabsTrigger value="vendas" className="flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0 py-2 sm:py-1 px-1 sm:px-2 min-w-0 text-[10px] sm:text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 glow-tab-indicator">
            <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="truncate">Vendas</span>
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="entrada" className="mt-4 space-y-4" key="entrada-content">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard label={t('cashback.totalAccumulated')} value={currentSummary.total} icon={DollarSign} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" level="high" progressPct={undefined} />
                <SummaryCard label={t('cashback.lastMonth')} value={cashbackSummary.entrada.lastMonth} icon={ArrowDownRight} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" level="medium" progressPct={undefined} />
                <SummaryCard label={t('cashback.lastWeek')} value={cashbackSummary.entrada.lastWeek} icon={ArrowDownRight} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" level="medium" progressPct={undefined} />
                <SummaryCard label={t('cashback.pending')} value={cashbackSummary.entrada.pending} icon={DollarSign} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" animate={false} level="low" progressPct={undefined} />
              </div>
            </motion.div>
            <MatrixVisualization type="entrada" onUpgradeClick={() => setActivePage('myplan')} />
          </TabsContent>

          <TabsContent value="residual" className="mt-4 space-y-4" key="residual-content">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard label={t('cashback.totalAccumulated')} value={currentSummary.total} icon={DollarSign} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" level="high" progressPct={undefined} />
                <SummaryCard label={t('cashback.lastMonth')} value={cashbackSummary.residual.lastMonth} icon={ArrowDownRight} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" level="medium" progressPct={undefined} />
                <SummaryCard label={t('cashback.lastWeek')} value={cashbackSummary.residual.lastWeek} icon={ArrowDownRight} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" level="medium" progressPct={undefined} />
                <SummaryCard label={t('cashback.pending')} value={cashbackSummary.residual.pending} icon={DollarSign} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" animate={false} level="low" progressPct={undefined} />
              </div>
            </motion.div>
            <MatrixVisualization type="residual" />
          </TabsContent>

          <TabsContent value="vendas" className="mt-4 space-y-4" key="vendas-content">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard label={t('cashback.totalAccumulated')} value={currentSummary.total} icon={DollarSign} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" level="high" progressPct={undefined} />
                <SummaryCard label={t('cashback.lastMonth')} value={cashbackSummary.vendas.lastMonth} icon={ArrowDownRight} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" level="high" progressPct={undefined} />
                <SummaryCard label={t('cashback.lastWeek')} value={cashbackSummary.vendas.lastWeek} icon={ArrowDownRight} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" level="medium" progressPct={undefined} />
                <SummaryCard label={t('cashback.pending')} value={cashbackSummary.vendas.pending} icon={DollarSign} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" animate={false} level="low" progressPct={undefined} />
              </div>
            </motion.div>
            <MatrixVisualization type="vendas" />
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}
