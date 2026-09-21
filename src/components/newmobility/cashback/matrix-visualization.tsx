'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { Users, Layers, TrendingUp, Sparkles, Lock, ArrowUpRight } from 'lucide-react'

// Animated counter component for total members highlight.
// Replaces the previous `AnimatedEarningsCounter` which displayed a
// monetary (R$) total — privacy requirement: no personal earnings on
// user-facing pages.
function AnimatedMemberCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    const duration = 1500
    const steps = 60
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
    <span className="font-bold tabular-nums text-2xl md:text-3xl text-white">
      {display.toLocaleString('pt-BR')}
      <span className="text-sm font-medium text-emerald-100 ml-1.5">membros</span>
    </span>
  )
}

// Tooltip component for level cards
function LevelTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] rounded-lg whitespace-nowrap z-50 shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      )}
    </div>
  )
}

interface MatrixLevelData {
  level: number
  positions: number
  percentage: string
  totalUsers: number
  filled: number
  // Plan-gated lock flag (entrada only). When true, the user's plan
  // does not include this level (e.g. Blue 3 user sees levels 4-5 as
  // locked). Levels above the plan ceiling still show their network
  // member counts but display a lock badge + upgrade CTA.
  locked?: boolean
}

interface MatrixVisualizationProps {
  type: 'entrada' | 'residual' | 'vendas'
  // Optional callback invoked when the user clicks the "Faça upgrade
  // para Premium 5" CTA on a locked entrada level. The My Plan page
  // wires this to open its Premium 5 upgrade dialog. If no callback is
  // provided, the CTA navigates to /my-plan (default behavior).
  onUpgradeClick?: () => void
}

// Fallback config used as the initial loading state (before the API responds)
// and as a safety net if the fetch fails. Percentages mirror the DEFAULT_*
// constants in api-utils.ts so admin-unconfigured installs still see
// sensible structural numbers.
// NOTE: `earnings` and `maxEarnings` were removed (privacy: no R$ on
// user-facing pages). Per-level "members" counts come from `filled`.
// IMPORTANT: `filled` is REAL network member count — it must be 0 until
// the API responds with actual data. The previous hardcoded non-zero
// values were fictitious and showed fake members during loading / on
// API error. Only `positions`, `percentage`, `totalUsers`, and `level`
// are structural config (matrix shape) and remain populated.
const FALLBACK_MATRIX_CONFIG: Record<string, {
  levels: MatrixLevelData[]
  title: string
  description: string
}> = {
  entrada: {
    levels: [
      { level: 1, positions: 4, percentage: '5%', totalUsers: 4, filled: 0 },
      { level: 2, positions: 16, percentage: '10%', totalUsers: 16, filled: 0 },
      { level: 3, positions: 64, percentage: '10%', totalUsers: 64, filled: 0 },
      { level: 4, positions: 256, percentage: '5%', totalUsers: 256, filled: 0 },
      { level: 5, positions: 1024, percentage: '5%', totalUsers: 1024, filled: 0 },
    ],
    title: 'Matriz CashBack Entrada',
    description: 'Estrutura 4x5 com 5 níveis de profundidade',
  },
  residual: {
    levels: [
      { level: 1, positions: 4, percentage: '10%', totalUsers: 4, filled: 0 },
      { level: 2, positions: 16, percentage: '9%', totalUsers: 16, filled: 0 },
      { level: 3, positions: 64, percentage: '5%', totalUsers: 64, filled: 0 },
      { level: 4, positions: 256, percentage: '5%', totalUsers: 256, filled: 0 },
      { level: 5, positions: 1024, percentage: '4%', totalUsers: 1024, filled: 0 },
      { level: 6, positions: 4096, percentage: '3%', totalUsers: 4096, filled: 0 },
      { level: 7, positions: 16384, percentage: '2%', totalUsers: 16384, filled: 0 },
    ],
    title: 'Matriz CashBack Residual',
    description: 'Estrutura 4x7 com 7 níveis de profundidade',
  },
  vendas: {
    levels: [
      { level: 1, positions: 4, percentage: '0.10%', totalUsers: 4, filled: 0 },
      { level: 2, positions: 16, percentage: '0.10%', totalUsers: 16, filled: 0 },
      { level: 3, positions: 64, percentage: '0.10%', totalUsers: 64, filled: 0 },
      { level: 4, positions: 256, percentage: '0.10%', totalUsers: 256, filled: 0 },
      { level: 5, positions: 1024, percentage: '0.10%', totalUsers: 1024, filled: 0 },
      { level: 6, positions: 4096, percentage: '0.10%', totalUsers: 4096, filled: 0 },
      { level: 7, positions: 16384, percentage: '0.10%', totalUsers: 16384, filled: 0 },
      { level: 8, positions: 65536, percentage: '0.10%', totalUsers: 65536, filled: 0 },
      { level: 9, positions: 262144, percentage: '0.10%', totalUsers: 262144, filled: 0 },
    ],
    title: 'Matriz CashBack Vendas',
    description: 'Estrutura 4x9 com 9 níveis de profundidade',
  },
}

// Titles/descriptions are static (they describe the matrix structure, not config)
const MATRIX_META: Record<string, { title: string; description: string }> = {
  entrada: { title: 'Matriz CashBack Entrada', description: 'Estrutura 4x5 com 5 níveis de profundidade' },
  residual: { title: 'Matriz CashBack Residual', description: 'Estrutura 4x7 com 7 níveis de profundidade' },
  vendas: { title: 'Matriz CashBack Vendas', description: 'Estrutura 4x9 com 9 níveis de profundidade' },
}

// Format a numeric percentage like 5 -> "5%", 5.5 -> "5.5%", 0.1 -> "0.10%", 0.2 -> "0.20%"
function formatPercentage(value: number): string {
  if (value < 1) {
    // Pad to 2 decimal places for sub-1% values (matches original "0.10%" / "0.20%" style)
    return `${value.toFixed(2)}%`
  }
  // Whole or decimal percentages: trim trailing zeros (10 -> "10%", 5.5 -> "5.5%")
  const trimmed = `${value}`.replace(/\.0+$/, '')
  return `${trimmed}%`
}

const levelColors = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
]

const levelGradientColors = [
  'from-emerald-400 to-emerald-600',
  'from-teal-400 to-teal-600',
  'from-cyan-400 to-cyan-600',
  'from-amber-400 to-amber-600',
  'from-orange-400 to-orange-600',
  'from-rose-400 to-rose-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-indigo-400 to-indigo-600',
]

export function MatrixVisualization({ type, onUpgradeClick }: MatrixVisualizationProps) {
  const { user } = useStore()
  const [config, setConfig] = useState(FALLBACK_MATRIX_CONFIG[type])

  // ---------- Task 14-F: matrix blocking state ----------
  // True when the user has reached the earning ceiling for this matrix
  // (entrada R$96.500 / residual R$750.000 / vendas 1.000 vendas).
  // When blocked, the UI shows an overlay banner at the top.
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockPct, setBlockPct] = useState(0)
  const [blockThresholdLabel, setBlockThresholdLabel] = useState<string>('')

  // Whether the user's plan gates this matrix. Only `entrada` is gated
  // by Blue 3 / Premium 5 per client spec §1.1 + §3 — residual (4x7)
  // and vendas (4x9) matrices are unlocked at Blue 3 already.
  const isPlanGated = type === 'entrada'
  const userPlan = user?.plan || 'free'
  const isPremium5 = userPlan === 'premium5' || userPlan === 'blue5'
  const isBlue3 = userPlan === 'blue3'

  // Compute locked-level ceiling for entrada based on plan.
  // free → 0 (no entrada access); blue3 → 3; premium5/blue5 → 5 (no locks).
  const maxUnlockedLevel = isPlanGated
    ? (isPremium5 ? 5 : isBlue3 ? 3 : 0)
    : Infinity

  // Fetch live cashback levels (admin-configured percentages) from the
  // cashback API, AND fetch the real per-level network member counts
  // from /api/dashboard (whose `byLevel` is computed from the actual
  // referral tree by `countNetworkDescendants`). The cashback API's
  // per-level `currentUsers` is derived from CashbackEntry
  // transactions (0 for users who haven't received payouts yet) —
  // not useful for a per-level "members" display, so we override it
  // with the dashboard's `byLevel` data.
  // Falls back to FALLBACK_MATRIX_CONFIG on any error.
  //
  // Task 14-F: also fetches /api/network/matrix-progress to know
  // whether the matrix is blocked (earning ceiling reached).
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    Promise.all([
      fetch(`/api/cashback/${type}?userId=${user.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/dashboard?userId=${user.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      // Task 14-F: matrix blocking progress
      fetch(`/api/network/matrix-progress?userId=${user.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([cashbackData, dashboardData, matrixProgressData]) => {
      if (cancelled || !cashbackData || !Array.isArray(cashbackData.levels)) return

      // Task 14-F: extract blocking info for THIS matrix type.
      const blockEntry = Array.isArray(matrixProgressData?.progress)
        ? matrixProgressData.progress.find(
            (p: { type: string; isBlocked: boolean; pct: number; thresholdLabel: string }) =>
              p.type === type,
          )
        : null
      setIsBlocked(!!blockEntry?.isBlocked)
      setBlockPct(typeof blockEntry?.pct === 'number' ? blockEntry.pct : 0)
      setBlockThresholdLabel(
        typeof blockEntry?.thresholdLabel === 'string' ? blockEntry.thresholdLabel : '',
      )

      // The dashboard's per-matrix byLevel map has the REAL network
      // descendant count at each level (1-indexed).
      const byLevelKey =
        type === 'entrada' ? 'cashbackEntrada' :
        type === 'residual' ? 'cashbackResidual' :
        'cashbackVendas'
      const byLevel: Record<string, number> = dashboardData?.[byLevelKey]?.byLevel ?? {}

      const meta = MATRIX_META[type] ?? { title: type, description: '' }
      // Tarefa (19/09): ler width do MatrixType retornado pela API de cashback
      // (admin-configurável). Antes era hardcoded Math.pow(4, levelNum).
      // Se a API não retornar matrixWidth, usa 4 como fallback (padrão do cliente).
      const matrixWidth: number = (cashbackData as any)?.matrixWidth ?? 4
      const levels: MatrixLevelData[] = cashbackData.levels.map((lvl: any, i: number) => {
        const levelNum = lvl.level ?? i + 1
        const positions = Math.pow(matrixWidth, levelNum) // structural matrix dim (admin-configurable width)
        // Prefer the dashboard's byLevel count (real network size at
        // this level); fall back to the cashback API's currentUsers
        // (count of CashbackEntry transactions at this level) if the
        // dashboard data isn't available.
        const filled =
          typeof byLevel[String(levelNum)] === 'number'
            ? byLevel[String(levelNum)]
            : (typeof lvl.currentUsers === 'number' ? lvl.currentUsers : 0)
        const percentageStr = formatPercentage(
          typeof lvl.percentage === 'number' ? lvl.percentage : 0
        )
        // Plan-gated lock flag from the backend (entrada only). Falls
        // back to a client-side check on maxUnlockedLevel so the UI
        // still locks correctly even if the API response doesn't
        // include the `locked` field.
        const locked = isPlanGated
          ? (typeof lvl.locked === 'boolean' ? lvl.locked : levelNum > maxUnlockedLevel)
          : false
        return {
          level: levelNum,
          positions,
          percentage: percentageStr,
          totalUsers: positions,
          filled,
          locked,
        }
      })

      setConfig({
        levels,
        title: meta.title,
        description: meta.description,
      })
    })

    return () => {
      cancelled = true
    }
  }, [type, user?.id])

  const totalUsers = config.levels.reduce((sum, l) => sum + l.filled, 0)
  const totalCapacity = config.levels.reduce((sum, l) => sum + l.positions, 0)
  const maxMembers = Math.max(...config.levels.map(l => l.filled), 0)

  return (
    <div className="space-y-5">
      {/* Task 14-F: matrix blocking overlay banner.
          Shown when the user has reached the earning ceiling for this
          matrix type (entrada R$96.500 / residual R$750.000 / vendas 1.000 vendas).
          Renders ABOVE everything else so the user immediately sees the
          matrix is blocked. */}
      {isBlocked && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-rose-300 dark:border-rose-800 bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/20 shadow-sm">
            <CardContent className="p-3 sm:p-4 flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-500 text-white shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                  Matriz Bloqueada — Limite atingido
                </p>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                  Você atingiu o teto de ganhos desta matriz
                  {blockThresholdLabel ? ` (${blockThresholdLabel})` : ''}.
                  Continue promovendo sua rede nas outras matrizes para continuar
                  acumulando cashback.
                </p>
                {/* Progress to threshold (will be 100% when blocked) */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-rose-200 dark:bg-rose-900/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-500"
                    style={{ width: `${Math.min(blockPct, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Total Members Highlight Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }} />
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />
          <CardContent className="p-3 sm:p-4 md:p-5 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-emerald-200" />
                <p className="text-xs sm:text-sm text-emerald-100 font-medium">Total de Membros - {config.title}</p>
              </div>
              <AnimatedMemberCounter value={totalUsers} />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 text-center border border-white/10 flex-1 sm:flex-initial">
                <p className="text-[10px] text-emerald-200 uppercase tracking-wide">Capacidade</p>
                <p className="text-sm sm:text-lg font-bold text-white">{totalCapacity.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 text-center border border-white/10 flex-1 sm:flex-initial">
                <p className="text-[10px] text-emerald-200 uppercase tracking-wide">Níveis</p>
                <p className="text-xs sm:text-sm font-bold text-white">{config.levels.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="bg-card shadow-sm">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Total Membros</p>
                <p className="text-sm font-bold text-foreground">{totalUsers.toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-card shadow-sm">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Capacidade</p>
                <p className="text-sm font-bold text-foreground">{totalCapacity.toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card shadow-sm">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Máx. no Nível</p>
                <p className="text-sm font-bold text-foreground">{maxMembers.toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-card shadow-sm">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Níveis</p>
                <p className="text-sm font-bold text-foreground">{config.levels.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Horizontal stacked bar with background pattern — now shows member distribution by level */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="bg-card shadow-sm overflow-hidden relative">
          {/* Subtle grid background pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }} />
          <CardContent className="p-3 sm:p-4 relative">
            <p className="text-xs font-medium text-muted-foreground mb-2">Proporção de Membros por Nível</p>
            <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
              {config.levels.map((lvl, i) => {
                const widthPct = totalUsers > 0 ? (lvl.filled / totalUsers) * 100 : 0
                return (
                  <motion.div
                    key={lvl.level}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(widthPct, 0.5)}%` }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                    className={cn('rounded-sm bg-gradient-to-r', levelGradientColors[i % levelGradientColors.length])}
                    title={`Nível ${lvl.level}: ${lvl.filled} membros`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {config.levels.map((lvl, i) => (
                <span key={lvl.level} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={cn('w-2 h-2 rounded-sm shrink-0', levelColors[i % levelColors.length])} />
                  N{lvl.level}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="bg-card shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Nível</TableHead>
                  <TableHead className="text-right">Membros</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">%</TableHead>
                  <TableHead className="text-right">Capacidade</TableHead>
                  <TableHead className="w-32 hidden md:table-cell">Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.levels.map((lvl, i) => {
                  const fillPct = Math.round((lvl.filled / lvl.positions) * 100)
                  return (
                    <TableRow
                      key={lvl.level}
                      className={cn(lvl.locked && 'opacity-60 bg-muted/30')}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-white text-xs font-bold',
                              lvl.locked ? 'bg-gray-400 dark:bg-gray-600' : levelColors[i % levelColors.length]
                            )}
                          >
                            N{lvl.level}
                          </Badge>
                          {lvl.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-bold',
                          lvl.locked
                            ? 'text-muted-foreground'
                            : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {lvl.filled.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                        {lvl.percentage}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {lvl.positions.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${fillPct}%` }}
                              transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                              className={cn(
                                'h-full rounded-full bg-gradient-to-r',
                                lvl.locked ? 'from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700' : levelGradientColors[i % levelGradientColors.length]
                              )}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{fillPct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Card Grid with hover tooltips and card elevation */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {config.levels.map((lvl, i) => {
            const fillPct = Math.round((lvl.filled / lvl.positions) * 100)
            return (
              <motion.div
                key={lvl.level}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 200 }}
              >
                <LevelTooltip
                  content={
                    lvl.locked
                      ? `Nível ${lvl.level}: BLOQUEADO — faça upgrade para Premium 5 para desbloquear`
                      : `Nível ${lvl.level}: ${lvl.filled}/${lvl.positions} membros · ${lvl.percentage}`
                  }
                >
                  <Card
                    className={cn(
                      'shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer relative',
                      lvl.locked
                        ? 'bg-muted/50 dark:bg-muted/20 border-dashed border-muted-foreground/40'
                        : 'bg-card'
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-white text-xs',
                            lvl.locked ? 'bg-gray-400 dark:bg-gray-600' : levelColors[i % levelColors.length]
                          )}
                        >
                          Nível {lvl.level}
                        </Badge>
                        {lvl.locked ? (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">{lvl.percentage}</span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Membros</p>
                          <p
                            className={cn(
                              'text-sm font-bold',
                              lvl.locked ? 'text-muted-foreground' : 'text-foreground'
                            )}
                          >
                            {lvl.filled.toLocaleString('pt-BR')}
                            <span className="text-muted-foreground font-normal">/{lvl.positions.toLocaleString('pt-BR')}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Ocupação</p>
                          <p
                            className={cn(
                              'text-sm font-bold',
                              lvl.locked
                                ? 'text-muted-foreground'
                                : 'text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {fillPct}%
                          </p>
                        </div>
                        {/* Gradient progress bar (gray for locked levels) */}
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${fillPct}%` }}
                            transition={{ delay: 0.5 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                            className={cn(
                              'h-full rounded-full bg-gradient-to-r',
                              lvl.locked
                                ? 'from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
                                : levelGradientColors[i % levelGradientColors.length]
                            )}
                          />
                        </div>
                        {lvl.locked && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-1.5 h-7 text-[10px] gap-1 border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onUpgradeClick) {
                                onUpgradeClick()
                              } else if (typeof window !== 'undefined') {
                                window.location.href = '/my-plan'
                              }
                            }}
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            Faça upgrade para Premium 5
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </LevelTooltip>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
