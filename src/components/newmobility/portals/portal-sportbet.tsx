'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { betApi } from '@/lib/api'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import {
  Trophy, TrendingUp, DollarSign, Calendar, BarChart3,
  Clock, Zap, Shield, ArrowUpRight, Activity, AlertTriangle,
  Phone, Wallet, X, Check, Minus, Plus, RotateCcw, Star,
  Target, Percent, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// --- Types ---
interface SportEvent {
  id: string
  home: string
  away: string
  league: string
  leagueIcon: string
  homeOdds: number
  drawOdds: number
  awayOdds: number
  isLive: boolean
  matchTime: string
  startTime?: string
  homeScore?: number
  awayScore?: number
}

interface BetItem {
  id: string
  eventId: string
  eventLabel: string
  selection: string
  selectionLabel: string
  odds: number
  amountInCents: number
  potentialWinInCents: number
  status: string
  result: string | null
  settledAt: string | null
  createdAt: string
}

interface BetSlipItem {
  eventId: string
  eventLabel: string
  selection: string
  selectionLabel: string
  odds: number
}

// --- Helpers ---
function getOddsColor(odds: number): string {
  if (odds < 2.0) return 'text-emerald-600 dark:text-emerald-400'
  if (odds <= 3.0) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getOddsBgColor(odds: number, isSelected: boolean): string {
  if (isSelected) return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-500/30'
  if (odds < 2.0) return 'hover:border-emerald-300 dark:hover:border-emerald-700'
  if (odds <= 3.0) return 'hover:border-amber-300 dark:hover:border-amber-700'
  return 'hover:border-red-300 dark:hover:border-red-700'
}

function getOddsButtonBg(odds: number, isSelected: boolean): string {
  if (isSelected) return 'bg-emerald-500 text-white border-emerald-500'
  if (odds < 2.0) return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
  if (odds <= 3.0) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
  return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40'
}

const betStatusColor: Record<string, string> = {
  won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

const betIconColor: Record<string, string> = {
  won: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  lost: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
}

const betStatusLabel: Record<string, string> = {
  won: 'Ganha',
  lost: 'Perdida',
  pending: 'Pendente',
}

// --- Component ---
export function PortalSportBet() {
  const { user, updateUser } = useStore()
  const [events, setEvents] = useState<SportEvent[]>([])
  const [bets, setBets] = useState<BetItem[]>([])
  const [betStats, setBetStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([])
  const [betAmount, setBetAmount] = useState<string>('10')
  const [placingBet, setPlacingBet] = useState(false)
  const [settlingBet, setSettlingBet] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('live')
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [leagueFilter, setLeagueFilter] = useState('all')

  // Fetch odds
  const fetchOdds = useCallback(async () => {
    try {
      const data = await betApi.getOdds()
      setEvents(data.events || [])
    } catch {
      // Silently fail, keep existing data
    }
  }, [])

  // Fetch bets
  const fetchBets = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await betApi.getBets(user.id, 'all', 50)
      setBets(data.bets || [])
      setBetStats(data.stats || null)
    } catch {
      // Silently fail
    }
  }, [user?.id])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchOdds(), fetchBets()])
      setLoading(false)
    }
    load()
    // Auto-refresh odds every 60s
    const interval = setInterval(fetchOdds, 60000)
    return () => clearInterval(interval)
  }, [fetchOdds, fetchBets])

  // Add to bet slip
  const addToBetSlip = (eventId: string, eventLabel: string, selection: string, selectionLabel: string, odds: number) => {
    // Remove any existing selection for this event
    const filtered = betSlip.filter(item => item.eventId !== eventId)
    setBetSlip([...filtered, { eventId, eventLabel, selection, selectionLabel, odds }])
    toast.success(`${selectionLabel} adicionado ao bilhete`, { duration: 2000 })
  }

  // Remove from bet slip
  const removeFromBetSlip = (eventId: string) => {
    setBetSlip(betSlip.filter(item => item.eventId !== eventId))
  }

  // Check if a selection is in bet slip
  const isInBetSlip = (eventId: string, selection: string) => {
    return betSlip.some(item => item.eventId === eventId && item.selection === selection)
  }

  // Calculate total odds (multiply all odds for accumulator)
  const totalOdds = betSlip.reduce((acc, item) => acc * item.odds, 1)

  // Calculate potential win
  const amountInCents = Math.round(Number(betAmount) * 100)
  const potentialWin = Math.round(amountInCents * totalOdds)

  // Place bet
  const placeBet = async () => {
    if (!user?.id || betSlip.length === 0) return
    if (amountInCents < 100) {
      toast.error('Valor mínimo: R$ 1,00')
      return
    }
    if (user.balanceFree < amountInCents) {
      toast.error('Saldo livre insuficiente!')
      return
    }

    setPlacingBet(true)
    try {
      if (betSlip.length === 1) {
        // Single bet
        const item = betSlip[0]
        const result = await betApi.placeBet(
          user.id,
          item.eventId,
          item.eventLabel,
          item.selection,
          item.selectionLabel,
          item.odds,
          amountInCents
        )
        updateUser({ balanceFree: result.newBalanceFree })
      } else {
        // Accumulator bet - place as single bet with combined odds
        const combinedLabel = betSlip.map(i => i.eventLabel).join(' + ')
        const selectionsLabel = betSlip.map(i => i.selectionLabel).join(', ')
        const result = await betApi.placeBet(
          user.id,
          'accumulator-' + Date.now(),
          `📱 ${combinedLabel}`,
          'accumulator',
          `Accumulator: ${selectionsLabel}`,
          Math.round(totalOdds * 100) / 100,
          amountInCents
        )
        updateUser({ balanceFree: result.newBalanceFree })
      }
      toast.success('Aposta realizada com sucesso! 🎉')
      setBetSlip([])
      setBetAmount('10')
      setConfirmDialogOpen(false)
      await fetchBets()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao realizar aposta'
      toast.error(message)
    } finally {
      setPlacingBet(false)
    }
  }

  // Settle a bet (simulate result)
  const settleBet = async (betId: string, result: 'won' | 'lost') => {
    if (!user?.id) return
    setSettlingBet(betId)
    try {
      const res = await betApi.settleBet(betId, result, user.id)
      if (res.newBalanceFree !== undefined) {
        updateUser({ balanceFree: res.newBalanceFree })
      }
      if (result === 'won') {
        toast.success(`Você ganhou ${formatCurrency(res.winnings)}! 🎉`)
      } else {
        toast.info(`Aposta perdida. CashBack: ${formatCurrency(res.cashback || 0)}`)
      }
      await fetchBets()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao resolver aposta'
      toast.error(message)
    } finally {
      setSettlingBet(null)
    }
  }

  // Unique leagues for filter
  const leagues = ['all', ...Array.from(new Set(events.map(e => e.league)))]

  // Filtered events
  const filteredEvents = leagueFilter === 'all'
    ? events
    : events.filter(e => e.league === leagueFilter)

  const liveEvents = filteredEvents.filter(e => e.isLive)
  const upcomingEvents = filteredEvents.filter(e => !e.isLive)

  // Quick amount buttons
  const quickAmounts = [5, 10, 25, 50, 100]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Portal Sport Bet</h2>
          <p className="text-sm text-muted-foreground">Apostas esportivas com CashBack</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
          <Wallet className="h-3 w-3" />
          {formatCurrency(user?.balanceFree || 0)}
        </Badge>
      </div>

      {/* Hero Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 border-0 shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          <CardContent className="p-6 text-white relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-white/15">
                <Trophy className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Portal Sport Bet</h3>
                <p className="text-emerald-200">Aposte com responsabilidade e ganhe CashBack</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-xl font-bold">5%</p>
                <p className="text-[10px] text-emerald-200">CashBack Apostas</p>
              </div>
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-xl font-bold">{liveEvents.length}</p>
                <p className="text-[10px] text-emerald-200">Ao Vivo Agora</p>
              </div>
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-xl font-bold">{events.length}</p>
                <p className="text-[10px] text-emerald-200">Eventos Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bet Slip Floating Card (when items selected) */}
      <AnimatePresence>
        {betSlip.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Card className="shadow-lg border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/30 dark:to-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-600" />
                    Bilhete de Aposta
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                      {betSlip.length} {betSlip.length === 1 ? 'seleção' : 'seleções'}
                    </Badge>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground"
                    onClick={() => setBetSlip([])}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {betSlip.map((item) => (
                  <div key={item.eventId} className="flex items-center justify-between bg-white dark:bg-card rounded-lg p-3 border border-border">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-foreground truncate">{item.eventLabel}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{item.selectionLabel}</Badge>
                        <span className={`text-sm font-bold ${getOddsColor(item.odds)}`}>{item.odds.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground shrink-0"
                      onClick={() => removeFromBetSlip(item.eventId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Odds Total */}
                {betSlip.length > 1 && (
                  <div className="flex items-center justify-between py-2 border-t border-dashed border-border">
                    <span className="text-sm text-muted-foreground">Odds Total</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalOdds.toFixed(2)}</span>
                  </div>
                )}

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Valor da Aposta</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      onClick={() => setBetAmount(String(Math.max(1, Number(betAmount) - 5)))}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="pl-9 text-center font-bold"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      onClick={() => setBetAmount(String(Number(betAmount) + 5))}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {/* Quick amounts */}
                  <div className="flex gap-1.5">
                    {quickAmounts.map(amt => (
                      <Button
                        key={amt}
                        variant={betAmount === String(amt) ? 'default' : 'outline'}
                        size="sm"
                        className={`flex-1 h-7 text-[11px] ${betAmount === String(amt) ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        onClick={() => setBetAmount(String(amt))}
                      >
                        R${amt}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Potential Win */}
                <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Retorno Potencial</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(potentialWin)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Lucro</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(potentialWin - amountInCents)}
                    </p>
                  </div>
                </div>

                {/* Insufficient balance warning */}
                {(user?.balanceFree || 0) < amountInCents && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/30 rounded-lg p-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Saldo livre insuficiente. Você tem {formatCurrency(user?.balanceFree || 0)}</span>
                  </div>
                )}

                {/* Confirm Button */}
                <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                      disabled={(user?.balanceFree || 0) < amountInCents || amountInCents < 100}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar Aposta — {formatCurrency(amountInCents)}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar Aposta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      {betSlip.map((item) => (
                        <div key={item.eventId} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{item.eventLabel}</p>
                            <p className="text-xs text-muted-foreground">{item.selectionLabel} @ {item.odds.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor:</span>
                          <span className="font-bold">{formatCurrency(amountInCents)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Odds:</span>
                          <span className="font-bold text-emerald-600">{totalOdds.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Retorno Potencial:</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(potentialWin)}</span>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={placeBet}
                        disabled={placingBet}
                      >
                        {placingBet ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Confirmar
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* League Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {leagues.map(league => (
          <Button
            key={league}
            variant={leagueFilter === league ? 'default' : 'outline'}
            size="sm"
            className={`h-7 text-[11px] whitespace-nowrap shrink-0 ${leagueFilter === league ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            onClick={() => setLeagueFilter(league)}
          >
            {league === 'all' ? 'Todos' : league}
          </Button>
        ))}
      </div>

      {/* Events Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="live" className="gap-1.5">
            <Activity className="h-3.5 w-3.5 text-red-500" />
            Ao Vivo
            {liveEvents.length > 0 && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] h-5 ml-1">
                {liveEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            Próximos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-muted-foreground text-sm">Carregando eventos...</span>
            </div>
          ) : liveEvents.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum evento ao vivo no momento</p>
                <p className="text-xs text-muted-foreground mt-1">Novos eventos começam em breve</p>
              </CardContent>
            </Card>
          ) : (
            liveEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{event.leagueIcon}</span>
                        <Badge variant="outline" className="text-[10px]">{event.league}</Badge>
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] gap-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                          </span>
                          AO VIVO {event.matchTime}
                        </Badge>
                      </div>
                    </div>
                    {/* Score */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center flex-1">
                        <p className="text-sm font-bold text-foreground">{event.home}</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{event.homeScore ?? 0}</p>
                      </div>
                      <div className="px-3 flex flex-col items-center">
                        <span className="text-xs text-muted-foreground font-medium">VS</span>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-sm font-bold text-foreground">{event.away}</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{event.awayScore ?? 0}</p>
                      </div>
                    </div>
                    {/* Odds Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => addToBetSlip(event.id, `${event.home} vs ${event.away}`, 'home', event.home, event.homeOdds)}
                        className={`rounded-lg p-2.5 text-center border transition-all ${getOddsButtonBg(event.homeOdds, isInBetSlip(event.id, 'home'))}`}
                      >
                        <p className="text-[10px] text-muted-foreground">Casa</p>
                        <p className={`text-sm font-bold ${isInBetSlip(event.id, 'home') ? 'text-white' : getOddsColor(event.homeOdds)}`}>
                          {event.homeOdds.toFixed(2)}
                        </p>
                      </button>
                      <button
                        onClick={() => addToBetSlip(event.id, `${event.home} vs ${event.away}`, 'draw', 'Empate', event.drawOdds)}
                        className={`rounded-lg p-2.5 text-center border transition-all ${getOddsButtonBg(event.drawOdds, isInBetSlip(event.id, 'draw'))}`}
                      >
                        <p className="text-[10px] text-muted-foreground">Empate</p>
                        <p className={`text-sm font-bold ${isInBetSlip(event.id, 'draw') ? 'text-white' : getOddsColor(event.drawOdds)}`}>
                          {event.drawOdds.toFixed(2)}
                        </p>
                      </button>
                      <button
                        onClick={() => addToBetSlip(event.id, `${event.home} vs ${event.away}`, 'away', event.away, event.awayOdds)}
                        className={`rounded-lg p-2.5 text-center border transition-all ${getOddsButtonBg(event.awayOdds, isInBetSlip(event.id, 'away'))}`}
                      >
                        <p className="text-[10px] text-muted-foreground">Fora</p>
                        <p className={`text-sm font-bold ${isInBetSlip(event.id, 'away') ? 'text-white' : getOddsColor(event.awayOdds)}`}>
                          {event.awayOdds.toFixed(2)}
                        </p>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-muted-foreground text-sm">Carregando eventos...</span>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum evento futuro encontrado</p>
              </CardContent>
            </Card>
          ) : (
            upcomingEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{event.leagueIcon}</span>
                        <Badge variant="outline" className="text-[10px]">{event.league}</Badge>
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {event.startTime}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center flex-1">
                        <p className="text-sm font-bold text-foreground">{event.home}</p>
                      </div>
                      <div className="px-3">
                        <span className="text-xs text-muted-foreground font-medium">VS</span>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-sm font-bold text-foreground">{event.away}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => addToBetSlip(event.id, `${event.home} vs ${event.away}`, 'home', event.home, event.homeOdds)}
                        className={`rounded-lg p-2.5 text-center border transition-all ${getOddsButtonBg(event.homeOdds, isInBetSlip(event.id, 'home'))}`}
                      >
                        <p className="text-[10px] text-muted-foreground">Casa</p>
                        <p className={`text-sm font-bold ${isInBetSlip(event.id, 'home') ? 'text-white' : getOddsColor(event.homeOdds)}`}>
                          {event.homeOdds.toFixed(2)}
                        </p>
                      </button>
                      <button
                        onClick={() => addToBetSlip(event.id, `${event.home} vs ${event.away}`, 'draw', 'Empate', event.drawOdds)}
                        className={`rounded-lg p-2.5 text-center border transition-all ${getOddsButtonBg(event.drawOdds, isInBetSlip(event.id, 'draw'))}`}
                      >
                        <p className="text-[10px] text-muted-foreground">Empate</p>
                        <p className={`text-sm font-bold ${isInBetSlip(event.id, 'draw') ? 'text-white' : getOddsColor(event.drawOdds)}`}>
                          {event.drawOdds.toFixed(2)}
                        </p>
                      </button>
                      <button
                        onClick={() => addToBetSlip(event.id, `${event.home} vs ${event.away}`, 'away', event.away, event.awayOdds)}
                        className={`rounded-lg p-2.5 text-center border transition-all ${getOddsButtonBg(event.awayOdds, isInBetSlip(event.id, 'away'))}`}
                      >
                        <p className="text-[10px] text-muted-foreground">Fora</p>
                        <p className={`text-sm font-bold ${isInBetSlip(event.id, 'away') ? 'text-white' : getOddsColor(event.awayOdds)}`}>
                          {event.awayOdds.toFixed(2)}
                        </p>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Bet History */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Histórico de Apostas
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-emerald-600" onClick={fetchBets}>
              <RotateCcw className="h-3 w-3" />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        {/* Stats Row */}
        {betStats && betStats.total > 0 && (
          <div className="grid grid-cols-4 gap-2 px-4 pb-3">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-foreground">{betStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-emerald-600">{betStats.won}</p>
              <p className="text-[10px] text-muted-foreground">Ganhas</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-red-600">{betStats.lost}</p>
              <p className="text-[10px] text-muted-foreground">Perdidas</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-amber-600">{betStats.pending}</p>
              <p className="text-[10px] text-muted-foreground">Pendentes</p>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          {bets.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma aposta realizada ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Selecione odds acima para começar!</p>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto custom-scrollbar">
              {bets.map((bet, i) => (
                <motion.div
                  key={bet.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg shrink-0 ${betIconColor[bet.status] || betIconColor.pending}`}>
                    {bet.status === 'won' ? <Check className="h-4 w-4" /> :
                     bet.status === 'lost' ? <X className="h-4 w-4" /> :
                     <Clock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{bet.eventLabel}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{bet.selectionLabel}</span>
                      <span>·</span>
                      <span className={`font-medium ${getOddsColor(bet.odds)}`}>Odds: {bet.odds.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(bet.amountInCents)}</p>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Badge className={`text-[10px] ${betStatusColor[bet.status] || betStatusColor.pending}`}>
                        {bet.status === 'won' ? `+${formatCurrency(bet.potentialWinInCents)}` : betStatusLabel[bet.status] || bet.status}
                      </Badge>
                      {bet.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-5 w-5 p-0 border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
                            onClick={() => settleBet(bet.id, 'won')}
                            disabled={settlingBet === bet.id}
                            title="Simular Vitória"
                          >
                            {settlingBet === bet.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-5 w-5 p-0 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950/30"
                            onClick={() => settleBet(bet.id, 'lost')}
                            disabled={settlingBet === bet.id}
                            title="Simular Derrota"
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CashBack on Bets Info */}
      <Card className="shadow-sm border-emerald-200 dark:border-emerald-800 bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            CashBack em Apostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center border border-emerald-100 dark:border-emerald-900/50 hover:scale-[1.02] transition-all duration-200">
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">5%</p>
              <p className="text-xs text-muted-foreground mt-1">CashBack em apostas perdidas</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Creditado em até 24h</p>
            </div>
            <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-4 text-center border border-teal-100 dark:border-teal-900/50 hover:scale-[1.02] transition-all duration-200">
              <p className="text-3xl font-bold text-teal-700 dark:text-teal-400">2%</p>
              <p className="text-xs text-muted-foreground mt-1">CashBack extra em apostas ganhas</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Membros Blue 5 Premium</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center border border-amber-100 dark:border-amber-900/50 hover:scale-[1.02] transition-all duration-200">
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">10%</p>
              <p className="text-xs text-muted-foreground mt-1">Bônus em apostas acumuladas</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">4+ seleções no bilhete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsible Gaming */}
      <Card className="shadow-sm border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-300 text-sm">Jogue com Responsabilidade</h4>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">
                Apostas esportivas são destinadas apenas para maiores de 18 anos.
                Defina limites de tempo e dinheiro. Nunca aposte mais do que pode perder.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Autoexclusão disponível</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                  <Phone className="h-3.5 w-3.5" />
                  <span>CVV: 188</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
