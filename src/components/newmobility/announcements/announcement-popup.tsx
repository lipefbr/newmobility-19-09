'use client'

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { announcementApi } from '@/lib/api'
import {
  Megaphone,
  AlertTriangle,
  Info,
  Sparkles,
  Wrench,
  Zap,
  ExternalLink,
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  message: string
  type: string
  priority: string
  isActive: boolean
  showAsPopup?: boolean
  actionLabel?: string
  actionUrl?: string
  createdAt: string
}

// Each popup dismissal is stored per-announcement id so it never re-appears
// for the same user on the same device. We use a separate key namespace
// from the banner dismissals so the two features don't interfere.
const SEEN_PREFIX = 'newmobility-seen-popup-'

const typeMeta: Record<
  string,
  { icon: React.ElementType; tint: string; ring: string }
> = {
  info: { icon: Info, tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
  promo: { icon: Zap, tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
  feature: { icon: Sparkles, tint: 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400', ring: 'ring-purple-200 dark:ring-purple-800' },
  maintenance: { icon: Wrench, tint: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800' },
  urgent: { icon: AlertTriangle, tint: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400', ring: 'ring-red-200 dark:ring-red-800' },
}

function hasSeen(id: string): boolean {
  try {
    return localStorage.getItem(SEEN_PREFIX + id) === '1'
  } catch {
    return false
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(SEEN_PREFIX + id, '1')
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// useSyncExternalStore is the React-blessed way to read a client-only value
// (here: "are we in the browser?") without triggering the
// `react-hooks/set-state-in-effect` lint rule that fires when you call
// setState directly inside a useEffect body.
const emptySubscribe = () => () => {}
const getIsClient = () => true
const getIsClientServer = () => false
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, getIsClient, getIsClientServer)
}

export function AnnouncementPopup() {
  const isMounted = useIsClient()
  const { user } = useStore()
  const [popups, setPopups] = useState<Announcement[]>([])
  const [isOpen, setIsOpen] = useState(false)

  // Fetch announcements scoped to the current user (server already filters
  // by isActive, date window and targetUserTypes). We then keep only those
  // flagged showAsPopup AND not yet seen on this device.
  useEffect(() => {
    if (!isMounted || !user?.id) return
    let cancelled = false
    const load = async () => {
      try {
        const data = await announcementApi.getActive(user.id)
        if (cancelled || !Array.isArray(data)) return
        const queue = (data as Announcement[])
          .filter((a) => a.showAsPopup && !hasSeen(a.id))
        setPopups(queue)
        // Auto-open the first unseen popup.
        if (queue.length > 0) setIsOpen(true)
      } catch {
        /* ignore — popups are non-critical */
      }
    }
    load()
    return () => { cancelled = true }
  }, [isMounted, user?.id])

  const current = popups[0]

  const handleClose = useCallback(() => {
    if (!current) return
    markSeen(current.id)
    setIsOpen(false)
    // Advance the queue after the close animation finishes.
    setTimeout(() => {
      setPopups((prev) => prev.slice(1))
    }, 250)
  }, [current])

  const handleAction = useCallback(() => {
    if (!current) return
    if (current.actionUrl) {
      try {
        window.open(current.actionUrl, '_blank', 'noopener,noreferrer')
      } catch {
        /* ignore */
      }
    }
    handleClose()
  }, [current, handleClose])

  if (!isMounted || !current) return null

  const meta = typeMeta[current.type] || typeMeta.info
  const Icon = meta.icon
  const isUrgent = current.priority === 'urgent'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="rounded-2xl shadow-lg sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${meta.tint} ring-1 ${meta.ring} shrink-0`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  <Megaphone className="h-3 w-3 mr-1" />
                  Anúncio
                </Badge>
                {isUrgent && (
                  <Badge className="bg-red-600 text-white text-[10px] uppercase">Urgente</Badge>
                )}
              </div>
              <DialogTitle className="text-base sm:text-lg text-left">
                {current.title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm text-foreground/80 whitespace-pre-line text-left">
            {current.message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Entendi
          </Button>
          {current.actionLabel && (
            <Button
              type="button"
              onClick={handleAction}
              className="w-full sm:w-auto gap-1.5"
            >
              {current.actionLabel}
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

