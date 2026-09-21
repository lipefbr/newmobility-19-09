'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Link2, Copy, Check, LayoutDashboard, DollarSign,
  Wallet, TrendingUp, ArrowRight, PartyPopper, Share2
} from 'lucide-react'
import { toast } from 'sonner'

const ONBOARDING_KEY = 'newmobility-onboarding-seen'

interface StepProps {
  onNext: () => void
  onSkip: () => void
  step: number
  totalSteps: number
}

function StepWelcome({ onNext, onSkip, step, totalSteps }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'tween', duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30"
      >
        <PartyPopper className="h-12 w-12 text-white" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-foreground mb-2"
      >
        Bem-vindo ao NewMobility!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-sm max-w-xs leading-relaxed"
      >
        Estamos felizes em ter você aqui! Vamos fazer um tour rápido pelas funcionalidades que vão transformar sua experiência.
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-1 mt-6"
      >
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-emerald-500' : i < step ? 'w-3 bg-emerald-300' : 'w-3 bg-muted'
            }`}
          />
        ))}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 mt-8 w-full max-w-xs"
      >
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          onClick={onNext}
        >
          Vamos lá!
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" className="text-muted-foreground text-xs" onClick={onSkip}>
          Pular tutorial
        </Button>
      </motion.div>
    </div>
  )
}

function StepShareLink({ onNext, onSkip, step, totalSteps }: StepProps) {
  const { user } = useStore()
  const [copied, setCopied] = useState(false)

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${user?.referralCode || 'USER'}`

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col items-center text-center py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-6 shadow-xl shadow-teal-500/25"
      >
        <Share2 className="h-10 w-10 text-white" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-foreground mb-2"
      >
        Compartilhe seu Link
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground text-sm max-w-xs leading-relaxed"
      >
        Indique amigos e ganhe CashBack em múltiplos níveis! Quanto mais pessoas na sua rede, maior seu ganho.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 w-full max-w-sm"
      >
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">Seu Link de Indicação</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-background rounded-lg px-3 py-2 text-sm font-mono text-foreground truncate border border-border">
              {referralLink}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Código: <strong className="text-emerald-600">{user?.referralCode || 'USER'}</strong>
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-1 mt-6"
      >
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-emerald-500' : i < step ? 'w-3 bg-emerald-300' : 'w-3 bg-muted'
            }`}
          />
        ))}
      </motion.div>

      <div className="flex gap-3 mt-6 w-full max-w-xs">
        <Button variant="outline" className="flex-1 text-xs" onClick={onSkip}>
          Pular
        </Button>
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={onNext}>
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function StepExplore({ onNext, onSkip, step, totalSteps }: StepProps) {
  const { setActivePage } = useStore()

  const features = [
    { icon: LayoutDashboard, label: 'Dashboard', desc: 'Visão geral da sua conta', color: 'from-emerald-500 to-emerald-600', page: 'dashboard' as const },
    { icon: DollarSign, label: 'CashBack', desc: 'Acompanhe seus ganhos', color: 'from-teal-500 to-teal-600', page: 'cashback' as const },
    { icon: Wallet, label: 'Financeiro', desc: 'Saldo e transações', color: 'from-amber-500 to-amber-600', page: 'financial' as const },
    { icon: TrendingUp, label: 'Carreira', desc: 'Seu plano de evolução', color: 'from-purple-500 to-purple-600', page: 'career' as const },
  ]

  return (
    <div className="flex flex-col items-center text-center py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-6 shadow-xl shadow-purple-500/25"
      >
        <Sparkles className="h-10 w-10 text-white" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-foreground mb-2"
      >
        Explore as Funcionalidades
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground text-sm max-w-xs leading-relaxed"
      >
        Descubra o que o NewMobility pode fazer por você
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-3 mt-6 w-full max-w-sm"
      >
        {features.map((feature, i) => (
          <motion.button
            key={feature.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            onClick={() => setActivePage(feature.page)}
            className="group bg-muted/50 hover:bg-muted border border-border rounded-xl p-3 text-left transition-colors"
          >
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 shadow-sm`}>
              <feature.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm font-semibold text-foreground">{feature.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{feature.desc}</p>
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-1 mt-6"
      >
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-emerald-500' : i < step ? 'w-3 bg-emerald-300' : 'w-3 bg-muted'
            }`}
          />
        ))}
      </motion.div>

      <div className="flex gap-3 mt-6 w-full max-w-xs">
        <Button variant="outline" className="flex-1 text-xs" onClick={onSkip}>
          Pular
        </Button>
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={onNext}>
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function StepGetStarted({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30"
      >
        <Sparkles className="h-12 w-12 text-white" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-foreground mb-2"
      >
        Tudo pronto!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground text-sm max-w-xs leading-relaxed"
      >
        Agora é só começar a explorar, compartilhar seu link e construir sua rede. Estamos aqui para ajudar você a crescer!
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 w-full max-w-xs"
      >
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12 text-base font-semibold"
          onClick={onSkip}
        >
          Começar!
          <ArrowRight className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  )
}

export function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const { user, isAuthenticated } = useStore()

  const totalSteps = 4

  useEffect(() => {
    if (isAuthenticated && user) {
      const seen = localStorage.getItem(ONBOARDING_KEY)
      if (!seen) {
        // Small delay so the page loads first
        const timer = setTimeout(() => setOpen(true), 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [isAuthenticated, user])

  const handleClose = () => {
    setOpen(false)
    localStorage.setItem(ONBOARDING_KEY, 'true')
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleClose()
    }
  }

  const handleSkip = () => {
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md p-6" showCloseButton={false}>
        <DialogTitle className="sr-only">Tutorial de Boas-vindas</DialogTitle>
        <DialogDescription className="sr-only">Onboarding tutorial for new users</DialogDescription>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 0 && (
              <StepWelcome onNext={handleNext} onSkip={handleSkip} step={currentStep} totalSteps={totalSteps} />
            )}
            {currentStep === 1 && (
              <StepShareLink onNext={handleNext} onSkip={handleSkip} step={currentStep} totalSteps={totalSteps} />
            )}
            {currentStep === 2 && (
              <StepExplore onNext={handleNext} onSkip={handleSkip} step={currentStep} totalSteps={totalSteps} />
            )}
            {currentStep === 3 && (
              <StepGetStarted onSkip={handleSkip} />
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
