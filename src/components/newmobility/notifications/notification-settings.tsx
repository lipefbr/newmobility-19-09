'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Settings2, DollarSign, Users, TrendingUp, Ticket, Info, Sparkles, Bell, Check } from 'lucide-react'
import { useStore, type Notification } from '@/lib/store'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

type NotificationType = Notification['type']

interface NotifPref {
  type: NotificationType
  label: string
  description: string
  icon: React.ElementType
  enabled: boolean
}

const defaultPreferences: NotifPref[] = [
  { type: 'cashback', label: 'CashBack', description: 'Receber notificações de CashBack recebido', icon: DollarSign, enabled: true },
  { type: 'referral', label: 'Indicações', description: 'Novos indicados e ativações na rede', icon: Users, enabled: true },
  { type: 'career', label: 'Carreira', description: 'Progresso e promoções no plano de carreira', icon: TrendingUp, enabled: true },
  { type: 'voucher', label: 'Vouchers', description: 'Vouchers disponíveis e expiração', icon: Ticket, enabled: true },
  { type: 'gratification', label: 'Gratificações', description: 'Gratificações liberadas e creditadas', icon: Sparkles, enabled: true },
  { type: 'system', label: 'Sistema', description: 'Atualizações e avisos do sistema', icon: Info, enabled: true },
]

const STORAGE_KEY = 'newmobility-notification-prefs'

function loadPreferences(): NotifPref[] {
  if (typeof window === 'undefined') return defaultPreferences
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, boolean>
      return defaultPreferences.map(pref => ({
        ...pref,
        enabled: parsed[pref.type] ?? pref.enabled,
      }))
    }
  } catch {
    // ignore
  }
  return defaultPreferences
}

function savePreferences(prefs: NotifPref[]) {
  if (typeof window === 'undefined') return
  const map: Record<string, boolean> = {}
  prefs.forEach(p => { map[p.type] = p.enabled })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotifPref[]>(() => loadPreferences())
  const [saved, setSaved] = useState(false)

  const handleToggle = (type: NotificationType) => {
    setPreferences(prev => {
      const updated = prev.map(p =>
        p.type === type ? { ...p, enabled: !p.enabled } : p
      )
      savePreferences(updated)
      return updated
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleEnableAll = () => {
    const updated = preferences.map(p => ({ ...p, enabled: true }))
    setPreferences(updated)
    savePreferences(updated)
    toast.success('Todas as notificações ativadas')
  }

  const handleDisableAll = () => {
    const updated = preferences.map(p => ({ ...p, enabled: false }))
    setPreferences(updated)
    savePreferences(updated)
    toast.success('Todas as notificações desativadas')
  }

  const enabledCount = preferences.filter(p => p.enabled).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
          <Settings2 className="h-3.5 w-3.5" />
          Preferências
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-foreground">Preferências</h3>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 text-xs text-emerald-600"
              >
                <Check className="h-3 w-3" />
                Salvo
              </motion.span>
            )}
            <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {enabledCount}/{preferences.length}
            </Badge>
          </div>
        </div>

        {/* Toggle all */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleEnableAll}>
            Ativar todas
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleDisableAll}>
            Desativar todas
          </Button>
        </div>

        {/* Preferences list */}
        <ScrollArea className="max-h-64">
          <div className="divide-y divide-border">
            {preferences.map((pref) => {
              const Icon = pref.icon
              return (
                <div key={pref.type} className="flex items-start gap-3 px-4 py-3">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    pref.enabled
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground cursor-pointer">
                        {pref.label}
                      </Label>
                      <Switch
                        checked={pref.enabled}
                        onCheckedChange={() => handleToggle(pref.type)}
                        className="scale-75 origin-right"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {pref.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}


