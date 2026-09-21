'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Shield,
  Lock,
  CreditCard,
  Check,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { motion } from 'framer-motion'

// Pages that are always accessible (even without subscription)
const ALLOWED_PAGES = ['myplan', 'profile', 'support', 'admin', 'dashboard']

// Features blocked without subscription
const BLOCKED_FEATURES = [
  { icon: '💰', label: 'Solicitar saques' },
  { icon: '🛒', label: 'Comprar no Marketplace' },
  { icon: '🎮', label: 'Apostar no Portal Gamer' },
  { icon: '⚽', label: 'Apostar no Sport Bet' },
  { icon: '🎁', label: 'Resgatar gratificações' },
  { icon: '🏪', label: 'Acessar Portal Lojista' },
  { icon: '📊', label: 'Participar do Cashback' },
  { icon: '🏆', label: 'Subir no Plano de Carreira' },
]

const PLANS = [
  {
    id: 'blue3',
    name: 'Blue 3',
    price: 'R$ 97,00',
    period: '/mês',
    color: 'from-blue-500 to-cyan-500',
    features: ['Cashback Entrada (4x5)', 'Cashback Residual (4x7)', 'Cashback Vendas (4x9)', 'Apps Mobilidade, Refeição, Farmácia', 'Gratificações disponíveis', 'Plano de Carreira'],
  },
  {
    id: 'blue5',
    name: 'Blue 5',
    price: 'R$ 147,00',
    period: '/mês',
    color: 'from-emerald-500 to-teal-500',
    popular: true,
    features: ['Tudo do Blue 3', 'Gratificações exclusivas', 'Prioridade no suporte', 'Bônus de adesão aumentado', 'App Pet, Seguro Telefone', 'Telemedicina', 'Assistência funerária'],
  },
]

export function SubscriptionBlocker() {
  const { user, activePage, setActivePage } = useStore()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if:
  // - User is not logged in
  // - User is admin
  // - User has a paid plan (blue3 or blue5)
  // - User is on an allowed page
  // - User dismissed the banner this session
  if (!user || user.role === 'admin' || user.plan !== 'free' || dismissed) {
    return null
  }

  // Show only the banner on allowed pages (not the full blocking modal)
  const onAllowedPage = ALLOWED_PAGES.includes(activePage)

  const goToPlans = () => {
    setActivePage('myplan')
    setDismissed(false)
  }

  if (onAllowedPage) {
    // Non-blocking banner on allowed pages
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Assinatura mensal pendente
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Você está no plano <strong>Gratuito</strong>. Assine um plano para desbloquear saques, marketplace, apostas, cashback e muito mais.
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                  onClick={goToPlans}
                >
                  <CreditCard className="h-3 w-3" />
                  Assinar agora
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  onClick={() => setDismissed(true)}
                >
                  Lembrar depois
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Full blocking modal on non-allowed pages
  return (
    <Dialog open={true} onOpenChange={() => { /* prevent close */ }}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
            >
              <Lock className="h-8 w-8 text-white" />
            </motion.div>
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Assinatura Necessária
          </DialogTitle>
          <DialogDescription className="text-center">
            Para acessar esta área, você precisa assinar um plano mensal. Escolha uma das opções abaixo:
          </DialogDescription>
        </DialogHeader>

        {/* Blocked features preview */}
        <div className="bg-muted/40 rounded-lg p-3 mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-center">
            Desbloqueie todos os recursos
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {BLOCKED_FEATURES.slice(0, 6).map((feature, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="text-sm">{feature.icon}</span>
                <span className="text-muted-foreground">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-2">
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative rounded-lg border-2 p-3 cursor-pointer transition-all ${
                plan.popular
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-border hover:border-emerald-300'
              }`}
              onClick={() => {
                setActivePage('myplan')
              }}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    MAIS POPULAR
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{plan.name}</p>
                      <p className="text-[11px] text-muted-foreground">{plan.features.length} recursos</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{plan.price}</p>
                  <p className="text-[10px] text-muted-foreground -mt-1">{plan.period}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {plan.features.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Check className="h-2.5 w-2.5 text-emerald-500" />
                      {f}
                    </div>
                  ))}
                  {plan.features.length > 4 && (
                    <span className="text-[10px] text-emerald-600 font-medium">+{plan.features.length - 4} mais</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 mt-2"
          onClick={() => setActivePage('myplan')}
        >
          <CreditCard className="h-4 w-4" />
          Ver detalhes e assinar
        </Button>

        <button
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
          onClick={() => setActivePage('dashboard')}
        >
          Voltar para o Dashboard
        </button>
      </DialogContent>
    </Dialog>
  )
}
