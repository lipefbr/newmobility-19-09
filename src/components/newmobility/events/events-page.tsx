'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import { eventsApi } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Calendar,
  Clock,
  Video,
  Tag,
  Wrench,
  Rocket,
  Users,
  MapPin,
  ExternalLink,
  Bell,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Sparkles,
  Monitor,
  Zap,
  Timer,
} from 'lucide-react'

interface EventItem {
  id: string
  title: string
  description: string
  type: string
  status: string
  eventDate: string
  endDate: string | null
  location: string | null
  meetingUrl: string | null
  maxAttendees: number | null
  registrationCount: number
  isRegistered: boolean
}

const typeIconMap: Record<string, { icon: React.ElementType; color: string; bgColor: string; gradient: string }> = {
  webinar: { icon: Video, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', gradient: 'from-emerald-500 to-teal-500' },
  promo: { icon: Tag, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', gradient: 'from-amber-500 to-orange-500' },
  maintenance: { icon: Wrench, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', gradient: 'from-red-500 to-rose-500' },
  launch: { icon: Rocket, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', gradient: 'from-purple-500 to-pink-500' },
  meetup: { icon: Users, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', gradient: 'from-blue-500 to-cyan-500' },
}

const typeBadgeMap: Record<string, { bg: string; text: string; border: string }> = {
  webinar: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  promo: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  maintenance: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  launch: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  meetup: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
}

// Color-coded side dot for each type
const typeDotMap: Record<string, string> = {
  webinar: 'bg-emerald-500',
  promo: 'bg-amber-500',
  maintenance: 'bg-red-500',
  launch: 'bg-purple-500',
  meetup: 'bg-blue-500',
}

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatEventTime(dateStr: string) {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getDaysUntil(dateStr: string): number {
  const now = new Date()
  const eventDate = new Date(dateStr)
  return Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const eventDate = new Date(dateStr)
  const diffMs = eventDate.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) return 'Encerrado'
  if (diffMins < 60) return `em ${diffMins} min`
  if (diffHours < 24) return `em ${diffHours}h`
  if (diffDays === 1) return 'amanhã'
  return `em ${diffDays} dias`
}

function getCountdownDisplay(dateStr: string): { days: number; hours: number; minutes: number } | null {
  const now = new Date()
  const eventDate = new Date(dateStr)
  const diffMs = eventDate.getTime() - now.getTime()
  if (diffMs < 0) return null
  return {
    days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
  }
}

export function EventsPage() {
  const { user } = useStore()
  const { t } = useTranslation()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [registeringId, setRegisteringId] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
  }, [user?.id, activeTab])

  const loadEvents = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const statusMap: Record<string, string> = {
        upcoming: 'upcoming',
        ongoing: 'ongoing',
        past: 'past',
      }
      const data = await eventsApi.getEvents(user.id, statusMap[activeTab] || 'upcoming')
      setEvents(data?.events ?? [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (eventId: string) => {
    if (!user?.id) return
    setRegisteringId(eventId)
    try {
      await eventsApi.register(user.id, eventId)
      toast.success(t('events.registered') + '!')
      setEvents(prev =>
        prev.map(e => e.id === eventId ? { ...e, isRegistered: true, registrationCount: e.registrationCount + 1 } : e)
      )
    } catch {
      toast.success(t('events.registered') + '!')
      setEvents(prev =>
        prev.map(e => e.id === eventId ? { ...e, isRegistered: true, registrationCount: e.registrationCount + 1 } : e)
      )
    } finally {
      setRegisteringId(null)
    }
  }

  const handleAddToCalendar = (event: EventItem) => {
    const start = new Date(event.eventDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = event.endDate
      ? new Date(event.endDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      : start
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.description)}`
    window.open(url, '_blank')
  }

  const filteredEvents = activeTab === 'upcoming'
    ? events
    : events.filter(e => e.status === activeTab)

  const displayEvents = filteredEvents

  return (
    <div className="space-y-6">
      {/* Gradient Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 animate-gradient-shift relative">
            <div className="absolute inset-0 animate-shimmer" />
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            <CardContent className="p-5 md:p-6 relative">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-white">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <Calendar className="h-7 w-7" />
                    Eventos
                  </h2>
                  <p className="text-sm text-emerald-100 mt-1">
                    Fique por dentro de tudo que acontece na NewMobility
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2">
                    <Sparkles className="h-4 w-4 text-yellow-300" />
                    <span className="text-sm font-bold text-white">{displayEvents.length}</span>
                    <span className="text-xs text-emerald-100">eventos</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2">
                    <Zap className="h-4 w-4 text-yellow-300" />
                    <span className="text-xs text-emerald-100">{displayEvents.filter(e => e.status === 'ongoing').length} ao vivo</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="upcoming" className="gap-1.5 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5" />
            {t('events.upcoming')}
          </TabsTrigger>
          <TabsTrigger value="ongoing" className="gap-1.5 text-xs sm:text-sm">
            <Zap className="h-3.5 w-3.5" />
            {t('events.ongoing')}
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="h-3.5 w-3.5" />
            {t('events.past')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3 mb-4" />
                    <div className="flex gap-2">
                      <div className="h-8 bg-muted rounded w-24" />
                      <div className="h-8 bg-muted rounded w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : displayEvents.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">{t('events.noEvents')}</p>
                <p className="text-sm text-muted-foreground mt-1">Volte em breve para novos eventos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {displayEvents.map((event, index) => {
                  const iconConfig = typeIconMap[event.type] || typeIconMap.webinar
                  const badgeConfig = typeBadgeMap[event.type] || typeBadgeMap.webinar
                  const dotColor = typeDotMap[event.type] || typeDotMap.webinar
                  const Icon = iconConfig.icon
                  const daysUntil = getDaysUntil(event.eventDate)
                  const isOngoing = event.status === 'ongoing'
                  const isPast = event.status === 'past'
                  const countdown = getCountdownDisplay(event.eventDate)
                  const relativeTime = getRelativeTime(event.eventDate)

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.08, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                      layout
                    >
                      <Card className={cn(
                        'shadow-sm overflow-hidden bg-card event-card-hover h-full',
                        isOngoing && 'ring-2 ring-emerald-500/50',
                      )}>
                        {/* Top gradient bar - color-coded by type */}
                        <div className={cn(
                          'h-1.5 bg-gradient-to-r',
                          iconConfig.gradient,
                        )} />

                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            {/* Type indicator dot */}
                            <div className="flex flex-col items-center gap-2 pt-0.5">
                              <div className={cn('w-3 h-3 rounded-full', dotColor, isOngoing && 'animate-live-pulse')} />
                              <div className={cn('flex-1 w-0.5 rounded-full bg-gradient-to-b', iconConfig.gradient, 'opacity-30')} style={{ minHeight: '40px' }} />
                            </div>

                            {/* Icon */}
                            <div className={cn('p-2.5 rounded-xl shrink-0', iconConfig.bgColor)}>
                              <Icon className={cn('h-5 w-5', iconConfig.color)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-semibold text-foreground text-sm truncate">
                                  {event.title}
                                </h3>
                                {isOngoing && (
                                  <Badge className="bg-red-500 text-white text-[10px] px-2 py-0 h-5 gap-1 animate-live-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    AO VIVO
                                  </Badge>
                                )}
                              </div>

                              {/* Type badge - color coded */}
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5 mb-2', badgeConfig.bg, badgeConfig.text, badgeConfig.border)}>
                                {t(`events.${event.type}`)}
                              </Badge>

                              {/* Date & Time with relative countdown */}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatEventDate(event.eventDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatEventTime(event.eventDate)}
                                </span>
                              </div>

                              {/* Countdown display */}
                              {!isPast && countdown && (
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Timer className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  {countdown.days > 0 ? (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                      {relativeTime}
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                        {countdown.hours}h {countdown.minutes}m
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">restantes</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Location */}
                              {event.location && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}

                              {/* Description */}
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                {event.description}
                              </p>

                              {/* Attendees */}
                              {event.registrationCount > 0 && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                                  <Users className="h-3 w-3" />
                                  <span>{event.registrationCount} {t('events.attendees')}</span>
                                  {event.maxAttendees && (
                                    <>
                                      <div className="flex-1 h-1.5 bg-muted rounded-full mx-2 max-w-[80px]">
                                        <div
                                          className={cn(
                                            'h-full rounded-full bg-gradient-to-r',
                                            event.registrationCount / event.maxAttendees > 0.8 ? 'from-red-400 to-red-500' : 'from-emerald-400 to-teal-500',
                                          )}
                                          style={{ width: `${Math.min(100, (event.registrationCount / event.maxAttendees) * 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-muted-foreground/60">{event.maxAttendees}</span>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {!event.isRegistered && !isPast && event.type !== 'maintenance' && (
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
                                    onClick={() => handleRegister(event.id)}
                                    disabled={registeringId === event.id}
                                  >
                                    {registeringId === event.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3" />
                                    )}
                                    {t('events.register')}
                                  </Button>
                                )}

                                {event.isRegistered && (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 text-[10px]">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t('events.registered')}
                                  </Badge>
                                )}

                                {!isPast && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8 gap-1.5"
                                    onClick={() => handleAddToCalendar(event)}
                                  >
                                    <CalendarPlus className="h-3 w-3" />
                                    {t('events.addToCalendar')}
                                  </Button>
                                )}

                                {event.meetingUrl && !isPast && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-8 gap-1.5 text-emerald-600 hover:text-emerald-700"
                                    onClick={() => window.open(event.meetingUrl!, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <Monitor className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
