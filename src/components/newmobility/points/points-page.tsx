'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import { pointsApi } from '@/lib/api'
import { Star, TrendingUp, Users, ShoppingCart, Award, Trophy, Zap, Flame, Target, Car, LifeBuoy, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { AchievementsSection } from './achievements-section'

// Shape of a normalized history entry the UI consumes. The /api/points
// endpoint returns PointTransaction rows with `createdAt` instead of `date`,
// so the loader normalizes them into this shape before storing in state.
interface PointHistoryEntry {
  id: string
  type: string
  amount: number
  description: string
  date: string
}

// Initial empty state — the page shows a loading skeleton until the API
// resolves, then either the real history (if any) or an explicit empty
// state. We NEVER seed the UI with hardcoded fake data (previous versions
// used a 10-entry mock array as the initial state which leaked on first
// paint and confused users with phantom purchases they never made).

const typeLabels: Record<string, string> = {
  direct_referral: 'Indicação',
  service_use: 'Serviço',
  purchase: 'Compra',
  evaluation_received: 'Avaliação',
  evaluation_upline: 'Avaliação Upline',
  payment: 'Pagamento',
  // Types actually used by PointTransaction in the DB:
  reward: 'Recompensa',
  game_loss: 'Jogo',
  game_win: 'Jogo',
  referral: 'Indicação',
  bonus: 'Bônus',
  manual: 'Manual',
  login: 'Login',
}

const typeColors: Record<string, string> = {
  direct_referral: 'bg-emerald-100 text-emerald-700',
  service_use: 'bg-blue-100 text-blue-700',
  purchase: 'bg-purple-100 text-purple-700',
  evaluation_received: 'bg-amber-100 text-amber-700',
  evaluation_upline: 'bg-teal-100 text-teal-700',
  payment: 'bg-rose-100 text-rose-700',
  reward: 'bg-emerald-100 text-emerald-700',
  game_loss: 'bg-rose-100 text-rose-700',
  game_win: 'bg-emerald-100 text-emerald-700',
  referral: 'bg-emerald-100 text-emerald-700',
  bonus: 'bg-amber-100 text-amber-700',
  manual: 'bg-gray-100 text-gray-700',
  login: 'bg-teal-100 text-teal-700',
}

// Map icon string from the API to a lucide-react component.
const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Zap,
  Flame,
  Target,
  Trophy,
  ShoppingCart,
  Car,
  Award,
  LifeBuoy,
  Star,
  TrendingUp,
}

interface HowToEarnItem {
  key: string
  label: string
  icon: string
  points: number
}

// Fallback used while the API is loading or if it fails. Matches the admin's
// default configuration (DEFAULT_POINTS_CONFIG).
const FALLBACK_HOW_TO_EARN: HowToEarnItem[] = [
  { key: 'referralPoints', label: 'Indicar um amigo', icon: 'Users', points: 10 },
  { key: 'planUpgradePoints', label: 'Upgrade de plano', icon: 'Zap', points: 25 },
  { key: 'dailyLoginPoints', label: 'Login diário', icon: 'Flame', points: 1 },
  { key: 'betPlacedPoints', label: 'Apostar', icon: 'Target', points: 1 },
  { key: 'betWonPoints', label: 'Aposta vencedora', icon: 'Trophy', points: 5 },
  { key: 'marketplacePurchasePoints', label: 'Compra no marketplace', icon: 'ShoppingCart', points: 2 },
  { key: 'rideCompletedPoints', label: 'Corrida concluída', icon: 'Car', points: 1 },
  { key: 'challengeCompletedPoints', label: 'Desafio concluído', icon: 'Award', points: 10 },
  { key: 'ticketResolvedPoints', label: 'Ticket resolvido', icon: 'LifeBuoy', points: 1 },
]

function formatPoints(points: number): string {
  if (points === 1) return '+1 ponto'
  return `+${points} pontos`
}

export function PointsPage() {
  const { user } = useStore()
  const totalPoints = user?.careerPoints ?? 0
  const personalPoints = user?.personalPoints ?? 0
  const networkPoints = Math.max(totalPoints - personalPoints, 0)

  // Real PointTransaction history from /api/points. Initial state is empty
  // — we show a loading skeleton while the request is in flight, then either
  // the real history (if any) or an explicit "no transactions" empty state.
  // No hardcoded mock fallback is ever displayed to the user.
  const [history, setHistory] = useState<PointHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [totalEarned, setTotalEarned] = useState<number>(0)

  const [howToEarn, setHowToEarn] = useState<HowToEarnItem[]>(FALLBACK_HOW_TO_EARN)
  const [loadingConfig, setLoadingConfig] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadHistory() {
      if (!user?.id) {
        setLoadingHistory(false)
        return
      }
      try {
        const data = await pointsApi.getData(user.id)
        if (cancelled || !data) return
        const realHistory: PointHistoryEntry[] = Array.isArray(data.history) ? data.history : []
        if (realHistory.length > 0) {
          // Normalize each row to the shape the UI expects (date string + the
          // fields the JSX reads). The mock fallback uses `date`, real rows
          // use `createdAt` — we adapt here so the rest of the JSX is
          // unchanged.
          const normalized = realHistory.map((h) => ({
            id: h.id,
            type: h.type,
            amount: Number(h.amount) || 0,
            description: h.description || '—',
            date: h.createdAt,
          }))
          setHistory(normalized)
          setTotalEarned(normalized.reduce((acc, p) => acc + (Number(p.amount) || 0), 0))
        } else {
          // No transactions in DB — show empty list, not mock data.
          setHistory([])
          setTotalEarned(0)
        }
      } catch (err) {
        console.error('Failed to load points history:', err)
        // On error: show empty state, NOT mock data. The user can refresh
        // the page to retry the fetch.
        if (!cancelled) {
          setHistory([])
          setTotalEarned(0)
        }
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }
    loadHistory()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    async function loadConfig() {
      if (!user?.id) {
        setLoadingConfig(false)
        return
      }
      try {
        const res = await fetch(
          `/api/points/config?userId=${encodeURIComponent(user.id)}`,
          { cache: 'no-store' }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data?.howToEarn) && data.howToEarn.length > 0) {
          setHowToEarn(data.howToEarn)
        }
      } catch (err) {
        console.error('Failed to load points config:', err)
        // keep fallback list on error
      } finally {
        if (!cancelled) setLoadingConfig(false)
      }
    }
    loadConfig()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pontuações</h2>
        <p className="text-sm text-gray-500">Acompanhe seus pontos e saiba como ganhar mais</p>
      </div>

      {/* Total Points */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 shadow-lg">
          <CardContent className="p-6 text-white text-center">
            <Star className="h-8 w-8 mx-auto mb-2 text-yellow-300" />
            <p className="text-emerald-200 text-sm">Total de Pontos</p>
            <p className="text-4xl font-bold">{totalPoints}</p>
            <div className="flex justify-center gap-6 mt-4">
              <div>
                <p className="text-emerald-200 text-xs">Pessoais</p>
                <p className="text-xl font-bold">{personalPoints}</p>
              </div>
              <div>
                <p className="text-emerald-200 text-xs">Rede</p>
                <p className="text-xl font-bold">{networkPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Points Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">PONTOS PESSOAIS</p>
              <p className="text-xl font-bold text-gray-900">{personalPoints}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">PONTOS DA REDE</p>
              <p className="text-xl font-bold text-gray-900">{networkPoints}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-100 text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">TOTAL GANHO</p>
              <p className="text-xl font-bold text-gray-900">{totalEarned}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Points History */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600" />
            Histórico de Pontos
            {loadingHistory && (
              <Loader2 className="h-3 w-3 ml-1 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-80 overflow-y-auto custom-scrollbar">
            {loadingHistory ? (
              // Loading skeleton — 5 placeholder rows match the height of a
              // real history entry so the layout doesn't shift on resolve.
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-40 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-8 rounded" />
                </div>
              ))
            ) : history.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma transação de pontos registrada ainda.
              </div>
            ) : (
              history.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={`text-[10px] ${typeColors[entry.type] || 'bg-gray-100 text-gray-700'}`}>
                      {typeLabels[entry.type] || entry.type}
                    </Badge>
                    <div>
                      <p className="text-sm text-gray-900">{entry.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(entry.date)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">+{entry.amount}</span>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* How to earn - values synced with admin /api/admin/points-config via /api/points/config */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
            Como Ganhar Pontos
            {loadingConfig && (
              <Loader2 className="h-3 w-3 ml-1 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {howToEarn.map((item, i) => {
              const Icon = ICON_MAP[item.icon] ?? Star
              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-emerald-600 font-semibold">
                      {formatPoints(item.points)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Achievements / Badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-bold text-foreground">Conquistas</h3>
        </div>
        <AchievementsSection />
      </motion.div>
    </div>
  )
}
