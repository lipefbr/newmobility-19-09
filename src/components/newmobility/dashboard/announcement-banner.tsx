'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'
import { useStore } from '@/lib/store'
import { Megaphone, X, ChevronRight, AlertTriangle, Info, Sparkles, Wrench, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { announcementApi } from '@/lib/api'

interface Announcement {
  id: string
  title: string
  message: string
  type: string
  priority: string
  isActive: boolean
  actionLabel?: string
  actionUrl?: string
  createdAt: string
}

const typeConfig: Record<string, { bg: string; icon: React.ElementType; iconBg: string }> = {
  info: { bg: 'bg-gradient-to-r from-blue-600 to-cyan-600', icon: Info, iconBg: 'bg-white/20' },
  promo: { bg: 'bg-gradient-to-r from-emerald-600 to-teal-600', icon: Zap, iconBg: 'bg-white/20' },
  maintenance: { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', icon: Wrench, iconBg: 'bg-white/20' },
  feature: { bg: 'bg-gradient-to-r from-purple-600 to-pink-600', icon: Sparkles, iconBg: 'bg-white/20' },
  urgent: { bg: 'bg-gradient-to-r from-red-600 to-rose-600', icon: AlertTriangle, iconBg: 'bg-white/20' },
}

const STORAGE_KEY = 'newmobility-dismissed-announcements'

export function AnnouncementBanner() {
  const { t } = useTranslation()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const mountState = () => {
      setIsMounted(true)
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) setDismissedIds(JSON.parse(stored))
      } catch { /* ignore */ }
    }
    mountState()
  }, [])

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const data = await announcementApi.getActive()
        if (Array.isArray(data)) setAnnouncements(data)
      } catch { /* ignore */ }
    }
    loadAnnouncements()
  }, [])

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id))

  const current = visibleAnnouncements[currentIdx]

  const handleDismiss = () => {
    if (!current) return
    const newDismissed = [...dismissedIds, current.id]
    setDismissedIds(newDismissed)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newDismissed)) } catch { /* ignore */ }
    setCurrentIdx(0)
  }

  const handleNext = () => {
    if (currentIdx < visibleAnnouncements.length - 1) setCurrentIdx(prev => prev + 1)
  }

  if (!isMounted || !current) return null

  const config = typeConfig[current.type] || typeConfig.info
  const Icon = config.icon

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className={`${config.bg} text-white relative`}>
          <div className="px-4 py-2.5 flex items-center gap-3 max-w-full">
            <div className={`p-1.5 rounded-lg ${config.iconBg} shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm font-semibold truncate">{current.title}</span>
              <span className="text-xs opacity-80 hidden sm:inline truncate">{current.message}</span>
            </div>
            {current.priority === 'urgent' && (
              <span className="animate-pulse text-xs font-bold bg-white/20 rounded px-1.5 py-0.5">URGENTE</span>
            )}
            {current.actionLabel && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-white/90 hover:text-white hover:bg-white/15 shrink-0 gap-1"
              >
                {current.actionLabel}
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            {visibleAnnouncements.length > 1 && (
              <button
                onClick={handleNext}
                className="text-white/60 hover:text-white shrink-0 text-[10px] font-medium"
              >
                {currentIdx + 1}/{visibleAnnouncements.length}
              </button>
            )}
            <button onClick={handleDismiss} className="text-white/60 hover:text-white shrink-0 ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
