'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Bell,
  CheckCheck,
  Gift,
  TrendingUp,
  Users,
  Star,
  Info,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useMobileAuth } from '@/lib/mobile-auth'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { MobilePageHeader } from '@/components/mobile/mobile-page-header'

// ============================================================================
// /mobile/notificacoes — User's notification list.
// ----------------------------------------------------------------------------
// Fetches GET /api/notifications?userId=X. Each card shows icon (by type),
// title, message, timestamp, unread badge. Click marks as read via
// PUT /api/notifications/read. "Marcar todas como lidas" calls read-all.
// ============================================================================

const PRIMARY = '#155EEF'
const GREEN = '#22C55E'
const MINT_BG = '#EAF7EF'

interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

function notifIcon(type: string): typeof Bell {
  switch (type) {
    case 'cashback':
      return TrendingUp
    case 'referral':
      return Users
    case 'career':
      return Star
    case 'voucher':
      return Gift
    case 'gratification':
      return Sparkles
    case 'system':
      return Info
    default:
      return Bell
  }
}

function notifColor(type: string): string {
  switch (type) {
    case 'cashback':
      return GREEN
    case 'referral':
      return PRIMARY
    case 'career':
      return '#F59E0B'
    case 'voucher':
      return '#8B5CF6'
    case 'gratification':
      return '#EC4899'
    case 'system':
      return '#6B7280'
    default:
      return PRIMARY
  }
}

function timeAgo(iso: string): string {
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diff = Math.max(0, now - d.getTime())
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return 'agora'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}min`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h`
    const day = Math.floor(hr / 24)
    if (day < 7) return `${day}d`
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

export default function NotificacoesPage() {
  const router = useRouter()
  const { user, loading } = useMobileAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [fetching, setFetching] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setFetching(true)
    try {
      const resp = await apiFetch<NotificationsResponse>(
        `/notifications?userId=${user.id}`
      )
      setNotifications(resp.notifications || [])
      setUnreadCount(resp.unreadCount || 0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar notificações')
    } finally {
      setFetching(false)
    }
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  const onMarkAllRead = async () => {
    if (!user?.id || unreadCount === 0) return
    setMarkingAll(true)
    try {
      await apiFetch('/notifications/read-all', {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success('Todas marcadas como lidas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao marcar como lidas')
    } finally {
      setMarkingAll(false)
    }
  }

  const onMarkRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.isRead ? { ...n, isRead: true } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await apiFetch('/notifications/read', {
        method: 'PUT',
        body: JSON.stringify({ notificationId: id }),
      })
    } catch {
      // revert silently on failure (rare)
      load()
    }
  }

  if (loading) {
    return (
      <MobileAppShell>
        <MobilePageHeader title="Notificações" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
        </div>
      </MobileAppShell>
    )
  }

  return (
    <MobileAppShell>
      <MobilePageHeader
        title="Notificações"
        right={
          unreadCount > 0 ? (
            <button
              onClick={onMarkAllRead}
              disabled={markingAll}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Marcar todas como lidas"
            >
              {markingAll ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <CheckCheck className="h-4 w-4 text-white" />
              )}
            </button>
          ) : undefined
        }
      />

      <div className="px-4 pt-4">
        {/* Unread summary */}
        {unreadCount > 0 && (
          <div
            className="rounded-xl p-3 mb-3 flex items-center gap-2"
            style={{ backgroundColor: `${PRIMARY}10` }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: PRIMARY }}
            >
              <Bell className="h-4 w-4 text-white" />
            </span>
            <p className="text-xs font-semibold text-gray-900">
              {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
            </p>
            <button
              onClick={onMarkAllRead}
              disabled={markingAll}
              className="ml-auto text-xs font-bold min-h-[44px] min-w-[44px] flex items-center"
              style={{ color: PRIMARY }}
            >
              Ler todas
            </button>
          </div>
        )}

        {/* List */}
        {fetching ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: PRIMARY }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-3"
              style={{ backgroundColor: MINT_BG }}
            >
              <Bell className="h-7 w-7" style={{ color: '#059669' }} />
            </div>
            <p className="text-sm font-bold text-gray-900">Sem notificações</p>
            <p className="text-xs text-gray-500 mt-1">
              Você será avisado sobre cashback, saques e novidades.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, idx) => {
              const Icon = notifIcon(n.type)
              const color = notifColor(n.type)
              return (
                <motion.button
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  onClick={() => !n.isRead && onMarkRead(n.id)}
                  className="w-full text-left p-3 rounded-xl border bg-white shadow-sm flex items-start gap-3 transition-shadow hover:shadow-md min-h-[44px]"
                  style={{
                    borderColor: n.isRead ? '#F3F4F6' : `${color}40`,
                    backgroundColor: n.isRead ? '#FFFFFF' : `${color}08`,
                  }}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900 truncate flex-1">
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed line-clamp-3">
                      {n.message}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        )}

        {/* Info note */}
        {!fetching && notifications.length > 0 && (
          <div className="rounded-xl p-3 mt-4 flex items-start gap-2 bg-gray-50">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-500" />
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Toque em uma notificação não lida para marcá-la como lida.
            </p>
          </div>
        )}
      </div>

      <div className="h-4" />
    </MobileAppShell>
  )
}
