'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { cn, getPlanName } from '@/lib/utils'
import { leaderboardApi } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Users,
  Star,
  Crown,
  Target,
} from 'lucide-react'

interface LeaderboardUser {
  id: string
  name: string
  plan: string
  profileImage: string | null
  value: number
  valueDisplay: string
  rank: number
}

interface UserRankInfo {
  position: number
  earnings: { position: number; value: string }
  referrals: { position: number; value: string }
  points: { position: number; value: string }
}

interface LeaderboardData {
  type: string
  period: string
  top10: LeaderboardUser[]
  userRank: UserRankInfo
  totalUsers: number
}

// Animated number counter
function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1500 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    // Re-animate whenever `value` changes — without this, switching tabs
    // (e.g. from Indicações to Pontos) would freeze the displayed number
    // at the previous tab's value because the `hasAnimated` ref blocked
    // every subsequent run. We removed the ref so the counter always
    // animates from 0 → value on every tab switch.
    const steps = 50
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value, duration])
  return <span>{prefix}{display.toLocaleString('pt-BR')}{suffix}</span>
}

// Empty leaderboard data shape (used when API returns no entries)
function getEmptyLeaderboard(type: string): LeaderboardData {
  return {
    type,
    period: 'monthly',
    top10: [],
    userRank: {
      position: 0,
      earnings: { position: 0, value: '—' },
      referrals: { position: 0, value: '—' },
      points: { position: 0, value: '—' },
    },
    totalUsers: 0,
  }
}

function getPlanBadge(plan: string) {
  switch (plan) {
    case 'blue5':
      return { label: 'PRO', className: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] px-1.5 py-0 h-4 border-0' }
    case 'blue3':
      return { label: 'Blue 3', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[8px] px-1.5 py-0 h-4 border-0' }
    default:
      return { label: 'Free', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[8px] px-1.5 py-0 h-4 border-0' }
  }
}

// Podium component for top 3
function PodiumDisplay({ top3, activeTab }: { top3: LeaderboardUser[]; activeTab: string }) {
  if (top3.length < 3) return null
  const [first, second, third] = top3
  const maxValue = first.value

  const podiumOrder = [second, first, third] // 2nd, 1st, 3rd (1st in center)
  const podiumHeights = ['h-24', 'h-32', 'h-20'] // 2nd=left, 1st=center, 3rd=right
  const podiumAnimations = ['animate-podium-rise-delay-1', 'animate-podium-rise', 'animate-podium-rise-delay-2']
  const podiumColors = [
    'from-gray-300 to-gray-400', // 2nd - silver
    'from-amber-400 to-yellow-300', // 1st - gold
    'from-amber-600 to-amber-700', // 3rd - bronze
  ]
  const podiumBgColors = [
    'bg-gray-100 dark:bg-gray-800',
    'bg-amber-50 dark:bg-amber-950/30',
    'bg-orange-50 dark:bg-orange-950/30',
  ]

  return (
    <div className="flex items-end justify-center gap-3 mb-6 pt-4">
      {podiumOrder.map((entry, idx) => {
        const isFirst = entry.rank === 1
        const planBadge = getPlanBadge(entry.plan)
        const initials = entry.name.split(' ').map(n => n[0]).slice(0, 2).join('')
        const progressPct = (entry.value / maxValue) * 100

        return (
          <div key={entry.id} className={`flex flex-col items-center ${podiumAnimations[idx]}`}>
            {/* Crown for #1 */}
            {isFirst && (
              <div className="mb-1 animate-crown-bounce">
                <Crown className="h-6 w-6 text-amber-400" />
              </div>
            )}

            {/* Avatar */}
            <Avatar className={cn(
              'border-2 mb-2',
              isFirst ? 'h-14 w-14 border-amber-400' : entry.rank === 2 ? 'h-12 w-12 border-gray-400' : 'h-11 w-11 border-amber-600',
            )}>
              <AvatarFallback className={cn(
                'text-xs font-bold',
                isFirst ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground',
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Name and plan */}
            <div className="text-center mb-2">
              <p className={cn('text-xs font-bold truncate max-w-[80px]', isFirst && 'text-amber-700 dark:text-amber-400')}>
                {entry.name.split(' ')[0]}
              </p>
              <Badge className={cn('text-[7px] px-1 py-0 h-3', planBadge.className)}>
                {planBadge.label}
              </Badge>
            </div>

            {/* Value */}
            <div className={cn(
              'text-xs font-bold mb-2',
              isFirst ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
            )}>
              {entry.valueDisplay}
            </div>

            {/* Progress bar */}
            <div className="w-16 h-1.5 bg-muted rounded-full mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ delay: 0.5 + idx * 0.1, duration: 0.8, ease: 'easeOut' }}
                className={cn('h-full rounded-full bg-gradient-to-r', podiumColors[idx])}
              />
            </div>

            {/* Podium block */}
            <div className={cn(
              'w-20 rounded-t-lg flex items-center justify-center',
              podiumBgColors[idx],
              podiumHeights[idx],
            )}>
              <div className={cn(
                'w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm',
                podiumColors[idx],
              )}>
                {entry.rank}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function LeaderboardPage() {
  const { user } = useStore()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('referrals')
  const [period, setPeriod] = useState('monthly')
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // Default to 'referrals' tab on first mount so the leaderboard never
    // opens on the removed 'earnings' tab (which would show an empty
    // dataset because the API now treats 'earnings' as a privacy-safe
    // alias for 'referrals').
  }, [user?.id, activeTab, period])

  const loadData = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const result = await leaderboardApi.getData(user.id, activeTab, period)
      if (result && result.top10 && result.top10.length > 0) {
        setData(result as LeaderboardData)
      } else {
        // API returned empty — show proper empty state, no mock entries
        setData(getEmptyLeaderboard(activeTab))
      }
    } catch {
      setData(getEmptyLeaderboard(activeTab))
    } finally {
      setLoading(false)
    }
  }

  const tabConfig = [
    { key: 'referrals', label: t('leaderboard.referrals'), icon: Users },
    { key: 'points', label: t('leaderboard.points'), icon: Star },
  ]

  const periodOptions = [
    { key: 'monthly', label: t('leaderboard.monthly') },
    { key: 'quarterly', label: t('leaderboard.quarterly') },
    { key: 'yearly', label: t('leaderboard.yearly') },
  ]

  const currentUserId = user?.id || ''
  const top10 = data?.top10 ?? []
  const maxValue = top10.length > 0 ? top10[0].value : 1
  const isEmpty = top10.length === 0

  return (
    <div className="space-y-6">
      {/* Gradient Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 animate-gradient-shift relative">
            <div className="absolute inset-0 animate-shimmer" />
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='20' cy='20' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            <CardContent className="p-5 md:p-6 relative">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-white">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <Trophy className="h-7 w-7" />
                    Ranking
                  </h2>
                  <p className="text-sm text-amber-100 mt-1">
                    Os melhores da NewMobility nesta temporada
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2">
                    <Crown className="h-4 w-4 text-yellow-200" />
                    <div className="text-white">
                      <span className="text-xs text-amber-100">1º Lugar</span>
                      <p className="text-sm font-bold">
                        {top10[0]
                          ? <AnimatedNumber
                              value={top10[0].value}
                              suffix={activeTab === 'points' ? ' pts' : ' indicações'}
                            />
                          : <span className="text-amber-100">—</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2">
                    <Users className="h-4 w-4 text-yellow-200" />
                    <div className="text-white">
                      <span className="text-xs text-amber-100">Participantes</span>
                      <p className="text-sm font-bold"><AnimatedNumber value={data?.totalUsers ?? 0} /></p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Your Rank Card — only render when there is real ranking data */}
      {data?.userRank && !isEmpty && data.userRank.position > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="shadow-sm border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-foreground">{t('leaderboard.yourRank')}</h3>
              </div>
              {/* Two-column rank summary — "Ganhos" column intentionally
                  removed per user request (privacy: no R$ earnings on
                  user-facing pages). Shows only Referrals and Points. */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="h-3.5 w-3.5 text-teal-600" />
                    <span className="text-xs text-muted-foreground font-medium">{t('leaderboard.referrals')}</span>
                  </div>
                  <p className="text-lg font-bold text-teal-600 dark:text-teal-400">#{data.userRank.referrals.position}</p>
                  <p className="text-[10px] text-muted-foreground">{data.userRank.referrals.value}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs text-muted-foreground font-medium">{t('leaderboard.points')}</span>
                  </div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">#{data.userRank.points.position}</p>
                  <p className="text-[10px] text-muted-foreground">{data.userRank.points.value}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('leaderboard.totalUsers')}</span>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                  {data.totalUsers} membros
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            {tabConfig.map(tab => {
              const TabIcon = tab.icon
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5 text-xs sm:text-sm">
                  <TabIcon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(opt => (
                <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tabConfig.map(tab => (
          <TabsContent key={tab.key} value={tab.key} className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                      <div className="h-6 bg-muted rounded w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isEmpty ? (
              <Card className="shadow-sm">
                <CardContent className="p-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">Nenhum usuário no ranking ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Comece a indicar amigos e ganhar CashBack para aparecer aqui!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Podium for top 3 */}
                {top10.length >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card className="shadow-sm bg-card mb-4">
                      <CardContent className="p-4 pt-2">
                        <PodiumDisplay top3={top10.slice(0, 3)} activeTab={activeTab} />
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Remaining entries (4th+) */}
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {top10.slice(3).map((entry, index) => {
                      const isCurrentUser = entry.id === currentUserId
                      const planBadge = getPlanBadge(entry.plan)
                      const progressPct = (entry.value / maxValue) * 100

                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 15 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                        >
                          <Card className={cn(
                            'shadow-sm bg-card leaderboard-row-hover',
                            isCurrentUser
                              ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-500/30'
                              : '',
                          )}>
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-center gap-3">
                                {/* Rank number */}
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 bg-muted text-muted-foreground">
                                  {entry.rank}
                                </div>

                                {/* Avatar */}
                                <Avatar className="h-9 w-9 border-2 shrink-0 border-transparent">
                                  <AvatarFallback className={cn(
                                    'text-xs font-semibold',
                                    isCurrentUser
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-muted text-muted-foreground',
                                  )}>
                                    {entry.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                  </AvatarFallback>
                                </Avatar>

                                {/* Name and plan + progress bar */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      'text-sm font-medium truncate',
                                      isCurrentUser ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground',
                                    )}>
                                      {entry.name}
                                    </span>
                                    {isCurrentUser && (
                                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] px-1.5 py-0 h-4 border-0 shrink-0">
                                        Você
                                      </Badge>
                                    )}
                                    <Badge className={cn('text-[8px] px-1.5 py-0 h-4', planBadge.className)}>
                                      {planBadge.label}
                                    </Badge>
                                  </div>
                                  {/* Gradient progress bar showing relative value */}
                                  <div className="h-1.5 bg-muted rounded-full">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progressPct}%` }}
                                      transition={{ delay: 0.3 + index * 0.05, duration: 0.8, ease: 'easeOut' }}
                                      className={cn(
                                        'h-full rounded-full',
                                        entry.rank <= 3 ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : 'bg-gradient-to-r from-emerald-400 to-teal-400',
                                      )}
                                    />
                                  </div>
                                </div>

                                {/* Value */}
                                <div className="text-right shrink-0">
                                  <p className={cn(
                                    'text-sm font-bold',
                                    entry.rank <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
                                  )}>
                                    {entry.valueDisplay}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
