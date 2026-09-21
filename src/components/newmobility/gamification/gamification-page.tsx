'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { getPlanName, cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
// ADM-7 — Use the canonical BRL formatter (handles NaN/null safely) so the
// streak reward always renders as "R$ X,XX" when rewardType === 'cashback'
// (matching what the admin configured) and "X pts" when rewardType === 'points'.
// This closes the divergence between the Admin (which stores rewardAmount in
// cents) and the backoffice (which previously rendered the raw integer as
// points regardless of rewardType).
import { formatBRL } from '@/lib/format'
import {
  Flame, Trophy, Medal, Target, Star, Zap, Calendar,
  Crown, Award, Gift, TrendingUp, Users, Check,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface StreakData {
  currentStreak: number
  longestStreak: number
  totalPoints: number
  // ADM-7 — `rewardType` and `amount` come from the admin-managed
  // StreakReward table. `amount` is the raw rewardAmount integer:
  //   - rewardType='points'  → amount = number of career points
  //   - rewardType='cashback' → amount = value in BRL cents (divide by 100)
  // `points` is kept as an alias for backwards-compat with older builds.
  streakRewards: {
    days: number
    points: number
    amount: number
    rewardType: 'points' | 'cashback'
    claimed: boolean
  }[]
}

interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  plan: string
  careerPoints: number
  directReferrals: number
  badge: string | null
}

interface ChallengeData {
  id: string
  title: string
  description: string
  type: string
  targetValue: number
  rewardPoints: number
  isActive: boolean
  currentValue: number
  completed: boolean
  progress: number
}

export function GamificationPage() {
  const { t } = useTranslation()
  const { user } = useStore()
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [challenges, setChallenges] = useState<ChallengeData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [streakData, lbData, challengeData] = await Promise.all([
        apiFetch<StreakData>(`/gamification/streak?userId=${user?.id}`).catch(() => null),
        apiFetch<{ leaderboard: LeaderboardEntry[] }>('/gamification/leaderboard').catch(() => ({ leaderboard: [] })),
        apiFetch<{ challenges: ChallengeData[] }>(`/gamification/challenges?userId=${user?.id}`).catch(() => ({ challenges: [] })),
      ])
      if (streakData) setStreak(streakData)
      setLeaderboard(lbData.leaderboard || [])
      setChallenges(challengeData.challenges || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = { free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', blue3: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', blue5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
    return colors[plan] || colors.free
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-emerald-600" />
          Gamificação
          <Badge className={cn('ml-2', getPlanBadge(user?.plan || 'free'))}>
            {getPlanName(user?.plan || 'free')}
          </Badge>
        </h2>
        <p className="text-sm text-muted-foreground">Acompanhe seu progresso, desafios e conquistas</p>
      </div>

      {/* Streak Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-8 w-8" />
                  <span className="text-3xl font-bold">{streak?.currentStreak || 0}</span>
                  <span className="text-lg opacity-80">dias seguidos</span>
                </div>
                <p className="text-sm opacity-80">Maior sequência: {streak?.longestStreak || 0} dias</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{streak?.totalPoints || 0}</p>
                <p className="text-xs opacity-80">pontos de login</p>
              </div>
            </div>
            {/* Streak visual */}
            <div className="flex gap-1 mt-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-8 rounded-md flex items-center justify-center text-xs font-bold ${
                    i < (streak?.currentStreak || 0) % 7 || (streak?.currentStreak || 0) >= 7
                      ? 'bg-white/30'
                      : 'bg-white/10'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Recompensas de Sequência</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {streak?.streakRewards.map((reward, i) => {
                // ADM-7 — Render the reward correctly based on its type:
                //   cashback  → "+R$ X,XX"  (amount is in BRL cents; formatBRL
                //                            divides by 100 and formats as BRL)
                //   points    → "+X pts"    (amount is the raw point count)
                // The rewardType comes straight from the admin-managed
                // StreakReward table, so an admin who configures R$ 10,00 for
                // a 10-day streak (rewardType='cashback', rewardAmount=1000)
                // will see "10 dias · +R$ 10,00" here — NOT "1000 pontos".
                const isCashback = reward.rewardType === 'cashback'
                const rawAmount = reward.amount ?? reward.points ?? 0
                const rewardLabel = isCashback
                  ? `+${formatBRL(rawAmount)}`
                  : `+${rawAmount} pts`
                return (
                  <div key={i} className={`p-3 rounded-lg border text-center ${
                    reward.claimed
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-muted/50 border-border'
                  }`}>
                    <Flame className={`h-5 w-5 mx-auto mb-1 ${reward.claimed ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-bold text-foreground">{reward.days} dias</p>
                    <p className="text-xs text-muted-foreground">{rewardLabel}</p>
                    {reward.claimed && <Badge className="mt-1 bg-emerald-600 text-white text-[9px]"><Check className="h-2.5 w-2.5 mr-0.5" />Conquistado</Badge>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Leaderboard & Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-600" />
              Ranking Top Indicadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {leaderboard.slice(0, 10).map((entry) => (
                <div key={entry.id} className={`flex items-center gap-3 p-2 rounded-lg ${
                  entry.id === user?.id ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' : 'bg-muted/30'
                }`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-muted">
                    {entry.badge || entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                      {entry.id === user?.id && <Badge className="bg-emerald-600 text-white text-[9px]">Você</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPlanBadge(entry.plan)}>{getPlanName(entry.plan)}</Badge>
                      <span className="text-[10px] text-muted-foreground">{entry.careerPoints} pts</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{entry.directReferrals || 0}</p>
                    <p className="text-[10px] text-muted-foreground">indicações</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" />
              Desafios Semanais e Mensais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {challenges.map((challenge) => (
                <div key={challenge.id} className={`p-3 rounded-lg border ${
                  challenge.completed
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-muted/30 border-border'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{challenge.title}</p>
                        {challenge.completed && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{challenge.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <Badge variant="secondary" className="text-[9px]">{challenge.type === 'weekly' ? 'Semanal' : 'Mensal'}</Badge>
                      <p className="text-[10px] font-bold text-emerald-600 mt-1">+{challenge.rewardPoints} pts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={challenge.progress} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground">{Math.round(challenge.progress)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
