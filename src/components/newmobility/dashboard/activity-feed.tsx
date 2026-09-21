'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'
import {
  DollarSign,
  Users,
  TrendingUp,
  ArrowDownToLine,
  Zap,
  Gift,
  Star,
  Award,
  Activity,
  ShoppingCart,
  CreditCard,
  Car,
  Shield,
  Trophy,
  Package,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, timeSince } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: string
  description: string
  detail?: string
  amount?: number
  time: string
  icon: React.ElementType
  color: string
  badge?: string
  badgeColor?: string
}

interface ActivityFeedProps {
  /** Real per-user recent activity from the dashboard API
   * (`recentActivity` field). When provided, mock data is NOT rendered. */
  activities?: any[]
}

// Map a raw transaction (type/category) to an ActivityItem-friendly shape so
// the dashboard shows real per-user activity instead of hardcoded mocks.
function mapTransactionToActivity(tx: any): ActivityItem {
  const type = tx?.type || tx?.category || 'other'
  const category = tx?.category
  const amount = Number(tx?.amount || 0)

  // Defaults
  let icon: React.ElementType = Activity
  let color = 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
  let badge = tx?.status || ''
  let badgeColor = 'bg-gray-50 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
  let description = tx?.description || type

  // Choose icon/color/badge based on type or category (Portuguese labels).
  if (type === 'cashback' || type === 'cashback_entry' || category === 'cashback') {
    icon = DollarSign
    color = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    badge = 'CashBack'
    badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    description = 'CashBack recebido'
  } else if (type === 'cashback_residual' || category === 'cashback_residual') {
    icon = DollarSign
    color = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    badge = 'Residual'
    badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    description = 'CashBack Residual recebido'
  } else if (type === 'cashback_sales' || category === 'cashback_sales') {
    icon = DollarSign
    color = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    badge = 'Vendas'
    badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    description = 'CashBack Vendas recebido'
  } else if (type === 'referral') {
    icon = Users
    color = 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
    badge = 'Direto'
    badgeColor = 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
    description = 'Nova indicação cadastrada'
  } else if (type === 'career' || type === 'points') {
    icon = TrendingUp
    color = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    badge = '+' + (amount > 0 ? amount : 'pts')
    badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    description = 'Pontos de carreira creditados'
  } else if (type === 'withdrawal' || type === 'withdrawal_fee' || category === 'withdrawal_fee') {
    icon = ArrowDownToLine
    color = 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    badge = tx?.status === 'paid' ? 'Pago' : tx?.status === 'pending' ? 'Pendente' : 'Saque'
    badgeColor = 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    description = type === 'withdrawal_fee' ? 'Taxa de saque' : 'Saque processado'
  } else if (type === 'upgrade' || type === 'plan_upgrade' || category === 'plan_upgrade') {
    icon = Zap
    color = 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
    badge = 'Upgrade'
    badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
    description = 'Upgrade de plano'
  } else if (type === 'gratification' || category === 'gratification') {
    icon = Gift
    color = 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
    badge = 'Semanal'
    badgeColor = 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
    description = 'Gratificação creditada'
  } else if (type === 'voucher' || category === 'voucher') {
    icon = ShoppingCart
    color = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    badge = 'Voucher'
    badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    description = 'Voucher comprado'
  } else if (type === 'ride' || category === 'mobility') {
    icon = Car
    color = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    badge = 'Mobilidade'
    badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    description = 'Corrida finalizada'
  } else if (type === 'insurance' || category === 'insurance') {
    icon = Shield
    color = 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
    badge = 'Seguro'
    badgeColor = 'bg-gray-50 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
    description = 'Seguro ativado'
  } else if (type === 'plan' || type === 'plan_subscription' || category === 'plan_subscription') {
    icon = CreditCard
    color = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    badge = 'Renovação'
    badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    description = 'Renovação do plano confirmada'
  } else if (type === 'bonus') {
    icon = Award
    color = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    badge = 'Bônus'
    badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    description = 'Bônus creditado'
  } else if (type === 'meal' || category === 'meal' || category === 'food') {
    icon = Package
    color = 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    badge = 'Refeição'
    badgeColor = 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
    description = 'CashBack de refeição'
  } else if (category === 'pharmacy') {
    icon = Package
    color = 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
    badge = 'Farmácia'
    badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
    description = 'CashBack de farmácia'
  } else if (category === 'shopping') {
    icon = ShoppingCart
    color = 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    badge = 'Shopping'
    badgeColor = 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    description = 'CashBack de compras'
  } else if (category === 'bills') {
    icon = CreditCard
    color = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    badge = 'Contas'
    badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    description = 'Pagamento de conta'
  } else if (type === 'star' || type === 'achievement') {
    icon = Star
    color = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    badge = 'Conquista'
    badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    description = 'Nova conquista desbloqueada'
  } else if (type === 'trophy') {
    icon = Trophy
    color = 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    badge = 'Troféu'
    badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    description = 'Troféu conquistado'
  }

  return {
    id: tx?.id || `tx-${Math.random().toString(36).slice(2)}`,
    type,
    description: tx?.description || description,
    detail: tx?.description && tx?.description !== description ? tx.description : undefined,
    amount,
    time: tx?.time || new Date().toISOString(),
    icon,
    color,
    badge,
    badgeColor,
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const { t } = useTranslation()

  // Map real per-user transactions to activity items. No more hardcoded mocks.
  const items = useMemo<ActivityItem[]>(() => {
    if (!activities || activities.length === 0) return []
    return activities.map(mapTransactionToActivity)
  }, [activities])

  return (
    <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 bg-card h-full border border-emerald-100/50 dark:border-emerald-900/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            {t('dashboard.activity.title')}
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {items.length > 0
              ? `${items.length} ${items.length === 1 ? 'atividade' : 'atividades'}`
              : 'Sem atividades'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5 max-h-96 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma atividade recente
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Suas últimas transações aparecerão aqui.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((activity, i) => {
                const Icon = activity.icon
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.25, ease: 'easeOut' }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group cursor-default"
                  >
                    <div className={cn('p-2 rounded-full shrink-0 shadow-sm', activity.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{activity.description}</p>
                        {activity.badge && (
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wide', activity.badgeColor)}>
                            {activity.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {activity.detail && (
                          <p className="text-[11px] text-muted-foreground truncate">{activity.detail}</p>
                        )}
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">•</span>
                        <p className="text-[10px] text-muted-foreground shrink-0">{timeSince(activity.time)}</p>
                      </div>
                    </div>
                    {activity.amount !== undefined && activity.amount > 0 && (
                      <motion.span
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          'text-sm font-bold shrink-0',
                          'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        +{Math.abs(activity.amount)} pts
                      </motion.span>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
