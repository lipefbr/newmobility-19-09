'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatNumber } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Users, DollarSign, Activity, Truck, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StatsCardsProps {
  data: any | null
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
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
    <span className={cn('text-3xl md:text-4xl font-bold text-foreground', className)}>
      {formatNumber(display)}
    </span>
  )
}

interface TrendIndicatorProps {
  value: number
  label: string
}

function TrendIndicator({ value, label }: TrendIndicatorProps) {
  const isPositive = value >= 0
  return (
    <div className={cn(
      'flex items-center gap-1 text-xs font-semibold',
      isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
    )}>
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>{isPositive ? '+' : ''}{value}%</span>
      <span className="text-muted-foreground font-normal">{label}</span>
    </div>
  )
}

export function StatsCards({ data }: StatsCardsProps) {
  const { t } = useTranslation()

  const stats = [
    {
      title: t('dashboard.stats.direct'),
      value: data?.directReferrals ?? data?.directReferralCount ?? 0,
      subtitle: `${t('dashboard.stats.total')} ${formatNumber(data?.cashbackEntrada?.totalUsers ?? 0)} ${t('dashboard.stats.users')}`,
      icon: Users,
      gradientFrom: 'from-emerald-50',
      gradientTo: 'to-emerald-100/50',
      darkGradientFrom: 'dark:from-emerald-950/30',
      darkGradientTo: 'dark:to-emerald-900/20',
      border: 'border-emerald-200/80 dark:border-emerald-800/50',
      iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
      delay: 0,
      trend: 12,
      tooltipDetail: t('dashboard.stats.direct'),
    },
    {
      title: t('dashboard.stats.entrada'),
      value: data?.cashbackEntrada?.totalUsers ?? 0,
      subtitle: `${t('dashboard.stats.total')} ${formatNumber(data?.cashbackEntrada?.totalUsers ?? 0)} ${t('dashboard.stats.users')}`,
      icon: DollarSign,
      gradientFrom: 'from-teal-50',
      gradientTo: 'to-teal-100/50',
      darkGradientFrom: 'dark:from-teal-950/30',
      darkGradientTo: 'dark:to-teal-900/20',
      border: 'border-teal-200/80 dark:border-teal-800/50',
      iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400',
      delay: 0.1,
      trend: 8,
      tooltipDetail: t('dashboard.stats.entrada'),
    },
    {
      title: t('dashboard.stats.residual'),
      value: data?.cashbackResidual?.totalUsers ?? 0,
      subtitle: `${t('dashboard.stats.total')} ${formatNumber(data?.cashbackResidual?.totalUsers ?? 0)} ${t('dashboard.stats.users')}`,
      icon: Activity,
      gradientFrom: 'from-amber-50',
      gradientTo: 'to-amber-100/50',
      darkGradientFrom: 'dark:from-amber-950/30',
      darkGradientTo: 'dark:to-amber-900/20',
      border: 'border-amber-200/80 dark:border-amber-800/50',
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
      delay: 0.2,
      trend: -3,
      tooltipDetail: t('dashboard.stats.residual'),
    },
    {
      title: t('dashboard.stats.sales'),
      value: data?.cashbackVendas?.totalUsers ?? 0,
      subtitle: `${t('dashboard.stats.total')} ${formatNumber(data?.cashbackVendas?.totalUsers ?? 0)} ${t('dashboard.stats.users')}`,
      icon: Truck,
      gradientFrom: 'from-purple-50',
      gradientTo: 'to-purple-100/50',
      darkGradientFrom: 'dark:from-purple-950/30',
      darkGradientTo: 'dark:to-purple-900/20',
      border: 'border-purple-200/80 dark:border-purple-800/50',
      iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
      delay: 0.3,
      trend: 15,
      tooltipDetail: t('dashboard.stats.sales'),
    },
  ]

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: stat.delay, duration: 0.45, ease: 'easeOut' }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className={cn(
                    'rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden group',
                    stat.border
                  )}>
                    {/* Gradient overlay */}
                    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', stat.gradientFrom, stat.gradientTo, stat.darkGradientFrom, stat.darkGradientTo)} />
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
                    <CardContent className="p-4 md:p-5 relative">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {stat.title}
                        </span>
                        <motion.div
                          className={cn('p-2 rounded-full', stat.iconBg)}
                          whileHover={{ rotate: 5, scale: 1.1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Icon className="h-5 w-5" />
                        </motion.div>
                      </div>
                      <AnimatedNumber value={stat.value} />
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground font-medium">{stat.subtitle}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <TrendIndicator value={stat.trend} label={t('dashboard.stats.vsMonth')} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px]">
                  <p className="text-xs">{stat.tooltipDetail}</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
