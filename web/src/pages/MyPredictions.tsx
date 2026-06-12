import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyPredictions } from '../api/predictions'
import Countdown from '../components/Countdown'
import { TeamName } from '../components/TeamFlag'

type Tab = 'upcoming' | 'previous'

export default function MyPredictions() {
  const [tab, setTab] = useState<Tab>('upcoming')

  const { data: predictions, isLoading, isError } = useQuery({
    queryKey: ['my-predictions'],
    queryFn: getMyPredictions,
    refetchInterval: 30_000,
  })

  const upcoming = predictions?.filter(p => p.points_earned === null) ?? []
  const previous = predictions?.filter(p => p.points_earned !== null) ?? []

  if (isLoading) {
    return (
      <div>
        <h1 className="text-lg font-bold mb-4">Mis Pronósticos</h1>
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <h1 className="text-lg font-bold mb-4">Mis Pronósticos</h1>
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-error text-sm">Error al cargar tus pronósticos</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Mis Pronósticos</h1>
      </div>

      <div className="flex bg-surface-card border border-surface-border rounded-lg overflow-hidden mb-4 w-fit">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${tab === 'upcoming' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
        >
          Próximos
        </button>
        <button
          onClick={() => setTab('previous')}
          className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${tab === 'previous' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
        >
          Anteriores
        </button>
      </div>

      {tab === 'upcoming' ? (
        !upcoming.length ? (
          <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
            <p className="text-muted text-sm">No tienes pronósticos pendientes.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {upcoming.map(p => {
              const crTime = new Date(p.kickoff_utc).toLocaleString('es-CR', {
                timeZone: 'America/Costa_Rica',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <div key={p.id} className="bg-surface-card border border-surface-border rounded-lg px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted text-xs shrink-0 w-16">{crTime}</span>
                      <span className="font-medium min-w-0"><TeamName name={p.home_team} /></span>
                      <span className="font-mono font-bold text-gold shrink-0">{p.home_score_pred}–{p.away_score_pred}</span>
                      <span className="font-medium min-w-0"><TeamName name={p.away_team} /></span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.locked && <span className="text-xs text-error">CERRADO</span>}
                      <Countdown targetUTC={new Date(new Date(p.kickoff_utc).getTime() - 15 * 60 * 1000).toISOString()} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        !previous.length ? (
          <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
            <p className="text-muted text-sm">Aún no hay pronósticos evaluados.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {previous.map(p => {
              const crTime = new Date(p.kickoff_utc).toLocaleString('es-CR', {
                timeZone: 'America/Costa_Rica',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
              const actual = p.home_score !== null && p.away_score !== null ? `${p.home_score}–${p.away_score}` : '–'
              const predicted = `${p.home_score_pred}–${p.away_score_pred}`
              return (
                <div key={p.id} className="bg-surface-card border border-surface-border rounded-lg px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted text-xs shrink-0 w-16">{crTime}</span>
                      <span className="font-medium min-w-0"><TeamName name={p.home_team} /></span>
                      <span className="font-mono shrink-0 text-muted line-through">{predicted}</span>
                      <span className="font-mono font-bold text-white shrink-0">{actual}</span>
                      <span className="font-medium min-w-0"><TeamName name={p.away_team} /></span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.points_earned !== null && (
                        <span className={`text-xs font-mono ${p.points_earned === 5 ? 'text-gold' : 'text-muted'}`}>
                          +{p.points_earned} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
