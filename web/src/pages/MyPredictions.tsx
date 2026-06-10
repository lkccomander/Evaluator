import { useQuery } from '@tanstack/react-query'
import { getMyPredictions } from '../api/predictions'
import Countdown from '../components/Countdown'
import { TeamName } from '../components/TeamFlag'

export default function MyPredictions() {
  const { data: predictions, isLoading, isError } = useQuery({
    queryKey: ['my-predictions'],
    queryFn: getMyPredictions,
    refetchInterval: 30_000,
  })

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
      <h1 className="text-lg font-bold mb-4">Mis Pronósticos</h1>
      {!predictions?.length ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-muted text-sm">Aún no tienes pronósticos. Ve a la página de Partidos para hacer tus picks.</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-border">
          {predictions.map(p => {
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
                    {p.locked && !p.points_earned && <span className="text-xs text-error">CERRADO</span>}
                    {p.points_earned !== null && (
                      <span className={`text-xs font-mono ${p.points_earned === 5 ? 'text-gold' : 'text-muted'}`}>
                        +{p.points_earned} pts
                      </span>
                    )}
                    <Countdown targetUTC={new Date(new Date(p.kickoff_utc).getTime() - 15 * 60 * 1000).toISOString()} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
