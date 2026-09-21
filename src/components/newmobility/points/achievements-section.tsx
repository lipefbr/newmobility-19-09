'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import {
  Trophy, Star, Users, DollarSign, ArrowDownToLine, Award,
  Zap, Target, Crown, Flame, Gift, Shield, Lock, Loader2, Car, LifeBuoy
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string | null
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  pointsReward: number
  progress: number
  targetValue: number
  earned: boolean
  earnedDate?: string | null
  sortOrder?: number
}

interface AchievementsSummary {
  earned: number
  total: number
  completionPct: number
  points: number
}

// Map icon string (from DB or fallback) to a lucide-react component.
// Icons from the DB may be emojis (🎯, 🥉) — those are rendered as text fallback.
const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  DollarSign,
  ArrowDownToLine,
  Award,
  Zap,
  Target,
  Crown,
  Flame,
  Gift,
  Shield,
  Star,
  Trophy,
  Car,
  LifeBuoy,
}

function isEmoji(str: string): boolean {
  // Heuristic: if the string contains characters outside the basic ASCII range,
  // or is short (<=2 chars), treat it as an emoji / literal text.
  if (!str) return false
  if (str.length <= 2) return true
  // Match characters outside ASCII printable range (emoji, symbols, etc.)
  return /[^\x20-\x7E]/.test(str)
}

const rarityColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  common: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', glow: '' },
  rare: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', glow: '' },
  epic: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', glow: 'shadow-purple-200/50 dark:shadow-purple-800/30' },
  legendary: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', glow: 'shadow-amber-200/50 dark:shadow-amber-800/30' },
}

const rarityLabels: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
}

export function AchievementsSection() {
  const { user } = useStore()
  const { t } = useTranslation()

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [summary, setSummary] = useState<AchievementsSummary>({
    earned: 0,
    total: 0,
    completionPct: 0,
    points: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch(
          `/api/achievements?userId=${encodeURIComponent(user.id)}`,
          { cache: 'no-store' }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setAchievements(Array.isArray(data?.achievements) ? data.achievements : [])
          if (data?.summary) setSummary(data.summary)
        }
      } catch (err) {
        console.error('Failed to load achievements:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const earnedAchievements = achievements.filter((a) => a.earned)
  const lockedAchievements = achievements.filter((a) => !a.earned)

  const formatProgress = (a: Achievement) => {
    // BACK-8 — always show PONTOS, never R$. Previously this branch formatted
    // the progress / target as BRL currency (R$ X / R$ 5.000,00) for any
    // achievement whose targetValue was >= 100000 (treated as cashback cents).
    // That mixed unit (cents) with the rest of the achievements which are in
    // raw point counts, producing confusing displays like "R$ 5.000,00" for a
    // cashback achievement. Now every achievement shows points uniformly.
    return `${a.progress.toLocaleString('pt-BR')} / ${a.targetValue.toLocaleString('pt-BR')} pts`
  }

  const renderIcon = (iconStr: string | null, className?: string) => {
    if (!iconStr) {
      return <Award className={className} />
    }
    if (isEmoji(iconStr)) {
      return <span className="text-lg leading-none" aria-hidden>{iconStr}</span>
    }
    const Icon = ICON_MAP[iconStr] ?? Award
    return <Icon className={className} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Carregando conquistas...</span>
      </div>
    )
  }

  if (achievements.length === 0) {
    return (
      <Card className="shadow-sm bg-card">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          {t('achievements.lockedTitle')}: nenhuma conquista configurada.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm bg-card">
          <CardContent className="p-3 text-center">
            <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">
              {summary.earned}/{summary.total}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">{t('achievements.earned')}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-3 text-center">
            <Star className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{summary.points}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{t('achievements.points')}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-3 text-center">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{summary.completionPct}%</p>
            <p className="text-[10px] text-muted-foreground font-medium">{t('achievements.completion')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card className="shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{t('achievements.overallProgress')}</span>
            <span className="text-sm font-bold text-emerald-600">{summary.completionPct}%</span>
          </div>
          <Progress value={summary.completionPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Earned Achievements */}
      {earnedAchievements.length > 0 && (
        <Card className="shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              {t('achievements.earnedTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {earnedAchievements.map((achievement, i) => {
                const colors = rarityColors[achievement.rarity]
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`relative p-4 rounded-xl border ${colors.border} ${colors.bg} ${colors.glow ? `shadow-md ${colors.glow}` : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg ${colors.bg} ${colors.text} border ${colors.border} flex items-center justify-center min-w-[2.5rem] min-h-[2.5rem]`}>
                        {renderIcon(achievement.icon, 'h-5 w-5')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{achievement.name}</h4>
                          <Badge className={`text-[9px] ${colors.text} ${colors.bg} border ${colors.border}`}>
                            {rarityLabels[achievement.rarity]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                          <Star className="h-3 w-3" />
                          {achievement.earnedDate
                            ? new Date(achievement.earnedDate).toLocaleDateString('pt-BR')
                            : ''}
                          {achievement.pointsReward > 0 && (
                            <span className="ml-1">· +{achievement.pointsReward} pts</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2">
                      <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Achievements */}
      <Card className="shadow-sm bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            {t('achievements.lockedTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lockedAchievements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Todas as conquistas foram desbloqueadas! 🎉
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lockedAchievements.map((achievement, i) => {
                const colors = rarityColors[achievement.rarity]
                const progressPct =
                  achievement.targetValue > 0
                    ? Math.min(100, (achievement.progress / achievement.targetValue) * 100)
                    : 0
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative p-4 rounded-xl border border-border bg-muted/30 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-muted text-muted-foreground border border-border flex items-center justify-center min-w-[2.5rem] min-h-[2.5rem]">
                        {renderIcon(achievement.icon, 'h-5 w-5')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-muted-foreground">{achievement.name}</h4>
                          <Badge className={`text-[9px] ${colors.text} ${colors.bg} border ${colors.border}`}>
                            {rarityLabels[achievement.rarity]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{formatProgress(achievement)}</span>
                            <span>{progressPct.toFixed(0)}%</span>
                          </div>
                          <Progress value={progressPct} className="h-1.5" />
                        </div>
                        {achievement.pointsReward > 0 && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5">
                            Recompensa: +{achievement.pointsReward} pts
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
