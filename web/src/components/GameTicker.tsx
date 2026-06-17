import { useRef, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTodayTicker } from '../api/ticker'
import { getBannerMessages } from '../api/banner'
import { request } from '../api/client'

type TickerGame = {
  kind: 'game'
  id: string | number
  status: string
  liveGoal: boolean
  homeTeam: string
  awayTeam: string
  details: string
  group: string
  score: string
  timeLabel: string
  justScored: boolean
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

function buildItems(games: Awaited<ReturnType<typeof getTodayTicker>>, justScoredSet: Set<string | number> = new Set()): TickerItem[] {
  return games.map(game => {
    const kickoff = new Date(game.kickoff).toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      hour: '2-digit',
      minute: '2-digit',
    })
    const score = `${game.home_score}-${game.away_score}`
    const isLive = game.status === 'En juego' && game.time_elapsed && game.time_elapsed !== 'notstarted'
    const details =
      game.status === 'Programado'
        ? kickoff
        : isLive
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
      score: game.status === 'Programado' ? '' : score,
      timeLabel: isLive ? game.time_elapsed.toUpperCase() : '',
      justScored: justScoredSet.has(game.id),
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
        <span className="text-green-500">
          {item.status === 'Programado' ? (
            <>
              <span className="font-bold">{item.homeTeam}</span>
              <span className="mx-1">/</span>
              <span className="font-bold text-red-500">{item.awayTeam}</span>
              {item.score && (
                <span className={`ml-2 text-orange-500 ${item.kind === 'game' && item.justScored ? 'goal-flash' : ''}`}>
                  {item.score}
                </span>
              )}
              {item.timeLabel && <span className="ml-1">{item.timeLabel}</span>}
              {item.status === 'Programado' && <span className="ml-2">{item.details}</span>}
            </>
          ) : (
            <>
              <span className="font-bold">{item.homeTeam}</span>
              <span className="mx-1">:</span>
              {item.score && (
                <span className={`text-orange-500 ${item.kind === 'game' && item.justScored ? 'goal-flash' : ''}`}>
                  {item.score}
                </span>
              )}
              <span className="mx-1">:</span>
              <span className="font-bold text-red-500">{item.awayTeam}</span>
              {item.timeLabel && <span className="ml-1">{item.timeLabel}</span>}
            </>
          )}
          <span className="ml-2">{item.status.toUpperCase()} GRUPO {item.group}</span>
        </span>
      ) : (
        <span>{item.text}</span>
      )}
    </span>
  )
}

export default function GameTicker() {
  const prevScores = useRef<Record<string, string>>({})
  const goalFlashIds = useRef<Set<string | number>>(new Set())
  const [, forceRender] = useState(0)
  const [chantActive, setChantActive] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // Speed from DB settings > localStorage > default 640
  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => request<Record<string, string>>('/public/settings'),
    staleTime: 60_000,
  })
  const dbSpeed = publicSettings?.ticker_speed ? parseInt(publicSettings.ticker_speed, 10) : null

  useEffect(() => {
    const applySpeed = (s?: number) => {
      const speed = s ?? (() => {
        if (dbSpeed && dbSpeed >= 38 && dbSpeed <= 3600) return dbSpeed
        const v = localStorage.getItem('ticker_speed')
        if (v) { const n = parseInt(v, 10); if (!isNaN(n) && n >= 38 && n <= 3600) return n }
        return 640
      })()
      if (trackRef.current) {
        trackRef.current.style.animationDuration = `${speed}s`
      }
    }
    applySpeed()
    const handler = (e: Event) => applySpeed((e as CustomEvent).detail)
    window.addEventListener('opencode-speed', handler)
    return () => window.removeEventListener('opencode-speed', handler)
  }, [dbSpeed])

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

  // Detect new goals
  useEffect(() => {
    const newScored = new Set<string | number>()
    for (const game of games) {
      const key = game.id
      const cur = `${game.home_score}-${game.away_score}`
      const prev = prevScores.current[key]
      if (prev && cur !== prev) {
        newScored.add(key)
      }
      prevScores.current[key] = cur
    }
    if (newScored.size > 0) {
      goalFlashIds.current = newScored
      forceRender(n => n + 1)
      setTimeout(() => {
        goalFlashIds.current = new Set()
        forceRender(n => n + 1)
      }, 3000)
    }
  }, [games])

  // Listen for manual goal trigger from admin
  useEffect(() => {
    const handler = () => {
      const scoredIds = new Set<string | number>()
      for (const game of games) {
        if (game.status !== 'Programado') {
          scoredIds.add(game.id)
        }
      }
      goalFlashIds.current = scoredIds
      setChantActive(true)
      forceRender(n => n + 1)
      setTimeout(() => {
        goalFlashIds.current = new Set()
        setChantActive(false)
        forceRender(n => n + 1)
      }, 3000)
    }
    window.addEventListener('opencode-goal', handler)
    return () => window.removeEventListener('opencode-goal', handler)
  }, [games])

  const rawItems = games.length > 0 ? buildItems(games, goalFlashIds.current) : []

  const bannerItems: TickerItem[] = banners.map(b => ({
    kind: 'fallback' as const,
    id: `banner-${b.id}`,
    text: b.message,
    status: 'flat' as const,
  }))

  const allItems = bannerItems.length > 0
    ? [...bannerItems, ...rawItems]
    : rawItems.length > 0 ? rawItems : FALLBACK_ITEMS

  const chantItem = (goalFlashIds.current.size > 0 || chantActive) ? (
    <span className="ticker-goal-chant inline-flex items-center px-6 text-sm uppercase">
      CANTALOOOOOOOOO!!! CANTALOOOOOOOOO!!!
    </span>
  ) : null

  const ambientRows = allItems.slice(0, 6).map(i => (i.kind === 'game' ? `${i.homeTeam}/${i.awayTeam} ${i.details} ${i.status} GRUPO ${i.group}` : i.text))

  return (
    <div className="ticker-board border-b border-surface-border overflow-hidden">
      <div className="ticker-ambient-bg" aria-hidden="true">
        {[...ambientRows, ...ambientRows, ...ambientRows].map((row, index) => (
          <div key={`${row}-${index}`}>{row}</div>
        ))}
      </div>
      <div className="ticker-wrap py-2">
        <div className="ticker-track" ref={trackRef}>
          {allItems.map(item => <TickerSpan key={`${item.id}-0`} item={item} />)}
          {chantItem}
          {allItems.map(item => <TickerSpan key={`${item.id}-1`} item={item} />)}
          {chantItem}
          {allItems.map(item => <TickerSpan key={`${item.id}-2`} item={item} />)}
          {chantItem}
        </div>
      </div>
    </div>
  )
}
