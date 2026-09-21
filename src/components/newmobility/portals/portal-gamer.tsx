'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
import {
  Gamepad2, Trophy, Coins, Users, Swords, Star, Target,
  Flame, Medal, Gift, Clock, Play, ChevronRight, Sparkles, Zap
} from 'lucide-react'
import { motion } from 'framer-motion'

const tournaments = [
  { name: 'Arena NewMobility S4', game: 'Quiz Multiplayer', players: 128, prize: formatCurrency(50000), status: 'active', timeLeft: '2h 30min' },
  { name: 'Torneio Rápido Diário', game: 'Memory Game', players: 64, prize: formatCurrency(15000), status: 'starting', timeLeft: 'Começa em 15min' },
  { name: 'Campeonato Semanal', game: 'Trivia Geral', players: 256, prize: formatCurrency(100000), status: 'upcoming', timeLeft: 'Início: Sáb 14h' },
]

const leaderboard = [
  { rank: 1, name: 'Victor Hugo', points: 12450, badge: '🥇' },
  { rank: 2, name: 'Juliana Mars', points: 11200, badge: '🥈' },
  { rank: 3, name: 'Rafael Nunes', points: 10800, badge: '🥉' },
  { rank: 4, name: 'Você', points: 8450, badge: '', isMe: true },
  { rank: 5, name: 'Camila Dias', points: 7900, badge: '' },
]

const rewards = [
  { name: 'CashBack R$10', cost: 500, icon: Coins, available: true },
  { name: 'Voucher Mobilidade', cost: 800, icon: Gift, available: true },
  { name: 'Skin Exclusiva', cost: 1200, icon: Star, available: false },
  { name: 'CashBack R$50', cost: 2500, icon: Coins, available: true },
]

const achievements = [
  { name: 'Primeira Vitória', desc: 'Vença seu primeiro jogo', icon: Trophy, earned: true },
  { name: 'Conquistador', desc: 'Vença 10 torneios', icon: Medal, earned: true },
  { name: 'Social', desc: 'Convide 5 amigos para jogar', icon: Users, earned: false },
  { name: 'Dedicação', desc: 'Jogue 30 dias seguidos', icon: Flame, earned: false },
  { name: 'Colecionador', desc: 'Resgate 10 recompensas', icon: Gift, earned: true },
  { name: 'Mestre', desc: 'Alcance o top 10 no ranking', icon: Target, earned: false },
]

const gameStats = [
  { label: 'Partidas Jogadas', value: '247', icon: Play, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', gradient: 'from-emerald-500 to-emerald-600' },
  { label: 'Vitórias', value: '183', icon: Trophy, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', gradient: 'from-amber-500 to-amber-600' },
  { label: 'Taxa de Vitória', value: '74%', icon: Target, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', gradient: 'from-blue-500 to-blue-600' },
  { label: 'Sequência Atual', value: '5 dias', icon: Flame, color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400', gradient: 'from-rose-500 to-rose-600' },
]

export function PortalGamer() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Portal Gamer</h2>
        <p className="text-sm text-muted-foreground">Jogos, torneios e recompensas</p>
      </div>

      {/* Hero Banner with gradient overlay */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 animate-gradient-shift border-0 shadow-lg overflow-hidden relative">
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "url(\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9zdmc+\")"
          }} />
          <div className="absolute inset-0 animate-shimmer" />
          {/* Coming Soon badge */}
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-amber-500/90 text-white text-[10px] font-bold px-2.5 py-1 border-0 shadow-md animate-bounce-subtle">
              <Sparkles className="h-3 w-3 mr-1" />
              EM BREVE
            </Badge>
          </div>
          <CardContent className="p-6 text-white relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-white/15">
                <Gamepad2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Portal Gamer</h3>
                <p className="text-purple-200">Jogue, compita e ganhe recompensas</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-xl font-bold">2.450</p>
                <p className="text-[10px] text-purple-200">Moedas</p>
              </div>
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-xl font-bold">#42</p>
                <p className="text-[10px] text-purple-200">Ranking</p>
              </div>
              <div className="bg-white/15 rounded-lg px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-xl font-bold">5/8</p>
                <p className="text-[10px] text-purple-200">Missões Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Game Stats with hover scale */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {gameStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-sm bg-card hover:shadow-md hover:scale-[1.02] transition-all duration-200 group card-hover-lift">
              <CardContent className="p-4">
                <div className={`p-1.5 rounded-lg ${stat.color} w-fit mb-2 group-hover:scale-105 transition-transform`}>
                  <stat.icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tournaments - Enhanced cards */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Swords className="h-4 w-4 text-purple-600" />
            Torneios
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px]">Em Breve</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tournaments.map((tournament, i) => (
            <motion.div
              key={tournament.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-muted/50 rounded-lg p-4 flex items-center gap-3 border border-border hover:border-purple-200 dark:hover:border-purple-800 hover:scale-[1.01] transition-all duration-200"
            >
              <div className={`p-2.5 rounded-lg ${
                tournament.status === 'active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                tournament.status === 'starting' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                <Swords className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">{tournament.name}</h4>
                  {tournament.status === 'active' && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      AO VIVO
                    </Badge>
                  )}
                  {tournament.status === 'starting' && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                      EM BREVE
                    </Badge>
                  )}
                  {tournament.status === 'upcoming' && (
                    <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px]">
                      Em Breve
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{tournament.game}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{tournament.players}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{tournament.timeLeft}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{tournament.prize}</p>
                <Button variant="outline" size="sm" className="h-7 text-xs mt-1 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30">
                  {tournament.status === 'active' ? 'Assistir' : 'Inscrever-se'}
                </Button>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" />
            Ranking
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {leaderboard.map((player, i) => (
              <motion.div
                key={player.rank}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 px-4 py-3 ${
                  player.isMe ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'hover:bg-muted/50'
                } transition-colors`}
              >
                <span className="text-lg w-8 text-center font-bold text-muted-foreground">{player.badge || `#${player.rank}`}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${player.isMe ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                    {player.name} {player.isMe && '(você)'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold text-foreground">{player.points.toLocaleString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rewards Shop */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Gift className="h-4 w-4 text-purple-600" />
              Loja de Recompensas
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px]">Em Breve</Badge>
            </CardTitle>
            <div className="flex items-center gap-1 text-sm">
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="font-bold text-foreground">2.450</span>
              <span className="text-xs text-muted-foreground">moedas</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {rewards.map((reward, i) => {
              const Icon = reward.icon
              return (
                <motion.div
                  key={reward.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-lg p-3 text-center ${!reward.available ? 'opacity-50' : ''} bg-muted/50 border border-border hover:border-purple-200 dark:hover:border-purple-800 hover:scale-[1.02] transition-all duration-200 relative`}
                >
                  {!reward.available && (
                    <div className="absolute top-1 right-1">
                      <Badge className="bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-[8px] px-1 py-0 border-0">Em Breve</Badge>
                    </div>
                  )}
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 w-fit mx-auto mb-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-foreground">{reward.name}</p>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">{reward.cost} moedas</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-6 text-[10px] w-full border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    disabled={!reward.available}
                  >
                    Resgatar
                  </Button>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Medal className="h-4 w-4 text-purple-600" />
            Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((ach, i) => {
              const Icon = ach.icon
              return (
                <motion.div
                  key={ach.name}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-lg p-3 border ${ach.earned ? 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800' : 'bg-muted/50 border-border opacity-60'} hover:scale-[1.02] transition-all duration-200`}
                >
                  <div className={`p-1.5 rounded-lg w-fit mb-2 ${
                    ach.earned ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold text-foreground">{ach.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ach.desc}</p>
                  {!ach.earned && (
                    <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[8px] mt-1">Em Breve</Badge>
                  )}
                  {ach.earned && <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] mt-1">Conquistado</Badge>}
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
