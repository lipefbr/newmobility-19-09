'use client'

import { useStore, type UserData } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { dashboardApi, ApiError } from '@/lib/api'
import { timeSince, totalDaysSince, formatDate, getPlanName, cn } from '@/lib/utils'
import { StatsCards } from './stats-cards'
import { FinancialCards } from './financial-cards'
import { DashboardCharts } from './charts'
import { ActivityFeed } from './activity-feed'
import { AnnouncementBanner } from './announcement-banner'
import { ComparisonWidget } from './comparison-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import {
  Smartphone,
  Apple,
  Check,
  UserPlus,
  FileText,
  ArrowDownToLine,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  Zap,
  Eye,
  Star,
  Sun,
  Moon,
  CloudSun,
  Target,
  Trophy,
  ArrowRight,
  Play,
  Globe,
  Lock,
  CalendarIcon,
  ShoppingCart,
  ChevronRight,
  BarChart3,
  Copy,
  Link2,
  Share2,
  MessageCircle,
  Gift,
  Send,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { DashboardSkeleton } from '../ui/loading-skeletons'
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip as RechartsTooltip } from 'recharts'
import { toast } from 'sonner'

interface DashboardData {
  user: any
  directReferrals: number
  directReferralCount: number
  cashbackEntrada: { totalUsers: number; totalEarned: number }
  cashbackResidual: { totalUsers: number; totalEarned: number }
  cashbackVendas: { totalUsers: number; totalEarned: number }
  network?: { totalSize: number; activeMembers: number; newReferrals: number }
  balances: any
  recentTransactions: any[]
  recentActivity?: any[]
  weeklyReferralCount?: number
  weeklyReferralsByDay?: { day: string; value: number; percentage: number }[]
  career: any
  // Per-user downline distribution by plan (e.g. { free: 3, blue3: 5, blue5: 2 })
  userDistribution: any
  revenueByCategory: any
  // Per-user this-month vs last-month counts for the 4 indicator cards
  // (Ganhos CashBack, Novas Indicações, Pontos Ganhos, Saques). Strictly
  // scoped to the logged-in user — NO global data.
  comparisonStats?: {
    cashbackEarnings?: { current: number; previous: number }
    newReferrals?: { current: number; previous: number }
    pointsEarned?: { current: number; previous: number }
    withdrawals?: { current: number; previous: number }
  }
}

// Greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return { text: 'Bom dia', icon: Sun, iconClass: 'text-yellow-400' }
  if (hour >= 12 && hour < 18) return { text: 'Boa tarde', icon: CloudSun, iconClass: 'text-orange-400' }
  return { text: 'Boa noite', icon: Moon, iconClass: 'text-blue-300' }
}

// Network Health mini chart data
const networkHealthData = [
  { month: 'Jul', growth: 12 },
  { month: 'Ago', growth: 18 },
  { month: 'Set', growth: 15 },
  { month: 'Out', growth: 22 },
  { month: 'Nov', growth: 28 },
  { month: 'Dez', growth: 35 },
  { month: 'Jan', growth: 42 },
]

// Fallback weekly referral-growth data for the CSS bar chart. Used only
// when the dashboard API has not returned `weeklyReferralsByDay` yet (e.g.
// during initial load). Privacy-safe: every value is a count of new
// referrals, never a R$ amount.
const fallbackWeeklyReferrals = [
  { day: 'Seg', value: 0, percentage: 0 },
  { day: 'Ter', value: 0, percentage: 0 },
  { day: 'Qua', value: 0, percentage: 0 },
  { day: 'Qui', value: 0, percentage: 0 },
  { day: 'Sex', value: 0, percentage: 0 },
  { day: 'Sáb', value: 0, percentage: 0 },
  { day: 'Dom', value: 0, percentage: 0 },
]

export function DashboardPage() {
  const { user, logout, setActivePage, updateUser } = useStore()
  const { t } = useTranslation()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const quickActions = [
    { label: 'Comprar Voucher', icon: ShoppingCart, color: 'from-emerald-500 to-emerald-600', page: 'voucher' as const, description: 'Mobilidade, Farmácia...' },
    { label: 'Indicar Amigo', icon: UserPlus, color: 'from-emerald-600 to-teal-500', page: 'referrals' as const, description: 'Ganhe CashBack' },
    { label: 'Ver Extrato', icon: FileText, color: 'from-teal-500 to-emerald-500', page: 'financial' as const, description: 'Suas transações' },
    { label: 'Solicitar Saque', icon: ArrowDownToLine, color: 'from-emerald-700 to-emerald-500', page: 'financial' as const, description: 'Saque disponível' },
  ]

  useEffect(() => {
    if (user?.id) {
      loadDashboard()
    }
  }, [user?.id])

  const loadDashboard = async () => {
    try {
      const data = await dashboardApi.getData(user!.id)
      setDashboardData(data)

      // Sync the Zustand store with the fresh data from the API so that
      // admin edits (careerPoints, balances, plan, stars, etc.) are
      // reflected immediately on the dashboard without requiring re-login.
      // Only update fields that are actually returned by the dashboard API.
      const updates: Partial<UserData> = {}

      if (data?.user) {
        const u = data.user
        if (typeof u.plan === 'string') updates.plan = u.plan
        if (typeof u.stars === 'number') updates.stars = u.stars
        if (typeof u.isDriver === 'boolean') updates.isDriver = u.isDriver
        if (typeof u.isActive === 'boolean') updates.isActive = u.isActive
        if (typeof u.language === 'string') updates.language = u.language
        if (u.profileImage !== undefined) updates.profileImage = u.profileImage
      }

      if (data?.balances) {
        const b = data.balances
        if (typeof b.withdrawal === 'number') updates.balanceWithdrawal = b.withdrawal
        if (typeof b.mobility === 'number') updates.balanceMobility = b.mobility
        if (typeof b.shopping === 'number') updates.balanceShopping = b.shopping
        if (typeof b.food === 'number') updates.balanceFood = b.food
        if (typeof b.pharmacy === 'number') updates.balancePharmacy = b.pharmacy
        if (typeof b.gratification === 'number') updates.balanceGratification = b.gratification
      }

      if (data?.career && typeof data.career.points === 'number') {
        updates.careerPoints = data.career.points
      }

      if (Object.keys(updates).length > 0) {
        updateUser(updates)
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        logout()
        return
      }
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const networkStats = {
    totalSize: dashboardData?.network?.totalSize ?? dashboardData?.directReferralCount ?? 0,
    activeMembers: dashboardData?.network?.activeMembers ?? dashboardData?.directReferralCount ?? 0,
    newReferrals: dashboardData?.network?.newReferrals ?? 0,
  }

  // Quick stats for mini-bar — privacy-safe (no R$ values).
  // Primary stat is now referral count, with points shown underneath.
  const directReferralTotal = dashboardData?.directReferralCount ?? dashboardData?.directReferrals ?? 0
  const careerPointsTotal = dashboardData?.career?.points ?? user?.careerPoints ?? 0
  const quickStats = [
    { label: 'Indicações Hoje', value: String(directReferralTotal), rawValue: directReferralTotal, icon: UserPlus, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Novos Indicados', value: String(dashboardData?.directReferralCount ?? 0), rawValue: dashboardData?.directReferralCount ?? 0, icon: UserPlus, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30' },
    { label: 'Rede Ativa', value: String(networkStats.activeMembers), rawValue: networkStats.activeMembers, icon: Users, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Pontos de Carreira', value: `+${careerPointsTotal}`, rawValue: careerPointsTotal, icon: Star, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  ]

  // Greeting
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

  // Per-user weekly referrals from the dashboard API. Falls back to zeros
  // while the data is loading so we never render platform-wide mock data.
  const weeklyReferralsData = useMemo(
    () => dashboardData?.weeklyReferralsByDay?.length
      ? dashboardData.weeklyReferralsByDay
      : fallbackWeeklyReferrals,
    [dashboardData?.weeklyReferralsByDay],
  )
  const weeklyTotal = useMemo(
    () => weeklyReferralsData.reduce((sum, d) => sum + (d.value || 0), 0),
    [weeklyReferralsData],
  )
  const weeklyBestDay = useMemo(() => {
    const best = [...weeklyReferralsData].sort((a, b) => (b.value || 0) - (a.value || 0))[0]
    return best && best.value > 0 ? best : null
  }, [weeklyReferralsData])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Visual separator */}
      <div className="border-b border-emerald-200/50 dark:border-emerald-800/30" />

      {/* ===== GREETING CARD (simplified — JUST the greeting) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Card className="border-0 shadow-sm overflow-hidden rounded-3xl">
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 relative rounded-3xl">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
            <CardContent className="p-4 sm:p-5 md:p-6 relative">
              <div className="flex items-center gap-3 text-white">
                <motion.span
                  animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                  transition={{ delay: 0.5, duration: 0.8, ease: 'easeInOut' }}
                  className="inline-block shrink-0"
                >
                  <GreetingIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${greeting.iconClass}`} />
                </motion.span>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                  {greeting.text}, {user?.name?.split(' ')[0] || 'Usuário'}!
                </h2>
              </div>
              {/* Account creation info — small text at the bottom */}
              {user?.createdAt && (
                <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-white/80">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Conta criada em: <strong className="font-semibold text-white">{formatDate(user.createdAt)}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <strong className="font-semibold text-white">{totalDaysSince(user.createdAt)}</strong> {totalDaysSince(user.createdAt) === 1 ? 'dia' : 'dias'} de conta
                  </span>
                </div>
              )}

              {/* ===== COMPACT REFERRAL LINK (link de indicação) =====
                  Placed directly below the account-creation date per user
                  request ("abaixo da data de criação de conta logo no
                  início do dashboard"). Shows the user's referral code +
                  copyable link + WhatsApp share in a single compact row so
                  it lives right at the top of the dashboard, not buried
                  further down. Data is the logged-in user's own
                  referralCode from the store — no global data. */}
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="h-4 w-4 text-white shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-white">Seu Link de Indicação</span>
                  <span className="text-[10px] text-emerald-50/80 hidden sm:inline">Convide amigos e ganhe CashBack</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-50/80 font-semibold">Código</span>
                    <div className="px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm border border-white/20 text-white font-mono font-bold text-xs tracking-wider">
                      {user?.referralCode || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-medium truncate">
                      <Link2 className="h-3.5 w-3.5 text-emerald-100 shrink-0" />
                      <span className="truncate">
                        {typeof window !== 'undefined' ? `${window.location.origin}/?ref=${user?.referralCode || ''}` : `newmobility.com.br/?ref=${user?.referralCode || ''}`}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        const link = `${window.location.origin}/?ref=${user?.referralCode || ''}`
                        try {
                          await navigator.clipboard.writeText(link)
                          toast.success('Link copiado!', { description: 'Cole onde quiser e convide seus amigos.' })
                        } catch {
                          toast.error('Não foi possível copiar o link.')
                        }
                      }}
                      className="bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 shrink-0 gap-1.5 shadow-md h-8"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copiar</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const link = `${window.location.origin}/?ref=${user?.referralCode || ''}`
                        const text = `Olá! Entre na NewMobility com meu link e ganhe benefícios exclusivos: ${link}`
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                      }}
                      className="bg-emerald-700/40 hover:bg-emerald-700/60 text-white border border-white/20 backdrop-blur-sm gap-1.5 shrink-0 h-8"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setActivePage('referrals')}
                      className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white gap-1.5 shrink-0 h-8"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Indicar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* ===== 4 INDICATOR CARDS (Ganhos CashBack, Novas Indicações, Pontos Ganhos, Saques) =====
          Moved to the TOP of the dashboard per user request. All counts are
          strictly per-user (this month vs last month) from the dashboard API
          `comparisonStats` field — NO global/mock data. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        <ComparisonWidget stats={dashboardData?.comparisonStats} />
      </motion.div>

      {/* ===== QUICK STATS MINI-BAR with animation ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {quickStats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.92, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.35, ease: 'easeOut' }}
                whileHover={{ scale: 1.03, y: -2 }}
                className={`flex items-center gap-2 sm:gap-2.5 ${stat.bg} border border-emerald-100 dark:border-emerald-900/40 rounded-2xl px-3 sm:px-3.5 py-2 sm:py-2.5 shadow-sm cursor-pointer transition-shadow duration-200 hover:shadow-md`}
              >
                <div className={`p-1.5 rounded-full bg-white/60 dark:bg-white/5 ${stat.color} shrink-0`}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide truncate">{stat.label}</p>
                  <p className="text-sm font-bold text-foreground">{stat.value}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ===== QUICK ACTION CARDS (Emerald accent) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600" />
            Ações Rápidas
            <span className="flex-1 h-px bg-gradient-to-r from-emerald-400/60 to-transparent ml-2" />
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.3, ease: 'easeOut' }}
                onClick={() => setActivePage(action.page)}
                className="group relative overflow-hidden rounded-2xl text-left transition-all duration-200"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:from-emerald-400 group-hover:to-emerald-500 transition-all duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-white/5" />
                </div>
                <div className="relative p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="p-2 sm:p-2.5 rounded-full bg-white/20 backdrop-blur-sm shadow-sm">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white block">{action.label}</span>
                  <span className="text-[10px] text-emerald-100/80 mt-0.5 block">{action.description}</span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* ===== (Standalone referral card REMOVED — moved into the welcome
          card at the top, directly below the account-creation date, per
          user request "abaixo da data de criação de conta logo no início
          do dashboard".) ===== */}

      {/* Visual separator */}
      <div className="border-b border-emerald-200/50 dark:border-emerald-800/30" />

      {/* ===== STATS CARDS (enhanced with framer-motion) ===== */}
      <StatsCards data={dashboardData} />

      {/* Section Separator */}
      <div className="section-separator" />

      {/* ===== INDICAÇÕES DA SEMANA (per-user data from dashboard API) ===== */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {/* Weekly Referrals CSS Bar Chart — per-user data from the dashboard API */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden border-0 bg-gradient-to-br from-card to-emerald-50/30 dark:to-emerald-950/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  Indicações da Semana
                </CardTitle>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  +{weeklyTotal}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total semanal</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{weeklyTotal} indicações</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-medium">Média diária</p>
                  <p className="text-sm font-bold text-emerald-600">{(weeklyTotal / 7).toFixed(1)} indicações</p>
                </div>
              </div>
              {/* CSS Bar Chart */}
              <div className="flex items-end justify-between gap-1 sm:gap-1.5 h-24 sm:h-32 mb-2">
                {weeklyReferralsData.map((item, i) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${item.percentage}%` }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                      className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 transition-colors duration-200 cursor-pointer relative group min-h-[4px]"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-foreground text-background text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                        {item.value} indicações
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                {weeklyReferralsData.map((item) => (
                  <span key={item.day} className="flex-1 text-center">{item.day}</span>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Melhor dia</span>
                <span className="font-semibold text-emerald-600">
                  {weeklyBestDay
                    ? `${weeklyBestDay.day} — ${weeklyBestDay.value} ${weeklyBestDay.value === 1 ? 'indicação' : 'indicações'}`
                    : 'Sem indicações esta semana'}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ===== NETWORK OVERVIEW + NETWORK HEALTH =====
          Next Milestone ("Progresso do Plano") card REMOVED per user request.
          Grid changed from 3 cols to 2 cols since only 2 cards remain. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Network Overview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 h-full bg-card border border-emerald-100/50 dark:border-emerald-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="p-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Activity className="h-4 w-4" />
                </span>
                {t('dashboard.network.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-lg sm:text-xl font-bold text-foreground">{networkStats.totalSize.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{t('dashboard.network.total')}</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/30 dark:to-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-900/50">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 mx-auto mb-1" />
                  <p className="text-lg sm:text-xl font-bold text-foreground">{networkStats.activeMembers}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{t('dashboard.network.active')}</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-100/50 dark:from-emerald-950/30 dark:to-teal-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-lg sm:text-xl font-bold text-foreground">{networkStats.newReferrals}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{t('dashboard.network.new')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Network Health Mini Widget - Line chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >
          <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 h-full bg-card border border-emerald-100/50 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="p-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </span>
                Saúde da Rede
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold">+23%</span>
                </div>
                <span className="text-xs text-muted-foreground">crescimento nos últimos 6 meses</span>
              </div>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={networkHealthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="networkGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      formatter={(value: number) => [`${value} membros`, 'Crescimento']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="growth" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: '#059669' }} animationDuration={1200} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Milestone ("Progresso do Plano") card REMOVED per user request —
            indicator cards moved to the top of the dashboard instead. */}
      </div>

      {/* Visual separator */}
      <div className="border-b border-emerald-200/50 dark:border-emerald-800/30" />

      {/* ===== FINANCIAL CARDS ===== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
            Financeiro
            <span className="flex-1 h-px bg-gradient-to-r from-emerald-400/60 to-transparent ml-2" />
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs text-muted-foreground hover:text-emerald-600 gap-1"
            onClick={() => setActivePage('financial')}
          >
            <Eye className="h-3.5 w-3.5" />
            Ver tudo
          </Button>
        </div>
        <FinancialCards data={dashboardData} />

        {/* ===== DETALHAMENTO DE GANHOS TABLE ===== */}
        <Card className="mt-4 rounded-2xl shadow-sm border border-emerald-100/50 dark:border-emerald-900/30 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Detalhamento de Ganhos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[320px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-2.5">Tipo</th>
                    <th className="text-right font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-2.5">Quantidade</th>
                    <th className="text-right font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-2.5 hidden sm:table-cell">Valor Total</th>
                    <th className="text-left font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-2.5 hidden md:table-cell">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tipo: 'CashBack Entrada', qtd: dashboardData?.cashbackEntrada?.totalUsers ?? 0, valor: dashboardData?.cashbackEntrada?.totalEarned ?? 0, desc: 'Membros na matriz de entrada (4×5)', cor: 'text-emerald-600', isCurrency: true, isPoints: false },
                    { tipo: 'CashBack Residual', qtd: dashboardData?.cashbackResidual?.totalUsers ?? 0, valor: dashboardData?.cashbackResidual?.totalEarned ?? 0, desc: 'Membros na matriz residual (4×7)', cor: 'text-teal-600', isCurrency: true, isPoints: false },
                    { tipo: 'CashBack Vendas', qtd: dashboardData?.cashbackVendas?.totalUsers ?? 0, valor: dashboardData?.cashbackVendas?.totalEarned ?? 0, desc: 'Membros na matriz de vendas (4×9)', cor: 'text-amber-600', isCurrency: true, isPoints: false },
                    { tipo: 'Indicações Diretas', qtd: dashboardData?.directReferralCount ?? 0, valor: 0, desc: 'Pessoas indicadas diretamente por você', cor: 'text-emerald-600', isCurrency: false, isPoints: false },
                    { tipo: 'Pontos de Carreira', qtd: dashboardData?.career?.points ?? user?.careerPoints ?? 0, valor: dashboardData?.career?.points ?? user?.careerPoints ?? 0, desc: 'Pontos acumulados no plano de carreira', cor: 'text-amber-600', isCurrency: false, isPoints: true },
                    { tipo: 'Rede Total', qtd: dashboardData?.network?.totalSize ?? 0, valor: 0, desc: 'Tamanho total da sua rede (todos os níveis)', cor: 'text-emerald-600', isCurrency: false, isPoints: false },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
                      <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-medium text-foreground">{row.tipo}</td>
                      <td className={`px-3 sm:px-4 py-2 sm:py-2.5 text-right font-bold ${row.cor}`}>{row.qtd.toLocaleString('pt-BR')}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-400 hidden sm:table-cell">
                        {row.isCurrency
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor / 100)
                          : row.isPoints
                            ? `${row.valor.toLocaleString('pt-BR')} pts`
                            : '—'}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-muted-foreground text-xs hidden md:table-cell">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Separator */}
      <div className="section-separator" />

      {/* Visual separator */}
      <div className="border-b border-emerald-200/50 dark:border-emerald-800/30" />

      {/* ===== ACTIVITY FEED + APP DOWNLOAD ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <ActivityFeed activities={dashboardData?.recentActivity} />

        {/* App Download Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >
          <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 h-full bg-card border border-emerald-100/50 dark:border-emerald-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                {t('dashboard.download.title')}
                <span className="flex-1 h-px bg-gradient-to-r from-emerald-400/60 to-transparent ml-2" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl h-auto py-3 flex flex-col gap-1.5 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-400 dark:hover:border-emerald-600 group transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                >
                  <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Android</span>
                  <span className="text-[10px] text-muted-foreground">{t('dashboard.download.driver')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl h-auto py-3 flex flex-col gap-1.5 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-400 dark:hover:border-emerald-600 group transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                >
                  <Apple className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">iOS</span>
                  <span className="text-[10px] text-muted-foreground">{t('dashboard.download.driver')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl h-auto py-3 flex flex-col gap-1.5 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-400 dark:hover:border-emerald-600 group transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                >
                  <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Android</span>
                  <span className="text-[10px] text-muted-foreground">{t('dashboard.download.passenger')}</span>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl h-auto py-3 flex flex-col gap-1.5 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-400 dark:hover:border-emerald-600 group transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                >
                  <Apple className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">iOS</span>
                  <span className="text-[10px] text-muted-foreground">{t('dashboard.download.passenger')}</span>
                </Button>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-2.5 border border-emerald-100/50 dark:border-emerald-900/30">
                <Play className="h-4 w-4 text-emerald-600" />
                <span className="text-[10px] text-muted-foreground font-medium">Disponível na Google Play e App Store</span>
              </div>
              <div className="mt-3 flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[10px] font-medium">Dados Seguros</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Globe className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[10px] font-medium">SSL</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[10px] font-medium">+10k</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ===== CHARTS ===== */}
      <DashboardCharts data={dashboardData} />

      {/* ===== VISÃO GERAL - MINI WIDGETS ===== */}
      <div className="border-b border-emerald-200/50 dark:border-emerald-800/30" />
      <div>
        <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
          Visão Geral
          <span className="flex-1 h-px bg-gradient-to-r from-emerald-400/60 to-transparent ml-2" />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Próximos Eventos Mini Widget */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
          >
            <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 h-full bg-card border border-emerald-100/50 dark:border-emerald-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-emerald-600" />
                  Próximos Eventos
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] ml-auto">3</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { title: 'Webinar: Maximizar Ganhos', type: 'webinar', days: 3, color: 'bg-emerald-500' },
                  { title: 'Manutenção do Sistema', type: 'maintenance', days: 2, color: 'bg-red-500' },
                  { title: 'Promo: CashBack Dobrado', type: 'promo', days: 7, color: 'bg-amber-500' },
                ].map((event, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn('w-2 h-2 rounded-full shrink-0', event.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{event.type}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {event.days === 1 ? 'amanhã' : `${event.days}d`}
                    </span>
                  </motion.div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl w-full text-xs text-muted-foreground hover:text-emerald-600 gap-1 mt-1"
                  onClick={() => setActivePage('events')}
                >
                  Ver todos os eventos
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sua Posição Mini Widget */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 h-full bg-gradient-to-br from-gray-900 to-gray-800 border-0 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardHeader className="pb-2 relative">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Sua Posição
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-center mb-3">
                  <motion.p
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                    className="text-3xl font-bold text-white"
                  >
                    {directReferralTotal}
                  </motion.p>
                  <p className="text-xs text-gray-400 mt-1">indicações diretas</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Indicações</span>
                    <span className="text-teal-400 font-medium">{directReferralTotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Rede</span>
                    <span className="text-emerald-400 font-medium">{networkStats.totalSize}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Pontos</span>
                    <span className="text-amber-400 font-medium">{careerPointsTotal}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl w-full text-xs text-gray-400 hover:text-amber-400 mt-3 gap-1"
                  onClick={() => setActivePage('leaderboard')}
                >
                  Ver ranking completo
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Resumo Semanal Mini Widget with Sparkline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
          >
            <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 h-full bg-card border border-emerald-100/50 dark:border-emerald-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Resumo Semanal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Indicações esta semana</p>
                    <p className="text-xl font-bold text-foreground">{dashboardData?.weeklyReferralCount ?? weeklyTotal} indicações</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    +{dashboardData?.weeklyReferralCount ?? weeklyTotal}
                  </div>
                </div>
                {/* SVG Sparkline */}
                <div className="h-16 mb-2">
                  <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="weeklySparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="95%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M0,45 L33,38 L66,42 L100,30 L133,25 L166,18 L200,10"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                    <motion.path
                      d="M0,45 L33,38 L66,42 L100,30 L133,25 L166,18 L200,10 L200,60 L0,60 Z"
                      fill="url(#weeklySparkGrad)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    />
                    {[
                      { x: 0, y: 45 }, { x: 33, y: 38 }, { x: 66, y: 42 },
                      { x: 100, y: 30 }, { x: 133, y: 25 }, { x: 166, y: 18 }, { x: 200, y: 10 },
                    ].map((point, i) => (
                      <motion.circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r="3"
                        fill="#10b981"
                        stroke="white"
                        strokeWidth="1.5"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                      />
                    ))}
                  </svg>
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                  <span>Dom</span>
                </div>
                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Média diária</span>
                  <span className="font-semibold text-foreground">{(weeklyTotal / 7).toFixed(1)} indicações</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
