import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTodayTicker } from '../api/ticker'
import { getBannerMessages } from '../api/banner'
import { teamColors } from '../lib/teamColors'

type TickerGame = {
  kind: 'game'
  id: string | number
  status: string
  liveGoal: boolean
  homeTeam: string
  awayTeam: string
  details: string
  group: string
}

type TickerFallback = {
  kind: 'fallback'
  id: string | number
  status: string
  text: string
}

type TickerItem = TickerGame | TickerFallback

function itemClass(status: string) {
  if (status === 'En juego') return 'tick-down'
  if (status === 'Finalizado') return 'tick-flat'
  return 'tick-up'
}

function buildItems(games: Awaited<ReturnType<typeof getTodayTicker>>): TickerItem[] {
  return games.map(game => {
    const kickoff = new Date(game.kickoff).toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      hour: '2-digit',
      minute: '2-digit',
    })
    const score = `${game.home_score}-${game.away_score}`
    const details =
      game.status === 'Programado'
        ? kickoff
        : game.status === 'En juego' && game.time_elapsed && game.time_elapsed !== 'notstarted'
          ? `${score} ${game.time_elapsed.toUpperCase()}`
          : score
    const hasGoal = Number(game.home_score) > 0 || Number(game.away_score) > 0
    return {
      kind: 'game' as const,
      id: game.id,
      status: game.status,
      liveGoal: game.status === 'En juego' && hasGoal,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      details,
      group: game.group,
    }
  })
}

const FALLBACK_ITEMS: TickerItem[] = [
  { kind: 'fallback', id: 'f1', text: 'QUINI26 — PREDICCIÓN MUNDIAL 2026', status: 'flat' },
  { kind: 'fallback', id: 'f2', text: '72 PARTIDOS — FASE DE GRUPOS', status: 'flat' },
  { kind: 'fallback', id: 'f3', text: '11 JUNIO — 28 JUNIO 2026', status: 'flat' },
  { kind: 'fallback', id: 'f4', text: '¡HACE TUS PRONÓSTICOS!', status: 'up' },
]

function TickerSpan({ item }: { item: TickerItem }) {
  const dot =
    item.status === 'En juego' ? 'bg-error' : item.status === 'Finalizado' ? 'bg-gold' : 'bg-green-500'
  return (
    <span className={`ticker-led-text inline-flex items-center gap-3 px-6 text-sm uppercase ${itemClass(item.status)}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {item.kind === 'game' ? (
        <span>
          <span className="font-bold" style={{ color: teamColors[item.homeTeam] ?? '#fff' }}>
            {item.homeTeam}
          </span>
          <span className="mx-1">/</span>
          <span className="font-bold" style={{ color: teamColors[item.awayTeam] ?? '#fff' }}>
            {item.awayTeam}
          </span>
          <span className="ml-2">{item.details} {item.status.toUpperCase()} GRUPO {item.group}</span>
        </span>
      ) : (
        <span>{item.text}</span>
      )}
    </span>
  )
}

export default function GameTicker() {
  const prevScores = useRef<Record<string, string>>({})
  const { data: games = [] } = useQuery({
    queryKey: ['ticker', 'today'],
    queryFn: getTodayTicker,
    refetchInterval: 60_000,
  })
  const { data: banners = [] } = useQuery({
    queryKey: ['banner'],
    queryFn: getBannerMessages,
    refetchInterval: 60_000,
  })

  const rawItems = games.length > 0 ? buildItems(games) : []

  const newGoal = (() => {
    for (const game of games) {
      const key = game.id
      const cur = `${game.home_score}-${game.away_score}`
      const prev = prevScores.current[key]
      if (prev && cur !== prev) {
        prevScores.current[key] = cur
        return true
      }
      if (!prev) {
        prevScores.current[key] = cur
      }
    }
    return false
  })()

  const bannerItems: TickerItem[] = banners.map(b => ({
    kind: 'fallback' as const,
    id: `banner-${b.id}`,
    text: b.message,
    status: 'flat' as const,
  }))

  const allItems = bannerItems.length > 0
    ? [...bannerItems, ...rawItems]
    : rawItems.length > 0 ? rawItems : FALLBACK_ITEMS

  const ambientRows = allItems.slice(0, 6).map(i => (i.kind === 'game' ? `${i.homeTeam}/${i.awayTeam} ${i.details} ${i.status} GRUPO ${i.group}` : i.text))

  return (
    <div className="ticker-board border-b border-surface-border overflow-hidden">
      <div className="ticker-ambient-bg" aria-hidden="true">
        {[...ambientRows, ...ambientRows, ...ambientRows].map((row, index) => (
          <div key={`${row}-${index}`}>{row}</div>
        ))}
      </div>
      <div className="ticker-wrap py-2">
        <div className="ticker-track">
          {newGoal && (
            <span className="ticker-goal-chant inline-flex items-center px-6 text-sm uppercase">
              CANTALOOOOOOOOO!!! CANTALOOOOOOOOO!!!
            </span>
          )}
          {allItems.map(item => <TickerSpan key={`${item.id}-0`} item={item} />)}
          {allItems.map(item => <TickerSpan key={`${item.id}-1`} item={item} />)}
          {allItems.map(item => <TickerSpan key={`${item.id}-2`} item={item} />)}
        </div>
      </div>
    </div>
  )
}
