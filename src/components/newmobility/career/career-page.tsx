'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { careerApi } from '@/lib/api'
import { toast } from 'sonner'
import {
  Trophy, Star, TrendingUp, Award, Target, Crown,
  Zap, Shield, Percent, Gift, CheckCircle2, ArrowRight, Sparkles, Lock, Unlock,
  Car, Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

// Shape used by the UI to render each career level. The DB-backed plan is
// mapped into this shape after the API call succeeds.
interface CareerLevel {
  id: string
  code: string
  name: string
  icon: typeof Award
  iconEmoji: string
  starsRequired: number
  pointsRequired: number
  // Hex color from the DB (`CareerPlan.color`). Used via inline styles so
  // the admin can edit the color in the admin panel and see it reflected.
  color: string
  // BACK-9 — separate reward fields. All money values are stored in BRL
  // cents; `rewardPoints` is an integer point count. `gratification` is a
  // free-text bonus description shown as the card subtitle.
  rewardWithdrawalCents: number  // 9.1 — Carteira Saque (R$ cents)
  rewardShoppingCents: number    // 9.2 — Carteira Compras (R$ cents)
  rewardPoints: number           // 9.3 — Pontos
  gratification: string | null   // 9.4 — Texto livre do bônus
  // Legacy combined reward (kept for backward-compat with the fallback UI
  // rendering of the "reward" cell in some legacy code paths). Derived from
  // rewardWithdrawalCents when set.
  reward: number
  // 'real' = reward is BRL cents (rendered as R$). 'points' = reward is a
  // point count (rendered as "X pts"). Sourced from CareerPlan.rewardType.
  rewardType: 'real' | 'points'
  cashbackMultiplier: string
  achieved: boolean
  benefits: string[]
  nextReward: string
  nextRewardIcon: string
  sortOrder: number
}

/**
 * Format a BRL cents value as a pt-BR currency string.
 */
function formatBRLFromCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((cents || 0) / 100)
}

/**
 * Build a comma-separated string listing ALL reward types configured on a
 * career level. Returns each non-zero reward formatted appropriately:
 *   - "Saque: R$ 2.000,00"  (when rewardWithdrawalCents > 0)
 *   - "Compras: R$ 500,00"  (when rewardShoppingCents > 0)
 *   - "1.000 pts"           (when rewardPoints > 0)
 * If no rewards are configured, returns "—".
 *
 * Replaces the old formatReward(reward, rewardType) helper which only knew
 * how to render a single combined reward.
 */
function formatReward(level: Pick<CareerLevel, 'rewardWithdrawalCents' | 'rewardShoppingCents' | 'rewardPoints'>): string {
  const parts: string[] = []
  if ((level.rewardWithdrawalCents ?? 0) > 0) {
    parts.push(`Saque: ${formatBRLFromCents(level.rewardWithdrawalCents)}`)
  }
  if ((level.rewardShoppingCents ?? 0) > 0) {
    parts.push(`Compras: ${formatBRLFromCents(level.rewardShoppingCents)}`)
  }
  if ((level.rewardPoints ?? 0) > 0) {
    parts.push(`${Number(level.rewardPoints).toLocaleString('pt-BR')} pts`)
  }
  return parts.length > 0 ? parts.join(' · ') : '—'
}

/**
 * Legacy single-reward formatter — kept for any callers that still pass a
 * (reward, rewardType) pair (e.g. fallback level arrays). Prefer
 * formatReward(level) for new code.
 */
function formatLegacyReward(reward: number, rewardType: 'real' | 'points'): string {
  if (rewardType === 'points') {
    return `${Number(reward || 0).toLocaleString('pt-BR')} pts`
  }
  return formatBRLFromCents(reward)
}

// Lucide icons cycled based on sortOrder so each plan gets a distinctive
// badge in the UI even though the DB only stores an emoji.
const ICON_CYCLE = [Award, Trophy, Crown, Shield, Zap, Percent, Gift]

function cashbackMultiplierFor(sortOrder: number): string {
  // Simple deterministic multiplier derived from the plan's position so the
  // admin doesn't need to maintain a separate field in the DB.
  return `${(1 + Math.max(sortOrder - 1, 0) * 0.2).toFixed(1)}x`
}

// Fallback UI list of the 5 client-spec career pins (Índice.docx §6).
// Used ONLY while the API call is in flight or fails. The real list comes
// from /api/career (admin-managed CareerPlan table). Each pin is a MONTHLY
// bonus paid every month as long as the user maintains that graduation:
//   Safira R$2.000 / Rubi R$3.000 / Esmeralda R$4.000
//   Diamante R$5.000 / Imperial R$6.000
// BACK-9 — fallback now uses the SEPARATE reward fields:
//   rewardWithdrawalCents / rewardShoppingCents / rewardPoints / gratification
const careerLevels: CareerLevel[] = [
  {
    id: 'safira',
    code: 'safira',
    name: 'Safira',
    icon: Award,
    iconEmoji: '🔷',
    starsRequired: 1,
    pointsRequired: 100,
    color: '#7DD3FC',
    rewardWithdrawalCents: 200000, // R$ 2.000/mês
    rewardShoppingCents: 0,
    rewardPoints: 0,
    gratification: 'Bônus de Safira ao atingir 100 pontos',
    reward: 200000, // legacy
    rewardType: 'real',
    cashbackMultiplier: '1.0x',
    achieved: false,
    benefits: ['PIN Safira - Categoria 3', 'Bônus mensal: R$ 2.000/mês', 'Pago todo mês ao manter a graduação'],
    nextReward: 'PIN Rubi',
    nextRewardIcon: '❤️',
    sortOrder: 1,
  },
  {
    id: 'rubi',
    code: 'rubi',
    name: 'Rubi',
    icon: Trophy,
    iconEmoji: '❤️',
    starsRequired: 2,
    pointsRequired: 250,
    color: '#F87171',
    rewardWithdrawalCents: 300000, // R$ 3.000/mês
    rewardShoppingCents: 0,
    rewardPoints: 0,
    gratification: 'Bônus de Rubi ao atingir 250 pontos',
    reward: 300000, // legacy
    rewardType: 'real',
    cashbackMultiplier: '1.2x',
    achieved: false,
    benefits: ['PIN Rubi - Categoria 2', 'Bônus mensal: R$ 3.000/mês', 'Pago todo mês ao manter a graduação'],
    nextReward: 'PIN Esmeralda',
    nextRewardIcon: '💚',
    sortOrder: 2,
  },
  {
    id: 'esmeralda',
    code: 'esmeralda',
    name: 'Esmeralda',
    icon: Crown,
    iconEmoji: '💚',
    starsRequired: 3,
    pointsRequired: 500,
    color: '#34D399',
    rewardWithdrawalCents: 400000, // R$ 4.000/mês
    rewardShoppingCents: 0,
    rewardPoints: 0,
    gratification: 'Bônus de Esmeralda ao atingir 500 pontos',
    reward: 400000, // legacy
    rewardType: 'real',
    cashbackMultiplier: '1.5x',
    achieved: false,
    benefits: ['PIN Esmeralda - Categoria 1', 'Bônus mensal: R$ 4.000/mês', 'Pago todo mês ao manter a graduação'],
    nextReward: 'PIN Diamante',
    nextRewardIcon: '💎',
    sortOrder: 3,
  },
  {
    id: 'diamante',
    code: 'diamante',
    name: 'Diamante',
    icon: Crown,
    iconEmoji: '💎',
    starsRequired: 4,
    pointsRequired: 1000,
    color: '#A78BFA',
    rewardWithdrawalCents: 500000, // R$ 5.000/mês
    rewardShoppingCents: 0,
    rewardPoints: 0,
    gratification: 'Bônus de Diamante ao atingir 1.000 pontos',
    reward: 500000, // legacy
    rewardType: 'real',
    cashbackMultiplier: '2.0x',
    achieved: false,
    benefits: ['PIN Diamante - Categoria 4', 'Bônus mensal: R$ 5.000/mês', 'Pago todo mês ao manter a graduação'],
    nextReward: 'PIN Imperial',
    nextRewardIcon: '👑',
    sortOrder: 4,
  },
  {
    id: 'imperial',
    code: 'imperial',
    name: 'Imperial',
    icon: Crown,
    iconEmoji: '👑',
    starsRequired: 5,
    pointsRequired: 2500,
    color: '#FBBF24',
    rewardWithdrawalCents: 600000, // R$ 6.000/mês
    rewardShoppingCents: 0,
    rewardPoints: 0,
    gratification: 'Bônus de Imperial ao atingir 2.500 pontos',
    reward: 600000, // legacy
    rewardType: 'real',
    cashbackMultiplier: '2.5x',
    achieved: false,
    benefits: ['PIN Imperial - Categoria 5', 'Bônus mensal: R$ 6.000/mês', 'Graduação máxima - Pago todo mês'],
    nextReward: 'Benefícios Exclusivos VIP',
    nextRewardIcon: '👑',
    sortOrder: 5,
  },
]

const motivationalMessages = [
  { minProgress: 0, maxProgress: 30, message: 'Continue firme! Cada passo conta na sua jornada.' },
  { minProgress: 30, maxProgress: 60, message: 'Você está no caminho certo! Não pare agora.' },
  { minProgress: 60, maxProgress: 85, message: 'Quase lá! O próximo rank está ao seu alcance.' },
  { minProgress: 85, maxProgress: 100, message: 'Incrível! Você está prestes a conquistar o próximo nível!' },
  { minProgress: 100, maxProgress: 999, message: 'Parabéns! Você atingiu o topo! Continue brilhando.' },
]

// Custom SVG Rank Badge with shimmer
function RankBadge({ level, size = 48, shimmer = false }: { level: CareerLevel; size?: number; shimmer?: boolean }) {
  // Use the hex color straight from the DB (`CareerPlan.color`) — falls back
  // to emerald if the admin left the field empty.
  const color = level.color || '#10b981'
  const Icon = level.icon
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 48 48">
        {/* Shield/Badge shape */}
        <path
          d="M24 4 L40 12 L40 28 Q40 40 24 46 Q8 40 8 28 L8 12 Z"
          fill={color}
          opacity={0.15}
          stroke={color}
          strokeWidth={1.5}
        />
        <path
          d="M24 8 L36 14 L36 27 Q36 37 24 42 Q12 37 12 27 L12 14 Z"
          fill={color}
          opacity={0.3}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="text-white" style={{ width: size * 0.35, height: size * 0.35 }} />
      </div>
      {/* Shimmer overlay on current rank badge */}
      {shimmer && (
        <div
          className="absolute inset-0 rounded-full animate-shimmer pointer-events-none"
          style={{
            mask: 'radial-gradient(circle, white 30%, transparent 70%)',
            WebkitMask: 'radial-gradient(circle, white 30%, transparent 70%)',
          }}
        />
      )}
    </div>
  )
}

// Animated Progress Ring Component
function ProgressRing({ progress, size = 120, strokeWidth = 10 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{Math.round(progress)}%</span>
        <span className="text-[10px] text-muted-foreground">Progresso</span>
      </div>
    </div>
  )
}

export function CareerPage() {
  const { t } = useTranslation()
  const { user } = useStore()
  const currentStars = user?.stars ?? 0
  // `currentPoints` is initialized from the user store but kept in local
  // state so we can sync it with the DB-backed value returned by the API
  // (the user store may be stale — e.g. after a career-points update on the
  // backend that hasn't propagated to the store yet).
  const [currentPoints, setCurrentPoints] = useState<number>(user?.careerPoints ?? 0)
  const personalPoints = user?.personalPoints ?? 0

  // careerLevels is kept ONLY as a loading fallback. The real list comes
  // from /api/career which reads the admin-managed CareerPlan table.
  const [levels, setLevels] = useState<CareerLevel[]>(careerLevels)
  const [apiCurrentRank, setApiCurrentRank] = useState<string | null>(null)

  // BACK-9 — claimed-gratification tracking. Maps planId → claimedAt ISO
  // string for every career plan the user has already claimed. Populated
  // from GET /api/career/claim on mount. Drives the "Reivindicar
  // Gratificação" / "Reivindicada" button state on each plan card.
  const [claimedPlanIds, setClaimedPlanIds] = useState<Record<string, string>>({})
  const [claimingPlanId, setClaimingPlanId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadCareer() {
      if (!user?.id) return
      try {
        const data = await careerApi.getData(user.id)
        if (cancelled || !data) return
        // Use the API's `totalPoints` (DB-backed careerPoints) as the source
        // of truth for achievement — the local user store may be stale. The
        // API response also includes a per-plan `achieved` flag computed
        // from the same DB value, so prefer that over a re-computation from
        // the potentially-stale user-store value.
        const apiTotalPoints = typeof data.totalPoints === 'number'
          ? data.totalPoints
          : currentPoints
        const plans = Array.isArray(data.plans) ? data.plans : []
        if (plans.length > 0) {
          const mapped: CareerLevel[] = plans.map((p: any, idx: number) => {
            const nextPlan = plans[idx + 1] as any | undefined
            const isAchieved = typeof p.achieved === 'boolean'
              ? p.achieved
              : apiTotalPoints >= p.minPoints
            // BACK-9 — read the new separate reward fields from the API
            // response. Fall back to the legacy combined `bonusCents` /
            // `rewardType` columns when the API response predates the
            // BACK-9 migration (defensive: older cached responses).
            const rewardWithdrawalCents =
              typeof p.rewardWithdrawalCents === 'number'
                ? p.rewardWithdrawalCents
                : (p.bonusCents || 0)
            const rewardShoppingCents =
              typeof p.rewardShoppingCents === 'number'
                ? p.rewardShoppingCents
                : 0
            const rewardPoints =
              typeof p.rewardPoints === 'number' ? p.rewardPoints : 0
            const gratification =
              typeof p.gratification === 'string' ? p.gratification : null
            const rewardType =
              p.rewardType === 'points' ? 'points' : 'real'
            return {
              id: p.id,
              code: p.code,
              name: p.name,
              icon: ICON_CYCLE[idx % ICON_CYCLE.length],
              iconEmoji: p.icon || '⭐',
              starsRequired: p.sortOrder,
              pointsRequired: p.minPoints,
              color: p.color || '#10b981',
              rewardWithdrawalCents,
              rewardShoppingCents,
              rewardPoints,
              gratification,
              // Legacy combined reward — derived from rewardWithdrawalCents
              // for backward-compat with code paths that still read `reward`.
              reward: rewardWithdrawalCents,
              rewardType,
              cashbackMultiplier: cashbackMultiplierFor(p.sortOrder),
              achieved: isAchieved,
              benefits: Array.isArray(p.benefits) && p.benefits.length > 0
                ? p.benefits
                : (p.description ? [p.description] : []),
              nextReward: nextPlan?.name || 'Benefícios Exclusivos VIP',
              nextRewardIcon: nextPlan?.icon || '👑',
              sortOrder: p.sortOrder,
            }
          })
          setLevels(mapped)
          // Keep the local "currentPoints" used by progress math in sync with
          // the DB-backed value so progress bars / "Faltam X pontos" math is
          // correct even when the user store is stale.
          if (apiTotalPoints !== currentPoints) {
            setCurrentPoints(apiTotalPoints)
          }
        }
        if (data.currentRank) setApiCurrentRank(data.currentRank)
      } catch (err) {
        console.error('Failed to load career data:', err)
        // keep loading fallback on error
      }
    }
    loadCareer()
    return () => { cancelled = true }
  }, [user?.id, currentPoints])

  // BACK-9 — load the list of career-claim gratifications the user has
  // already claimed, so we can disable the "Reivindicar Gratificação" button
  // on plans that were already credited.
  useEffect(() => {
    let cancelled = false
    async function loadClaims() {
      if (!user?.id) return
      try {
        const res = await fetch(
          `/api/career/claim?userId=${encodeURIComponent(user.id)}`,
          { cache: 'no-store' }
        )
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data) return
        const claimed: Record<string, string> = {}
        const list = Array.isArray(data?.claimed) ? data.claimed : []
        for (const c of list) {
          if (c?.planId) {
            claimed[c.planId] = c.claimedAt ?? new Date().toISOString()
          }
        }
        setClaimedPlanIds(claimed)
      } catch (err) {
        console.error('Failed to load career claims:', err)
      }
    }
    loadClaims()
    return () => { cancelled = true }
  }, [user?.id])

  // BACK-9 — claim a career plan's gratification. Calls POST /api/career/claim
  // and updates the local claimed state on success.
  const handleClaimGratification = async (planId: string, planName: string) => {
    if (!user?.id) return
    if (claimingPlanId) return // prevent double-clicks
    setClaimingPlanId(planId)
    try {
      const res = await fetch('/api/career/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, planId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = (data as any)?.error || 'Erro ao reivindicar gratificação'
        toast.error(msg)
        return
      }
      const credited = (data as any)?.credited
      const parts: string[] = []
      if (credited?.rewardWithdrawalCents > 0) {
        parts.push(`Saque: ${formatBRLFromCents(credited.rewardWithdrawalCents)}`)
      }
      if (credited?.rewardShoppingCents > 0) {
        parts.push(`Compras: ${formatBRLFromCents(credited.rewardShoppingCents)}`)
      }
      if (credited?.rewardPoints > 0) {
        parts.push(`${Number(credited.rewardPoints).toLocaleString('pt-BR')} pts`)
      }
      toast.success(
        `Gratificação de ${planName} reivindicada!${parts.length > 0 ? ` (+${parts.join(' · ')})` : ''}`
      )
      setClaimedPlanIds((prev) => ({
        ...prev,
        [planId]: new Date().toISOString(),
      }))
      // If the plan credited career points, the user's careerPoints may now
      // be enough to unlock the next plan — refresh the levels list so the
      // new "achieved" flag propagates.
      try {
        const data2 = await careerApi.getData(user.id)
        if (data2?.plans && Array.isArray(data2.plans)) {
          const apiTotalPoints = typeof data2.totalPoints === 'number' ? data2.totalPoints : currentPoints
          const mapped: CareerLevel[] = data2.plans.map((p: any, idx: number) => {
            const nextPlan = data2.plans[idx + 1] as any | undefined
            const isAchieved = typeof p.achieved === 'boolean'
              ? p.achieved
              : apiTotalPoints >= p.minPoints
            const rewardWithdrawalCents =
              typeof p.rewardWithdrawalCents === 'number'
                ? p.rewardWithdrawalCents
                : (p.bonusCents || 0)
            const rewardShoppingCents =
              typeof p.rewardShoppingCents === 'number' ? p.rewardShoppingCents : 0
            const rewardPoints =
              typeof p.rewardPoints === 'number' ? p.rewardPoints : 0
            const gratification =
              typeof p.gratification === 'string' ? p.gratification : null
            return {
              id: p.id,
              code: p.code,
              name: p.name,
              icon: ICON_CYCLE[idx % ICON_CYCLE.length],
              iconEmoji: p.icon || '⭐',
              starsRequired: p.sortOrder,
              pointsRequired: p.minPoints,
              color: p.color || '#10b981',
              rewardWithdrawalCents,
              rewardShoppingCents,
              rewardPoints,
              gratification,
              reward: rewardWithdrawalCents,
              rewardType: p.rewardType === 'points' ? 'points' : 'real',
              cashbackMultiplier: cashbackMultiplierFor(p.sortOrder),
              achieved: isAchieved,
              benefits: Array.isArray(p.benefits) && p.benefits.length > 0
                ? p.benefits
                : (p.description ? [p.description] : []),
              nextReward: nextPlan?.name || 'Benefícios Exclusivos VIP',
              nextRewardIcon: nextPlan?.icon || '👑',
              sortOrder: p.sortOrder,
            }
          })
          setLevels(mapped)
          if (typeof apiTotalPoints === 'number' && apiTotalPoints !== currentPoints) {
            setCurrentPoints(apiTotalPoints)
          }
        }
      } catch {
        // non-critical refresh — ignore
      }
    } catch (err) {
      console.error('Claim error:', err)
      toast.error('Erro de conexão ao reivindicar gratificação')
    } finally {
      setClaimingPlanId(null)
    }
  }

  // When the user hasn't achieved any plan yet (careerPoints below the lowest
  // plan's minPoints), the API returns "Associado" as the current rank. We
  // synthesize a virtual "Associado" level so the UI shows the correct rank
  // name and a sensible default benefit list rather than mis-displaying the
  // lowest plan as "achieved".
  const achievedLevel: CareerLevel = [...levels].reverse().find((l) => l.achieved) || {
    id: 'associado',
    code: 'associado',
    name: apiCurrentRank || 'Associado',
    icon: Award,
    iconEmoji: '⭐',
    starsRequired: 0,
    pointsRequired: 0,
    color: '#6b7280',
    // BACK-9 — Associado has no rewards.
    rewardWithdrawalCents: 0,
    rewardShoppingCents: 0,
    rewardPoints: 0,
    gratification: null,
    reward: 0,
    rewardType: 'real',
    cashbackMultiplier: '1.0x',
    achieved: true,
    benefits: ['Acesso básico ao aplicativo'],
    nextReward: levels[0]?.name || 'Próximo nível',
    nextRewardIcon: levels[0]?.iconEmoji || '⭐',
    sortOrder: 0,
  }
  const nextLevel = levels.find((l) => !l.achieved)
  const progressToNext = nextLevel
    ? Math.min((currentPoints / nextLevel.pointsRequired) * 100, 100)
    : 100

  const motivational = motivationalMessages.find(
    (m) => progressToNext >= m.minProgress && progressToNext < m.maxProgress
  ) || motivationalMessages[motivationalMessages.length - 1]

  const currentBenefits = achievedLevel.benefits

  // Rewards unlocked at current rank — derived from the plan's sortOrder
  // (which is the DB-driven position) instead of hardcoded id checks so the
  // logic still works when the admin renames plans.
  const achievedSort = achievedLevel.sortOrder
  const unlockedRewards = [
    { label: 'CashBack Entrada', unlocked: true, icon: '💰' },
    { label: 'CashBack Residual', unlocked: achievedSort >= 2, icon: '📈' },
    { label: 'CashBack Vendas', unlocked: achievedSort >= 3, icon: '🛒' },
    { label: 'Gratificações', unlocked: achievedSort >= 2, icon: '🎁' },
    { label: 'Portal Gamer', unlocked: achievedSort >= 4, icon: '🎮' },
    { label: 'Seguro Auto', unlocked: achievedSort >= 4, icon: '🚗' },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('career.title')}</h2>
        <p className="text-sm text-muted-foreground">Acompanhe seu progresso e conquistas na carreira</p>
      </div>

      {/* Client-spec §6 explanation banners */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 animate-gradient-shift" />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                  Plano de Carreira — Para Todos os Usuários
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                  O plano de carreira é para <span className="font-semibold">TODOS OS USUÁRIOS EM GERAL</span>.
                  Cada PIN é uma graduação com <span className="font-semibold">bônus mensal pago todos os meses</span>{' '}
                  ao manter a categoria conquistada. PAGOS TODOS OS MESES AO ATINGIR CADA PINO E A CATEGORIA QUE ELE SE ENCONTRA.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xs:grid-cols-3 gap-2 mt-3">
                  {levels.filter(l => l.code !== 'associado').slice(0, 6).map((lvl) => (
                    <div key={lvl.id} className="bg-white/60 dark:bg-emerald-950/40 rounded-lg p-2.5 text-center border border-emerald-100 dark:border-emerald-900/50 overflow-hidden">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{lvl.name}</p>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 break-words leading-tight">
                        {formatReward(lvl)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Driver-specific bonus banner (§6 — motorista/entregador) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card className="shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 animate-gradient-shift" />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">
                <Car className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                  Bônus Motorista / Entregador
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  Motorista ao escolher a categoria que deseja trabalhar ganhará uma{' '}
                  <span className="font-semibold">Bonificação extra todo mês que bater sua meta mensal</span>{' '}
                  (18 corridas/dia). A meta mensal é de <span className="font-semibold">384 corridas/mês</span>.
                  Ao bater a meta diária, o sistema envia uma notificação push avisando que aquele dia teve a meta batida.
                  A manutenção do bônus é paga só quando atinge a graduação dele, após a conquista.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Rank Card with Rank Badge and Progress Ring */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 animate-gradient-shift border-0 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 animate-shimmer" />
          <CardContent className="p-4 sm:p-6 relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-white flex items-center gap-3 sm:gap-4 flex-wrap">
                {/* Custom Rank Badge SVG with shimmer */}
                <div className="relative shrink-0">
                  <RankBadge level={achievedLevel} size={56} shimmer />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                    <ProgressRing progress={progressToNext} size={48} strokeWidth={5} />
                    <div className="min-w-0">
                      <p className="text-emerald-200 text-[10px] sm:text-xs font-medium">Patente Atual</p>
                      <h3 className="text-base sm:text-xl md:text-2xl font-bold shimmer-text break-words leading-tight">{achievedLevel.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 ${
                          i < currentStars ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] sm:text-xs text-emerald-200 ml-1">
                      {currentStars} {currentStars === 1 ? 'estrela' : 'estrelas'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-white">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center">
                    <p className="text-emerald-200 text-[10px] sm:text-xs">Carreira</p>
                    <p className="text-sm sm:text-lg sm:text-xl font-bold">{formatNumber(currentPoints)}</p>
                    <p className="text-[9px] sm:text-[10px] text-emerald-300">pontos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-200 text-[10px] sm:text-xs">Pessoais</p>
                    <p className="text-sm sm:text-lg sm:text-xl font-bold">{formatNumber(personalPoints)}</p>
                    <p className="text-[9px] sm:text-[10px] text-emerald-300">pontos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-200 text-[10px] sm:text-xs">Multiplicador</p>
                    <p className="text-sm sm:text-lg sm:text-xl font-bold">{achievedLevel.cashbackMultiplier}</p>
                    <p className="text-[10px] text-emerald-300">CashBack</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Level Up Progress Animation */}
      {nextLevel && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-sm border-emerald-100 dark:border-emerald-900/50 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-300 via-teal-400 to-emerald-500 animate-gradient-shift" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  >
                    <Zap className="h-4 w-4 text-emerald-600" />
                  </motion.div>
                  Progresso para {nextLevel.name}
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-600">
                  {formatNumber(currentPoints)}/{formatNumber(nextLevel.pointsRequired)} pontos
                </span>
              </div>
              <div className="relative">
                <Progress value={progressToNext} className="h-4" />
                <motion.div
                  className="absolute top-0 left-0 h-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  style={{ maxWidth: '100%' }}
                >
                  {/* Animated glow effect at the end of progress bar */}
                  <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-emerald-300 rounded-full animate-pulse-glow" />
                </motion.div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  Faltam <span className="font-semibold text-emerald-600">{formatNumber(nextLevel.pointsRequired - currentPoints)} pontos</span> para atingir {nextLevel.name}
                </p>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <Sparkles className="h-3 w-3" />
                  {Math.round(progressToNext)}%
                </div>
              </div>
              <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 flex items-start gap-2 border border-emerald-100 dark:border-emerald-900/50">
                <Zap className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{motivational.message}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1">
                    Cada estrela equivale a 2 pontos. Você precisa de {nextLevel.starsRequired} estrelas e {formatNumber(nextLevel.pointsRequired)} pontos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Motivational Quote between current rank and next rank */}
      {nextLevel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12 }}
          className="relative"
        >
          <Card className="shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800 overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-400" />
            <CardContent className="p-4 pl-5">
              <div className="flex items-center gap-3">
                <motion.span
                  className="text-2xl"
                  animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                >
                  💡
                </motion.span>
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    "{motivational.message}"
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                    Faltam apenas {formatNumber(nextLevel.pointsRequired - currentPoints)} pontos para desbloquear {nextLevel.nextReward}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Next Reward Preview Card */}
      {nextLevel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Card className="shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 animate-gradient-shift" />
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <motion.div
                      className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    >
                      <span className="text-2xl">{nextLevel.nextRewardIcon}</span>
                    </motion.div>
                    <div className="absolute -top-1 -right-1">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                      >
                        <Sparkles className="h-4 w-4 text-amber-400" />
                      </motion.div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-600 text-white text-[10px]">PRÓXIMA RECOMPENSA</Badge>
                    </div>
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-base mt-1">{nextLevel.nextReward}</h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                      Desbloqueie ao atingir o rank <span className="font-semibold">{nextLevel.name}</span>
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-muted-foreground">Recompensa</p>
                    <p className="text-sm font-bold text-emerald-600">{formatReward(nextLevel)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Próximo Rank Highlight with gradient border */}
      {nextLevel && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-sm relative overflow-hidden gradient-border">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              PRÓXIMO RANK
            </div>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <RankBadge level={nextLevel} size={56} />
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg">{nextLevel.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: nextLevel.starsRequired }).map((_, si) => (
                      <Star key={si} className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Min. Pontos</span>
                      <p className="font-semibold text-foreground">{formatNumber(nextLevel.pointsRequired)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CashBack</span>
                      <p className="font-semibold text-emerald-600">{nextLevel.cashbackMultiplier}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Recompensa</span>
                      <p className="font-semibold text-emerald-600">{formatReward(nextLevel)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Rewards Unlocked Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Card className="shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Gift className="h-4 w-4 text-emerald-600" />
              Recompensas Desbloqueadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {unlockedRewards.map((reward, i) => (
                <motion.div
                  key={reward.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    reward.unlocked
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-muted/50 border-border opacity-50'
                  }`}
                >
                  <span className="text-lg">{reward.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${reward.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{reward.label}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {reward.unlocked ? (
                        <>
                          <Unlock className="h-2.5 w-2.5 text-emerald-500" />
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400">Desbloqueado</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground">Bloqueado</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Benefícios Atuais */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              Benefícios Atuais — {achievedLevel.name}
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] ml-1 milestone-indicator relative">
                Ativo
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentBenefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/50"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-sm text-foreground">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* BACK-9 — Gratificações Desbloqueadas (career claim section).
          Lists every plan the user has reached (careerPoints >= plan.minPoints)
          and shows a "Reivindicar Gratificação" button that calls
          POST /api/career/claim. Plans already claimed show a success badge
          + the claim date instead of the button. */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Card className="shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Gift className="h-4 w-4 text-emerald-600" />
              Gratificações Desbloqueadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {levels.filter((l) =>
              l.code !== 'associado' &&
              currentPoints >= l.pointsRequired
            ).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                <Lock className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma gratificação desbloqueada ainda.
                </p>
                <p className="text-xs text-muted-foreground">
                  Acumule pontos de carreira para desbloquear e reivindicar gratificações.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {levels
                  .filter((l) =>
                    l.code !== 'associado' &&
                    currentPoints >= l.pointsRequired
                  )
                  .map((level, i) => {
                    const isClaimed = !!claimedPlanIds[level.id]
                    const isClaiming = claimingPlanId === level.id
                    return (
                      <motion.div
                        key={level.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border ${
                          isClaimed
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xl shrink-0" aria-hidden>{level.iconEmoji || '🎁'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-foreground">{level.name}</p>
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                                {formatNumber(level.pointsRequired)} pts
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Recompensa: <span className="font-semibold text-foreground">{formatReward(level)}</span>
                            </p>
                            {level.gratification && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 line-clamp-2">
                                {level.gratification}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isClaimed ? (
                            <Badge className="bg-emerald-600 text-white text-xs gap-1 px-3 py-1.5">
                              <CheckCircle2 className="h-3 w-3" />
                              Reivindicada
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                              onClick={() => handleClaimGratification(level.id, level.name)}
                              disabled={isClaiming}
                            >
                              {isClaiming ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Gift className="h-3.5 w-3.5" />
                              )}
                              Reivindicar Gratificação
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Career Path Timeline with Alternating Layout on Desktop */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Trilha de Carreira
        </h3>
        <div className="relative">
          {/* Center Timeline Line for desktop */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 via-emerald-200 to-gray-200 dark:via-emerald-800 dark:to-gray-700 hidden lg:block" />
          {/* Left Timeline Line for mobile */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 via-emerald-200 to-gray-200 dark:via-emerald-800 dark:to-gray-700 lg:hidden" />

          <div className="space-y-4">
            {levels.map((level, i) => {
              const Icon = level.icon
              const isEven = i % 2 === 0
              return (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, x: isEven ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className={`relative lg:flex ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} pl-16 lg:pl-0`}
                >
                  {/* Timeline Dot - desktop center */}
                  <div className={`absolute left-4 top-4 w-5 h-5 rounded-full border-2 lg:hidden items-center justify-center transition-all ${
                    level.achieved
                      ? 'bg-emerald-500 border-emerald-300 dark:border-emerald-600'
                      : 'bg-card border-gray-300 dark:border-gray-600'
                  }`}>
                    {level.achieved && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                        className="w-1.5 h-1.5 rounded-full bg-white"
                      />
                    )}
                  </div>

                  {/* Desktop alternating layout */}
                  <div className={`hidden lg:block lg:w-1/2 ${isEven ? 'lg:pr-12' : 'lg:pl-12'}`}>
                    <Card className={`shadow-sm relative overflow-hidden bg-card ${
                      level.achieved ? 'ring-2 ring-emerald-500/30 dark:ring-emerald-500/20' : ''
                    }`}>
                      {/* Gradient border on left/right based on position */}
                      {level.achieved && isEven && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                      )}
                      {level.achieved && !isEven && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                      )}
                      {level.achieved && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-amber-500" />
                          <Badge className="bg-emerald-600 text-white text-[10px]">Conquistado</Badge>
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 flex-wrap">
                          <div className="relative shrink-0">
                            <RankBadge level={level} size={44} />
                            {level.achieved && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.4 + i * 0.1, type: 'spring' }}
                                className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 shadow-md"
                              >
                                <Star className="h-3 w-3 text-white fill-white" />
                              </motion.div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-bold text-foreground text-sm lg:text-base break-words leading-tight">{level.name}</h4>
                              <div className="flex items-center gap-0.5 flex-wrap">
                                {Array.from({ length: level.starsRequired }).map((_, si) => (
                                  <Star key={si} className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Min. Pontos</span>
                                <p className="font-medium text-foreground">{formatNumber(level.pointsRequired)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Multiplicador</span>
                                <p className="font-medium text-emerald-600">{level.cashbackMultiplier}</p>
                              </div>
                            </div>
                            {level.benefits.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {level.benefits.slice(0, 3).map((b, bi) => (
                                  <Badge key={bi} variant="outline" className="text-[10px]">{b}</Badge>
                                ))}
                                {level.benefits.length > 3 && (
                                  <Badge variant="outline" className="text-[10px]">+{level.benefits.length - 3}</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Center dot for desktop */}
                  <div className={`hidden lg:flex absolute left-1/2 top-4 -translate-x-1/2 w-6 h-6 rounded-full border-2 items-center justify-center transition-all z-10 bg-card ${
                    level.achieved
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {level.achieved && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                        className='w-2 h-2 rounded-full bg-white'
                      />
                    )}
                  </div>

                  {/* Empty space for the other side on desktop */}
                  <div className={`hidden lg:block lg:w-1/2 ${isEven ? 'lg:pl-12' : 'lg:pr-12'}`}>
                    {/* This side is empty for alternating layout */}
                  </div>

                  {/* Mobile layout (card only) */}
                  <div className="lg:hidden">
                    <Card className={`shadow-sm relative overflow-hidden bg-card ${
                      level.achieved ? 'ring-2 ring-emerald-500/30 dark:ring-emerald-500/20' : ''
                    }`}>
                      {level.achieved && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                      )}
                      {level.achieved && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-amber-500" />
                          <Badge className="bg-emerald-600 text-white text-[10px]">Conquistado</Badge>
                        </div>
                      )}
                      <CardContent className="p-3 sm:p-4">
                        {/* 3-zone header: emoji | name+stars | reward */}
                        <div className="flex items-start gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                          <div className="relative shrink-0">
                            <div
                              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-white shadow-lg flex items-center justify-center"
                              style={{ background: `linear-gradient(135deg, ${level.color}, ${level.color}dd)` }}
                            >
                              {level.iconEmoji ? (
                                <span className="text-base sm:text-lg sm:text-xl leading-none" aria-hidden>{level.iconEmoji}</span>
                              ) : (
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                              )}
                            </div>
                            {level.achieved && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.4 + i * 0.1, type: 'spring' }}
                                className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 shadow-md"
                              >
                                <Star className="h-3 w-3 text-white fill-white" />
                              </motion.div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <h4 className="font-bold text-foreground text-xs sm:text-sm sm:text-base break-words leading-tight">{level.name}</h4>
                              <div className="flex items-center gap-0.5 flex-wrap">
                                {Array.from({ length: level.starsRequired }).map((_, si) => (
                                  <Star key={si} className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500 fill-yellow-500" />
                                ))}
                              </div>
                            </div>
                            <p className="text-[10px] sm:text-[11px] sm:text-xs text-muted-foreground leading-snug">
                              {level.achieved ? 'Graduação conquistada' : `A partir de ${formatNumber(level.pointsRequired)} pontos`}
                            </p>
                          </div>
                          {/* Tarefa 4 — bloco Recompensa EMPILHADO VERTICALMENTE:
                              Saque → Compras → Pontos abaixo do título "Recompensa",
                              e descrição (gratification) logo abaixo do bloco.
                              Removido o rótulo "/mês" indevido. */}
                          <div className="text-left shrink-0 w-full mt-1 sm:mt-0">
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Recompensa</p>
                            {(level.rewardWithdrawalCents ?? 0) > 0 && (
                              <p className="text-[11px] sm:text-xs text-foreground">
                                <span className="text-muted-foreground">Saque:</span>{' '}
                                <span className="font-semibold text-emerald-600">{formatBRLFromCents(level.rewardWithdrawalCents)}</span>
                              </p>
                            )}
                            {(level.rewardShoppingCents ?? 0) > 0 && (
                              <p className="text-[11px] sm:text-xs text-foreground">
                                <span className="text-muted-foreground">Compras:</span>{' '}
                                <span className="font-semibold text-emerald-600">{formatBRLFromCents(level.rewardShoppingCents)}</span>
                              </p>
                            )}
                            {(level.rewardPoints ?? 0) > 0 && (
                              <p className="text-[11px] sm:text-xs text-foreground">
                                <span className="text-muted-foreground">Pontos:</span>{' '}
                                <span className="font-semibold text-emerald-600">{Number(level.rewardPoints).toLocaleString('pt-BR')}</span>
                              </p>
                            )}
                            {/* Tarefa 3 — Descrição (gratification = texto do bônus) abaixo das recompensas */}
                            {level.gratification && (
                              <p className="text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-snug line-clamp-2">
                                {level.gratification}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stats grid with separator */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-border/50 text-xs">
                          <div>
                            <span className="text-muted-foreground text-[10px]">Min. Estrelas</span>
                            <p className="font-medium text-foreground">{level.starsRequired}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px]">Min. Pontos</span>
                            <p className="font-medium text-foreground">{formatNumber(level.pointsRequired)}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground text-[10px]">Multiplicador</span>
                            <p className="font-medium text-emerald-600">{level.cashbackMultiplier}</p>
                          </div>
                        </div>

                        {level.benefits.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {level.benefits.slice(0, 3).map((b, bi) => (
                              <Badge key={bi} variant="outline" className="text-[10px]">{b}</Badge>
                            ))}
                            {level.benefits.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">+{level.benefits.length - 3}</Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* How to earn points */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" />
            Como Ganhar Pontos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { action: 'Indicação direta ativa', points: '+2 pontos', icon: '👥', color: 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50' },
              { action: 'Uso do App Mobilidade', points: '+1 ponto', icon: '🚗', color: 'bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50' },
              { action: 'Compra no Shopping', points: '+1 ponto', icon: '🛍️', color: 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50' },
              { action: 'Avaliação positiva recebida', points: '+1 ponto', icon: '⭐', color: 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900/50' },
              { action: 'Pagamento em dia', points: '+2 pontos', icon: '💳', color: 'bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50' },
              { action: 'Ativação de residual na rede', points: '+3 pontos', icon: '🔄', color: 'bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className={`flex items-center gap-3 p-3 ${item.color} rounded-lg`}
              >
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.action}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{item.points}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Career Tips Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 animate-gradient-shift" />
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">Dicas para Evoluir</h4>
                <div className="mt-2 space-y-2">
                  {[
                    { tip: 'Foque em indicações ativas — cada membro ativo gera mais pontos que inativos.', icon: '👥' },
                    { tip: 'Mantenha seus pagamentos em dia para ganhar pontos bônus toda semana.', icon: '💳' },
                    { tip: 'Use o app de mobilidade regularmente para acumular pontos de engajamento.', icon: '🚗' },
                    { tip: 'Ajude seus indicados a se ativarem — a rede residual vale 3 pontos cada.', icon: '🔄' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-sm shrink-0">{item.icon}</span>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">{item.tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
