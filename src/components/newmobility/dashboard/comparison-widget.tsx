'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'
// formatCurrency removed for privacy — no monetary values on dashboard
import { TrendingUp, TrendingDown, Minus, Users, Star, ArrowUpRight, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'

interface ComparisonStat {
  current: number
  previous: number
}

interface ComparisonStats {
  cashbackEarnings?: ComparisonStat
  newReferrals?: ComparisonStat
  pointsEarned?: ComparisonStat
  withdrawals?: ComparisonStat
}

interface ComparisonWidgetProps {
  /** Per-user comparison stats from the dashboard API
   * (`comparisonStats` field). When provided, real per-user counts are
   * rendered. When absent, all values fall back to 0 (privacy-safe). */
  stats?: ComparisonStats | null
}

interface ComparisonData {
  labelKey: string
  currentValue: number
  previousValue: number
  format: 'number'
  icon: React.ElementType
  iconBg: string
  sparklineData: number[]
}

// Build a sparkline from the current + previous values plus a tiny synthetic
// downward trend so the chart still renders. The exact shape doesn't matter —
// what matters is that the underlying numbers are real per-user data.
function buildSparkline(current: number, previous: number): number[] {
  // 8-point sparkline ending at `current`, starting near `previous`.
  // If both are 0, return a flat line of zeros so the SVG still renders.
  if (!current && !previous) return [0, 0, 0, 0, 0, 0, 0, 0]
  const start = previous || Math.max(current - 4, 0)
  const span = current - start
  return Array.from({ length: 8 }, (_, i) => {
    const t = i / 7
    // ease-out curve toward current
    return Math.round(start + span * (1 - Math.pow(1 - t, 2)))
  })
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 80
  const height = 28

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ComparisonWidget({ stats }: ComparisonWidgetProps) {
  const { t } = useTranslation()

  // Real per-user stats from the dashboard API. Fall back to {current:0, previous:0}
  // when the API hasn't returned yet or the field is missing — NEVER render
  // hardcoded mock numbers (the old implementation showed 28/6/42/12 globally).
  const cashback = stats?.cashbackEarnings ?? { current: 0, previous: 0 }
  const referrals = stats?.newReferrals ?? { current: 0, previous: 0 }
  const points = stats?.pointsEarned ?? { current: 0, previous: 0 }
  const withdrawals = stats?.withdrawals ?? { current: 0, previous: 0 }

  const data: ComparisonData[] = [
    {
      labelKey: 'comparison.cashbackEarnings',
      currentValue: cashback.current,
      previousValue: cashback.previous,
      format: 'number',
      icon: DollarSign,
      iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
      sparklineData: buildSparkline(cashback.current, cashback.previous),
    },
    {
      labelKey: 'comparison.newReferrals',
      currentValue: referrals.current,
      previousValue: referrals.previous,
      format: 'number',
      icon: Users,
      iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
      sparklineData: buildSparkline(referrals.current, referrals.previous),
    },
    {
      labelKey: 'comparison.pointsEarned',
      currentValue: points.current,
      previousValue: points.previous,
      format: 'number',
      icon: Star,
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
      sparklineData: buildSparkline(points.current, points.previous),
    },
    {
      labelKey: 'comparison.withdrawals',
      currentValue: withdrawals.current,
      previousValue: withdrawals.previous,
      format: 'number',
      icon: ArrowUpRight,
      iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
      sparklineData: buildSparkline(withdrawals.current, withdrawals.previous),
    },
  ]

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'percent': return `${value}%`
      default: return value.toString()
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {data.map((item, i) => {
        const change = item.previousValue > 0
          ? ((item.currentValue - item.previousValue) / item.previousValue) * 100
          : (item.currentValue > 0 ? 100 : 0)
        const isPositive = change > 0
        const isNeutral = change === 0
        const sparkColor = isPositive ? '#059669' : isNeutral ? '#6b7280' : '#dc2626'

        const Icon = item.icon

        return (
          <motion.div
            key={item.labelKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="rounded-2xl shadow-sm bg-card hover:shadow-md transition-shadow border border-emerald-100/50 dark:border-emerald-900/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-2 rounded-full shrink-0 ${item.iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium truncate">{t(item.labelKey)}</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold text-foreground">{formatValue(item.currentValue, item.format)}</p>
                    <div className={`flex items-center gap-1 text-xs font-semibold ${
                      isPositive ? 'text-emerald-600 dark:text-emerald-400' :
                      isNeutral ? 'text-gray-500' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {isPositive ? <TrendingUp className="h-3 w-3" /> :
                       isNeutral ? <Minus className="h-3 w-3" /> :
                       <TrendingDown className="h-3 w-3" />}
                      {isPositive ? '+' : ''}{change.toFixed(1)}%
                      <span className="text-muted-foreground font-normal">{t('comparison.vsLastMonth')}</span>
                    </div>
                  </div>
                  <MiniSparkline data={item.sparklineData} color={sparkColor} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
