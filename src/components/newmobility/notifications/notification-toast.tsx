'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { DollarSign, Users, Award, Gift, Bell, Zap, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ToastNotification {
  id: string
  type: 'cashback' | 'referral' | 'career' | 'voucher' | 'system' | 'gratification'
  title: string
  description: string
  timestamp: number
}

const notificationTypeIcons: Record<string, React.ElementType> = {
  cashback: DollarSign,
  referral: Users,
  career: Award,
  voucher: Gift,
  system: Bell,
  gratification: Zap,
}

const notificationTypeColors: Record<string, string> = {
  cashback: 'bg-emerald-500',
  referral: 'bg-blue-500',
  career: 'bg-amber-500',
  voucher: 'bg-purple-500',
  system: 'bg-gray-500',
  gratification: 'bg-rose-500',
}

const simulatedEvents: Omit<ToastNotification, 'id' | 'timestamp'>[] = [
  { type: 'cashback', title: 'CashBack Recebido!', description: 'R$ 32,50 de CashBack Entrada creditados.' },
  { type: 'referral', title: 'Novo Indicado!', description: 'Pedro Santos se cadastrou com seu código.' },
  { type: 'cashback', title: 'CashBack Residual', description: 'R$ 15,80 de CashBack Residual creditados.' },
  { type: 'gratification', title: 'Gratificação Liberada', description: 'Gratificação semanal de R$ 45,00 creditada.' },
  { type: 'voucher', title: 'Voucher Disponível', description: 'Seu voucher de R$ 50,00 está pronto.' },
  { type: 'career', title: 'Progresso na Carreira', description: 'Faltam 8 pontos para o próximo rank!' },
  { type: 'cashback', title: 'CashBack Vendas', description: 'R$ 8,90 de CashBack de vendas creditados.' },
  { type: 'referral', title: 'Indicado Ativou Plano', description: 'Ana Maria ativou o plano Blue 5!' },
  { type: 'system', title: 'Novidade no App', description: 'Nova versão do app disponível. Atualize!' },
  { type: 'cashback', title: 'Bônus Especial', description: 'Bônus de R$ 100,00 por meta atingida!' },
]

function playChime() {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)

    setTimeout(() => ctx.close(), 500)
  } catch {
    // Audio not supported, silently ignore
  }
}

function ToastItem({ notification, onDismiss }: { notification: ToastNotification; onDismiss: (id: string) => void }) {
  const Icon = notificationTypeIcons[notification.type] || Bell
  const colorClass = notificationTypeColors[notification.type] || 'bg-gray-500'

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 5000)
    return () => clearTimeout(timer)
  }, [notification.id, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="pointer-events-auto w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-lg overflow-hidden"
    >
      <div className="flex items-start gap-3 p-3">
        <div className={`p-2 rounded-lg ${colorClass} text-white shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{notification.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.description}</p>
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="h-0.5 bg-muted">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 5, ease: 'linear' }}
          className={`h-full ${colorClass}`}
        />
      </div>
    </motion.div>
  )
}

export function NotificationToastManager() {
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const eventIndexRef = useRef(0)
  const { user } = useStore()

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      const event = simulatedEvents[eventIndexRef.current % simulatedEvents.length]
      eventIndexRef.current++

      const newToast: ToastNotification = {
        ...event,
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      }

      setToasts(prev => [...prev.slice(-2), newToast])
      playChime()
    }, 30000 + Math.random() * 30000) // 30-60 seconds

    // Show first toast after 10 seconds
    const initialTimeout = setTimeout(() => {
      const event = simulatedEvents[0]
      eventIndexRef.current = 1
      const newToast: ToastNotification = {
        ...event,
        id: `toast-${Date.now()}`,
        timestamp: Date.now(),
      }
      setToasts([newToast])
      playChime()
    }, 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [user])

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <ToastItem key={toast.id} notification={toast} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
