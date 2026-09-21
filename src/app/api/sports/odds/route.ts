import { NextResponse } from 'next/server'

// Seeded pseudo-random for consistent odds per request cycle
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

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

const BASE_EVENTS: Omit<SportEvent, 'homeOdds' | 'drawOdds' | 'awayOdds' | 'matchTime' | 'homeScore' | 'awayScore'>[] = [
  // Brasileirão Série A
  { id: 'bra-1', home: 'São Paulo FC', away: 'Corinthians', league: 'Brasileirão Série A', leagueIcon: '🇧🇷', isLive: true },
  { id: 'bra-2', home: 'Flamengo', away: 'Palmeiras', league: 'Brasileirão Série A', leagueIcon: '🇧🇷', isLive: true },
  { id: 'bra-3', home: 'Grêmio', away: 'Internacional', league: 'Brasileirão Série A', leagueIcon: '🇧🇷', isLive: true },
  { id: 'bra-4', home: 'Botafogo', away: 'Vasco da Gama', league: 'Brasileirão Série A', leagueIcon: '🇧🇷', isLive: false, startTime: 'Hoje 19h00' },
  { id: 'bra-5', home: 'Atlético MG', away: 'Cruzeiro', league: 'Brasileirão Série A', leagueIcon: '🇧🇷', isLive: false, startTime: 'Hoje 21h30' },
  { id: 'bra-6', home: 'Fluminense', away: 'Santos', league: 'Brasileirão Série A', leagueIcon: '🇧🇷', isLive: false, startTime: 'Amanhã 16h00' },
  { id: 'bra-7', home: 'Fortaleza', away: 'Bahia', league: 'Brasileirão Série A', leagueIcon: '🇧🇷', isLive: false, startTime: 'Amanhã 19h00' },
  // Copa do Brasil
  { id: 'copa-1', home: 'Flamengo', away: 'Atlético MG', league: 'Copa do Brasil', leagueIcon: '🏆', isLive: false, startTime: 'Quarta 21h30' },
  { id: 'copa-2', home: 'Palmeiras', away: 'Grêmio', league: 'Copa do Brasil', leagueIcon: '🏆', isLive: false, startTime: 'Quinta 21h30' },
  // Libertadores
  { id: 'lib-1', home: 'River Plate', away: 'Fluminense', league: 'Libertadores', leagueIcon: '🌎', isLive: false, startTime: 'Terça 21h00' },
  { id: 'lib-2', home: 'Boca Juniors', away: 'Palmeiras', league: 'Libertadores', leagueIcon: '🌎', isLive: false, startTime: 'Quarta 19h00' },
  // Champions League
  { id: 'ucl-1', home: 'Real Madrid', away: 'Man City', league: 'Champions League', leagueIcon: '⭐', isLive: false, startTime: 'Terça 16h00' },
  { id: 'ucl-2', home: 'Barcelona', away: 'PSG', league: 'Champions League', leagueIcon: '⭐', isLive: false, startTime: 'Quarta 16h00' },
  { id: 'ucl-3', home: 'Bayern Munich', away: 'Inter Milan', league: 'Champions League', leagueIcon: '⭐', isLive: false, startTime: 'Terça 13h45' },
  // Premier League
  { id: 'epl-1', home: 'Liverpool', away: 'Arsenal', league: 'Premier League', leagueIcon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', isLive: false, startTime: 'Sábado 13h30' },
  { id: 'epl-2', home: 'Man United', away: 'Chelsea', league: 'Premier League', leagueIcon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', isLive: false, startTime: 'Domingo 12h00' },
  // La Liga
  { id: 'liga-1', home: 'Real Madrid', away: 'Atlético Madrid', league: 'La Liga', leagueIcon: '🇪🇸', isLive: false, startTime: 'Sábado 16h00' },
  { id: 'liga-2', home: 'Barcelona', away: 'Sevilla', league: 'La Liga', leagueIcon: '🇪🇸', isLive: false, startTime: 'Domingo 16h00' },
  // Eliminatórias
  { id: 'elim-1', home: 'Brasil', away: 'Argentina', league: 'Eliminatórias Copa', leagueIcon: '🌍', isLive: false, startTime: '25 Mar 21h30' },
  { id: 'elim-2', home: 'Uruguai', away: 'Colômbia', league: 'Eliminatórias Copa', leagueIcon: '🌍', isLive: false, startTime: '25 Mar 18h00' },
]

// Generate realistic odds with slight variations per time cycle
function generateOdds(baseHome: number, seed: number): { homeOdds: number; drawOdds: number; awayOdds: number } {
  const variation = (seededRandom(seed) - 0.5) * 0.3
  const homeOdds = Math.round((baseHome + variation) * 100) / 100
  const drawOdds = Math.round((3.10 + seededRandom(seed + 1) * 0.6) * 100) / 100
  const awayOdds = Math.round((1 / (1 / homeOdds - 1 / drawOdds) + (seededRandom(seed + 2) - 0.5) * 0.2) * 100) / 100
  return {
    homeOdds: Math.max(1.10, homeOdds),
    drawOdds: Math.max(2.00, drawOdds),
    awayOdds: Math.max(1.20, awayOdds),
  }
}

function generateMatchTime(seed: number): string {
  const minutes = Math.floor(seededRandom(seed) * 85) + 5
  return `${minutes}'`
}

function generateScore(seed: number): { home: number; away: number } {
  const home = Math.floor(seededRandom(seed) * 3)
  const away = Math.floor(seededRandom(seed + 1) * 2)
  return { home, away }
}

// Base odds for home team (lower = stronger at home)
const BASE_HOME_ODDS: Record<string, number> = {
  'bra-1': 2.10, 'bra-2': 1.85, 'bra-3': 2.25,
  'bra-4': 1.95, 'bra-5': 2.30, 'bra-6': 1.70,
  'bra-7': 1.65,
  'copa-1': 2.00, 'copa-2': 1.90,
  'lib-1': 2.15, 'lib-2': 2.40,
  'ucl-1': 2.05, 'ucl-2': 1.80, 'ucl-3': 1.75,
  'epl-1': 1.95, 'epl-2': 2.10,
  'liga-1': 1.85, 'liga-2': 1.50,
  'elim-1': 2.20, 'elim-2': 1.90,
}

export async function GET() {
  const now = Date.now()
  // Regenerate every 5 minutes (odds shift slightly)
  const cycleKey = Math.floor(now / (5 * 60 * 1000))

  const events: SportEvent[] = BASE_EVENTS.map((evt, idx) => {
    const seed = cycleKey * 100 + idx
    const odds = generateOdds(BASE_HOME_ODDS[evt.id] || 2.0, seed)

    const result: SportEvent = {
      ...evt,
      homeOdds: odds.homeOdds,
      drawOdds: odds.drawOdds,
      awayOdds: odds.awayOdds,
      matchTime: '',
    }

    if (evt.isLive) {
      result.matchTime = generateMatchTime(seed + 50)
      const score = generateScore(seed + 60)
      result.homeScore = score.home
      result.awayScore = score.away
    }

    return result
  })

  // Sort: live first, then upcoming
  events.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1
    if (!a.isLive && b.isLive) return 1
    return 0
  })

  return NextResponse.json({
    events,
    generatedAt: new Date().toISOString(),
    nextUpdate: new Date(now + 5 * 60 * 1000).toISOString(),
  })
}
