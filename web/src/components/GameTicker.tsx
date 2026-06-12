import { useQuery } from '@tanstack/react-query'
import { getTodayTicker } from '../api/ticker'

type TickerItem = {
  id: string | number
  text: string
  status: string
  liveGoal?: boolean
}

function itemClass(status: string) {
  if (status === 'En juego') return 'tick-down'
  if (status === 'Finalizado') return 'tick-flat'
  return 'tick-up'
}

function teamCode(name: string) {
  return name
    .split(/\s+/)
    .map(part => part[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase()
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
      id: game.id,
      status: game.status,
      liveGoal: game.status === 'En juego' && hasGoal,
      text: `${teamCode(game.home_team)}/${teamCode(game.away_team)} ${details} ${game.status.toUpperCase()} G${game.group}`,
    }
  })
}

const FALLBACK_ITEMS: TickerItem[] = [
  { id: 'f1', text: 'QUINI26 — PREDICCIÓN MUNDIAL 2026', status: 'flat' },
  { id: 'f2', text: '72 PARTIDOS — FASE DE GRUPOS', status: 'flat' },
  { id: 'f3', text: '11 JUNIO — 28 JUNIO 2026', status: 'flat' },
  { id: 'f4', text: '¡HACE TUS PRONÓSTICOS!', status: 'up' },
]

function TickerSpan({ item }: { item: TickerItem }) {
  const dot =
    item.status === 'En juego' ? 'bg-error' : item.status === 'Finalizado' ? 'bg-gold' : 'bg-green-500'
  return (
    <span className={`ticker-led-text inline-flex items-center gap-3 px-6 text-sm uppercase ${itemClass(item.status)}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      <span>{item.text}</span>
    </span>
  )
}

export default function GameTicker() {
  const { data: games = [] } = useQuery({
    queryKey: ['ticker', 'today'],
    queryFn: getTodayTicker,
    refetchInterval: 60_000,
  })

  const rawItems = games.length > 0 ? buildItems(games) : []
  const hasLiveGoal = rawItems.some(i => i.liveGoal)
  const allItems = rawItems.length > 0 ? rawItems : FALLBACK_ITEMS

  const ambientRows = allItems.slice(0, 6).map(i => i.text)

  return (
    <div className="ticker-board border-b border-surface-border overflow-hidden">
      <div className="ticker-ambient-bg" aria-hidden="true">
        {[...ambientRows, ...ambientRows, ...ambientRows].map((row, index) => (
          <div key={`${row}-${index}`}>{row}</div>
        ))}
      </div>
      <div className="ticker-wrap py-2">
        <div className="ticker-track">
          {hasLiveGoal && (
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
