'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatDate, getStatusLabel, getStatusVariant, getPlanName } from '@/lib/utils'
import { formatBRL } from '@/lib/format'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { referralsApi, apiFetch } from '@/lib/api'
import { ReferralsSkeleton } from '../ui/loading-skeletons'
import { EmptyState } from '../ui/empty-states'
import { ShareOptions } from './share-options'
import { NetworkModal } from './network-modal'
import {
  Users, UserCheck, TrendingUp, Search, Link2, Copy, Check as CheckIcon,
  Share2, Eye, ChevronDown, ChevronUp, Calendar, Award, ArrowUpRight,
  ArrowRight, MessageCircle, Target, Medal, Maximize2, Activity, Download, Filter,
  FileSpreadsheet, HeartOff, Clock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip as RechartsTooltip } from 'recharts'
import { toast } from 'sonner'

// ----------------------------------------------------------------------------
// Activity feed types (mirrors /api/referrals/activity response)
// ----------------------------------------------------------------------------

interface ActivityEntry {
  id: string
  type: 'join' | 'active' | 'cashback'
  name: string
  action: string
  time: string
  isoTime: string | null
  plan: string
  avatar: string | null
  amount?: number
}

interface ActivityResponse {
  activity: ActivityEntry[]
  total: number
}

// Referrals are loaded from the API - no mock data to prevent data leakage

// Network growth data for mini chart
const networkGrowthData = [
  { month: 'Ago', count: 8 },
  { month: 'Set', count: 10 },
  { month: 'Out', count: 12 },
  { month: 'Nov', count: 11 },
  { month: 'Dez', count: 14 },
  { month: 'Jan', count: 16 },
]

// Top referrers leaderboard - derived from actual data

export function ReferralsPage() {
  const { t } = useTranslation()
  const { user } = useStore()
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [detailReferral, setDetailReferral] = useState<any | null>(null)
  const [showAllLevels, setShowAllLevels] = useState(false)
  const [loading, setLoading] = useState(false)
  const [networkModalOpen, setNetworkModalOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilterVal, setStatusFilterVal] = useState<string>('all')
  const [referrals, setReferrals] = useState<any[]>([])

  // Top-section summary stats (Task 10). Sourced from the /api/referrals
  // `stats` payload — these are computed server-side so they reflect the
  // FULL referral network (not just the levels shown in the tree) and so
  // "ganhos por indicação" can aggregate all three cashback tables.
  // Defaults to 0 so the top section never shows broken placeholders while
  // the request is in flight (the page-level `loading` skeleton still gates
  // the whole page, but if the list resolves faster than expected the
  // numbers are simply zero until stats arrive).
  const [totalEarningsCents, setTotalEarningsCents] = useState<number>(0)
  const [activeNetwork, setActiveNetwork] = useState<number>(0)
  const [pendingNetwork, setPendingNetwork] = useState<number>(0)

  // Recent activity feed (BACK-10). Replaces the 3 hardcoded mock entries
  // (Thiago Nascimento / Carla Ferreira / Marcos Ribeiro) with real data
  // from /api/referrals/activity — recent referrals + cashback earned.
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let safetyTimer: ReturnType<typeof setTimeout> | null = null

    async function fetchReferrals() {
      if (!user?.id) {
        setLoading(false)
        return
      }

      // Reset loading state for the new fetch
      setLoading(true)

      // Safety timeout: ensure loading is resolved even if the API hangs
      safetyTimer = setTimeout(() => {
        if (!cancelled) {
          console.warn('Referrals fetch timeout - resolving loading state')
          setLoading(false)
        }
      }, 15000)

      try {
        const data = await referralsApi.getList(user.id)
        if (cancelled) return

        // Pull the server-computed summary stats so the top section shows
        // real network-wide numbers (Task 10). Falls back to 0 if the API
        // omits any field for backward compatibility.
        if (data?.stats) {
          setTotalEarningsCents(Number(data.stats.totalEarningsCents ?? 0))
          setActiveNetwork(Number(data.stats.activeNetwork ?? 0))
          setPendingNetwork(Number(data.stats.pendingNetwork ?? 0))
        }

        if (data?.directReferrals) {
          // Build a lookup of `userId -> directReferralsCount` from the
          // nested referralTree (each tree node has a `children` array
          // whose length is the number of people THAT user referred).
          const childrenCountMap: Record<string, number> = {}
          function collectCounts(nodes: any[]) {
            for (const node of nodes) {
              childrenCountMap[node.id] = node.children?.length ?? 0
              if (node.children && node.children.length > 0) {
                collectCounts(node.children)
              }
            }
          }
          if (data.referralTree) collectCounts(data.referralTree)

          // Tarefa (19/09): a lista de referrals agora é construída APENAS
          // a partir da referralTree (que vem da MATRIZ com spillover cap 4).
          // Antes, data.directReferrals (10 indicações de patrocínio) eram
          // TODAS mapeadas como level=1, mas a matriz só permite 4 no nível 1.
          // Isso causava "Nível 1 — 10 membros" (250% de ocupação — impossível).
          //
          // Agora, cada nó da referralTree já tem o nível correto da matriz
          // (respeita spillover: max 4 por posição, excedentes caem em nível 2+).
          if (data.referralTree && data.referralTree.length > 0) {
            function flattenTree(nodes: any[], level: number): any[] {
              const result: any[] = []
              for (const node of nodes) {
                result.push({
                  id: node.id,
                  name: node.name,
                  date: node.createdAt ? (typeof node.createdAt === 'string' ? node.createdAt.split('T')[0] : new Date(node.createdAt).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
                  status: node.isActive ? 'active' : 'inactive',
                  plan: node.plan || 'free',
                  level,
                  directReferrals: node.children?.length ?? 0,
                  email: node.email || '',
                })
                if (node.children && node.children.length > 0) {
                  result.push(...flattenTree(node.children, level + 1))
                }
              }
              return result
            }
            // A referralTree da API já vem com a estrutura da matriz (nível 1
            // = posições diretas na matriz, max 4; nível 2+ = spillover).
            const allReferrals = flattenTree(data.referralTree, 1)
            setReferrals(allReferrals)
          } else if (data.directReferrals.length > 0) {
            // Fallback: se não há referralTree (matriz), usa directReferrals
            // como nível 1 (legacy, sem spillover).
            const mapped = data.directReferrals.map((r: any, idx: number) => ({
              id: r.id,
              name: r.name,
              date: r.createdAt ? (typeof r.createdAt === 'string' ? r.createdAt.split('T')[0] : new Date(r.createdAt).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
              status: r.isActive ? 'active' : 'inactive',
              plan: r.plan || 'free',
              level: 1,
              directReferrals: childrenCountMap[r.id] ?? 0,
              email: r.email || '',
            }))
            setReferrals(mapped)
          } else {
            setReferrals([])
          }
        } else {
          // No referrals data - show empty state
          setReferrals([])
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to fetch referrals:', err)
        // On error, show empty state instead of mock data
        setReferrals([])
        // Tarefa (19/09): se o erro for de rede (ApiNetworkError), tenta
        // novamente após 2s (pode ser que o dev server reiniciou durante
        // a compilação sob demanda). Na VPS de produção (build estático),
        // isso não deveria acontecer, mas é um safety net.
        if (err instanceof TypeError || (err as any)?.name === 'ApiNetworkError') {
          setTimeout(() => {
            if (!cancelled && user?.id) {
              fetchReferrals()
            }
          }, 2000)
          return // não resolve loading ainda — vai tentar de novo
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          if (safetyTimer) clearTimeout(safetyTimer)
        }
      }
    }
    fetchReferrals()

    return () => {
      cancelled = true
      if (safetyTimer) clearTimeout(safetyTimer)
    }
  }, [user?.id])

  // Fetch the real recent activity feed (BACK-10). Loaded in parallel with
  // the referrals list — its own loading state drives the skeleton so the
  // rest of the page can render as soon as the referrals list resolves.
  useEffect(() => {
    let cancelled = false
    async function fetchActivity() {
      if (!user?.id) {
        setActivityLoading(false)
        return
      }
      try {
        const data = await apiFetch<ActivityResponse>(`/referrals/activity?userId=${user.id}`)
        if (cancelled || !data) return
        setActivity(Array.isArray(data.activity) ? data.activity : [])
      } catch (err) {
        if (cancelled) return
        console.error('Failed to fetch referral activity:', err)
        // Non-fatal — the rest of the page still works. Show empty state.
        setActivity([])
        toast.error('Não foi possível carregar a atividade recente.', {
          description: err instanceof Error ? err.message : undefined,
        })
      } finally {
        if (!cancelled) setActivityLoading(false)
      }
    }
    fetchActivity()
    return () => { cancelled = true }
  }, [user?.id])

  if (loading) {
    return <ReferralsSkeleton />
  }

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${user?.referralCode || 'USER2025'}`
    : `https://newmobility.com.br/?ref=${user?.referralCode || 'USER2025'}`

  const filtered = referrals.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase())
    const matchesLevel = levelFilter === null || r.level === levelFilter
    const matchesPlan = planFilter === 'all' || r.plan === planFilter
    const matchesStatus = statusFilterVal === 'all' || r.status === statusFilterVal
    return matchesSearch && matchesLevel && matchesPlan && matchesStatus
  })

  const totalDirect = referrals.filter((r) => r.level === 1).length
  const totalNetwork = referrals.length
  const activeCount = referrals.filter((r) => r.status === 'active').length
  const newThisMonth = referrals.filter((r) => {
    const d = new Date(r.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const conversionRate = totalNetwork > 0 ? Math.round((activeCount / totalNetwork) * 100) : 0

  const thisWeekCount = Math.max(1, Math.floor(newThisMonth * 0.4))
  const lastWeekCount = Math.max(0, thisWeekCount - 1)

  const levelCounts = Array.from({ length: 5 }, (_, i) => i + 1).map((lvl) => ({
    level: lvl,
    count: referrals.filter((r) => r.level === lvl).length,
  }))

  const maxLevelWithData = referrals.length > 0 ? Math.max(...referrals.map((r) => r.level)) : 0
  // Show 5 levels for entrada matrix (4x5 = 5 levels deep). When there is data
  // beyond level 5, allow expanding to see all of it.
  const visibleLevels = showAllLevels ? levelCounts.concat(
    Array.from({ length: Math.max(0, maxLevelWithData - 5) }, (_, i) => {
      const lvl = i + 6
      return { level: lvl, count: referrals.filter((r) => r.level === lvl).length }
    })
  ) : levelCounts

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleExportCSV = () => {
    // CSV column "Indicações" replaces the previous "CashBack" column
    // (privacy: task 4b — no personal R$ earnings on user-facing pages).
    const headers = 'Nome,Email,Plano,Status,Nível,Indicações,Data\n'
    const rows = referrals.map(r =>
      `"${r.name}","${r.email}","${r.plan}","${r.status}",${r.level},${r.directReferrals ?? 0},"${r.date}"`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'referrals-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Network Health indicator
  const healthRatio = activeCount / totalNetwork
  const healthLabel = healthRatio >= 0.7 ? 'Saudável' : healthRatio >= 0.4 ? 'Moderado' : 'Crítico'
  const healthColor = healthRatio >= 0.7 ? 'text-emerald-600' : healthRatio >= 0.4 ? 'text-amber-600' : 'text-red-600'
  const healthBg = healthRatio >= 0.7 ? 'bg-emerald-100 dark:bg-emerald-950/30' : healthRatio >= 0.4 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-red-100 dark:bg-red-950/30'

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'NewMobility - Indique e Ganhe',
        text: `Use meu código ${user?.referralCode || 'USER2025'} e ganhe CashBack!`,
        url: referralLink,
      })
    } else {
      handleCopyLink()
    }
  }

  const handleLinkCopyAnimation = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1500)
    })
  }

  const planBadgeColor = (plan: string) => {
    switch (plan) {
      case 'blue5': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'blue3': return 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400'
      default: return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  // Share progress - how many more referrals for next reward tier
  const nextTierAt = 10
  const currentDirect = totalDirect
  const remainingForNext = nextTierAt - currentDirect

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('referrals.title')}</h2>
        <p className="text-sm text-muted-foreground">Gerencie e acompanhe sua rede de indicações</p>
      </div>

      {/* Referral Link Section with animated gradient border */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-sm bg-card overflow-hidden relative animate-shimmer-border">
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 animate-gradient-shift" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-foreground">Link de Indicação</h3>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg px-3 py-2.5 border border-emerald-200 dark:border-emerald-800">
              <span className="text-sm font-mono text-foreground flex-1 truncate">{referralLink}</span>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLinkCopyAnimation}
                  className="h-8 px-3 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/40"
                >
                  <motion.div
                    key={linkCopied ? 'copied' : 'copy'}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    {linkCopied ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </motion.div>
                  <span className="text-xs">{linkCopied ? 'Copiado!' : 'Copiar'}</span>
                </Button>
              </motion.div>
            </div>
            <ShareOptions
              referralLink={referralLink}
              referralCode={user?.referralCode || 'USER2025'}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity Feed */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-foreground">Atividade Recente</h4>
            </div>
            <div className="space-y-2">
              {activityLoading ? (
                // Skeleton — mirrors the shape of the real entries.
                [0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))
              ) : activity.length === 0 ? (
                <div className="py-6 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhuma atividade recente</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Compartilhe seu link para começar a construir sua rede.
                  </p>
                </div>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Avatar className="w-7 h-7 border border-emerald-100 dark:border-emerald-900 shrink-0">
                      {item.avatar ? (
                        <AvatarImage src={item.avatar} alt={item.name} />
                      ) : null}
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] font-bold">
                        {item.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                      <p className={`text-[10px] truncate ${item.type === 'cashback' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
                        {item.action}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge className={`text-[8px] border ${planBadgeColor(item.plan)}`}>{getPlanName(item.plan)}</Badge>
                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards — top summary section (Task 10).
          Shows the four headline metrics requested: total de indicados,
          indicações ativas, indicações pendentes, ganhos por indicação.
          Active/Pending come from the server-computed `stats` payload
          (full-network counts, not the depth-limited tree) and earnings
          aggregate all three cashback tables for the current user. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: 'TOTAL DE INDICADOS',
            value: totalNetwork,
            color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            trend: `${totalDirect} diretos · +${newThisMonth} este mês`,
          },
          {
            icon: UserCheck,
            label: 'INDICAÇÕES ATIVAS',
            value: activeNetwork,
            color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
            trend: `${conversionRate}% de conversão`,
          },
          {
            icon: Clock,
            label: 'INDICAÇÕES PENDENTES',
            value: pendingNetwork,
            color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            trend: 'Aguardando ativação',
          },
          {
            icon: TrendingUp,
            label: 'GANHOS POR INDICAÇÃO',
            value: formatBRL(totalEarningsCents),
            color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
            trend: 'Total acumulado',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Network Growth Chart + Share Progress Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-sm bg-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Crescimento da Rede
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">+100%</Badge>
                <span className="text-[10px] text-muted-foreground">últimos 6 meses</span>
              </div>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={networkGrowthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      formatter={(value: number) => [`${value} indicados`, 'Total']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} animationDuration={1200} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Referrers Leaderboard with medals */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-sm bg-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Medal className="h-4 w-4 text-emerald-600" />
                Top Indicadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referrals.length > 0 ? (
                  referrals
                    .slice()
                    .sort((a, b) => (b.directReferrals ?? 0) - (a.directReferrals ?? 0))
                    .filter(r => (r.directReferrals ?? 0) > 0)
                    .slice(0, 3)
                    .map((referrer, idx) => {
                      const rank = idx + 1
                      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
                      const medalBg = rank === 1 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : rank === 2 ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                      return (
                        <div key={referrer.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${medalBg}`}>
                          <span className="text-xl">{medal}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{referrer.name}</p>
                            <p className="text-xs text-muted-foreground">Nível {referrer.level}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{referrer.directReferrals ?? 0}</p>
                            <p className="text-[10px] text-muted-foreground">Indicações</p>
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-xs text-muted-foreground">Sem indicados ainda</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Share Progress Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Próximo Nível de Recompensa</p>
                <p className="text-xs text-muted-foreground">
                  Faltam <span className="font-bold text-emerald-600 dark:text-emerald-400">{remainingForNext} indicações</span> para desbloquear bônus de R$ 200
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{currentDirect}/{nextTierAt}</p>
                <p className="text-[10px] text-muted-foreground">indicações</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-emerald-200 dark:bg-emerald-900/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(currentDirect / nextTierAt) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Comparison: This Week vs Last Week */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-foreground">Comparação Semanal</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-900/50">
                <p className="text-xs text-muted-foreground mb-1">Esta Semana</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{thisWeekCount}</p>
                <p className="text-[10px] text-muted-foreground">novos indicados</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700/50">
                <p className="text-xs text-muted-foreground mb-1">Semana Anterior</p>
                <p className="text-2xl font-bold text-foreground">{lastWeekCount}</p>
                <p className="text-[10px] text-muted-foreground">novos indicados</p>
              </div>
            </div>
            {thisWeekCount > lastWeekCount && (
              <div className="mt-2 flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp className="h-3 w-3" />
                +{((thisWeekCount - lastWeekCount) / Math.max(lastWeekCount, 1) * 100).toFixed(0)}% em relação à semana anterior
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Network Tree Visualization */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Visualização da Rede
            </CardTitle>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setNetworkModalOpen(true)}>
              <Maximize2 className="h-3.5 w-3.5" />
              {t('network.viewFull')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/30 border-4 border-emerald-200 dark:border-emerald-800">
                Você
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white text-[8px] flex items-center justify-center border-2 border-card font-bold animate-pulse-soft">
                {totalNetwork}
              </div>
            </motion.div>
            <div className="w-px h-6 bg-gradient-to-b from-emerald-400 to-border" />
            <div className="hidden sm:flex w-64 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
            
            {Array.from({ length: maxLevelWithData }, (_, idx) => {
              const lvl = idx + 1
              const lvlData = referrals.filter((r) => r.level === lvl)
              const lvlActive = lvlData.filter((r) => r.status === 'active').length
              return (
                <div key={lvl} className="w-full">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
                    <span className="text-xs text-muted-foreground font-medium px-2">
                      Nível {lvl} — {lvlData.length} {lvlData.length === 1 ? 'membro' : 'membros'}
                      <span className="text-emerald-600 dark:text-emerald-400 ml-1">({lvlActive} ativos)</span>
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {lvlData.map((r, ri) => (
                      <motion.div
                        key={r.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.08 + ri * 0.03, type: "spring", stiffness: 400, damping: 20 }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold border-2 cursor-pointer hover:scale-110 transition-transform shadow-sm relative ${
                          r.status === 'active'
                            ? r.plan === 'blue5'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700'
                              : r.plan === 'blue3'
                              ? 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-400 dark:border-teal-700'
                              : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
                            : 'bg-red-50 text-red-400 border-red-200 opacity-50 dark:bg-red-950/20'
                        }`}
                        title={r.name}
                        onClick={() => setDetailReferral(r)}
                      >
                        {r.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        {/* Plan badge dot */}
                        {r.status === 'active' && (
                          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-900 ${
                            r.plan === 'blue5' ? 'bg-emerald-500' : r.plan === 'blue3' ? 'bg-teal-500' : 'bg-gray-400'
                          }`} />
                        )}
                      </motion.div>
                    ))}
                  </div>
                  {lvl < maxLevelWithData && (
                    <div className="flex justify-center mt-2">
                      <div className="w-px h-4 bg-border" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Níveis da Rede */}
      <Card className="shadow-sm bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              Níveis da Rede
            </CardTitle>
            {maxLevelWithData > 5 && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowAllLevels(!showAllLevels)}>
                {showAllLevels ? 'Ver menos' : 'Ver todos'}
                {showAllLevels ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <AnimatePresence>
              {visibleLevels.map((lvl, i) => {
                const barWidth = totalNetwork > 0 ? Math.max((lvl.count / totalNetwork) * 100, 8) : 8
                return (
                  <motion.div
                    key={lvl.level}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-muted/50 rounded-lg p-3 border border-border"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Nível {lvl.level}</span>
                      <span className="text-sm font-bold text-foreground">{lvl.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {lvl.count === 1 ? '1 usuário' : `${lvl.count} usuários`}
                    </p>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[null, 1, 2, 3, 4, 5].map((level) => (
            <button
              key={level ?? 'all'}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                levelFilter === level
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {level === null ? 'Todos' : `Nível ${level}`}
            </button>
          ))}
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
            <option value="all">Todos os Planos</option>
            <option value="free">Gratuito</option>
            <option value="blue3">Blue 3</option>
            <option value="blue5">Blue 5</option>
          </select>
          <select value={statusFilterVal} onChange={(e) => setStatusFilterVal(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExportCSV}>
            <Download className="h-3 w-3" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Referral List */}
      <Card className="shadow-sm bg-card">
        <CardContent className="p-0">
          <div className="divide-y max-h-96 overflow-y-auto custom-scrollbar">
            {filtered.map((referral, i) => (
              <motion.div
                key={referral.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10 border-2 border-emerald-100 dark:border-emerald-900">
                  <AvatarFallback className="bg-emerald-50 text-emerald-700 text-sm font-medium dark:bg-emerald-950/30 dark:text-emerald-400">
                    {referral.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">{referral.name}</span>
                    <Badge className={`text-[10px] border ${planBadgeColor(referral.plan)}`}>
                      {getPlanName(referral.plan)}
                    </Badge>
                    <Badge variant={getStatusVariant(referral.status)} className="text-[10px]">
                      {getStatusLabel(referral.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatDate(referral.date)}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Nível {referral.level}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{referral.directReferrals ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Indicações feitas</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                    onClick={() => setDetailReferral(referral)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <EmptyState
                icon={Users}
                title="Nenhum indicado ainda"
                description="Compartilhe seu link de indicação e comece a construir sua rede para ganhar CashBack!"
                actionLabel="Compartilhar link"
                onAction={handleShare}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailReferral} onOpenChange={() => setDetailReferral(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Indicado</DialogTitle>
            <DialogDescription className="sr-only">Dialog showing details of a referral member</DialogDescription>
          </DialogHeader>
          {detailReferral && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-emerald-200 dark:border-emerald-800">
                  <AvatarFallback className="bg-emerald-50 text-emerald-700 text-lg font-medium dark:bg-emerald-950/30 dark:text-emerald-400">
                    {detailReferral.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-foreground">{detailReferral.name}</h3>
                  <p className="text-sm text-muted-foreground">{detailReferral.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] border ${planBadgeColor(detailReferral.plan)}`}>
                      {getPlanName(detailReferral.plan)}
                    </Badge>
                    <Badge variant={getStatusVariant(detailReferral.status)} className="text-[10px]">
                      {getStatusLabel(detailReferral.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Entrada</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatDate(detailReferral.date)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Nível</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Nível {detailReferral.level}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Indicações Feitas</span>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{detailReferral.directReferrals ?? 0}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Plano</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{getPlanName(detailReferral.plan)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Network Modal */}
      <NetworkModal open={networkModalOpen} onOpenChange={setNetworkModalOpen} />
    </div>
  )
}
