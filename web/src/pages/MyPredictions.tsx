import { useQuery } from '@tanstack/react-query'
import { getMyPredictions } from '../api/predictions'
import Countdown from '../components/Countdown'

export default function MyPredictions() {
  const { data: predictions } = useQuery({
    queryKey: ['my-predictions'],
    queryFn: getMyPredictions,
    refetchInterval: 30_000,
  })

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Mis Pronósticos</h1>
      <div className="grid gap-2">
        {predictions?.map(p => {
          const crTime = new Date(p.kickoff_utc).toLocaleString('es-CR', {
            timeZone: 'America/Costa_Rica',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
          return (
            <div key={p.id} className="bg-surface-card border border-surface-border rounded-lg px-4 py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-muted text-xs w-20">{crTime}</span>
                <span className="font-medium">{p.home_team}</span>
                <span className="font-mono font-bold text-gold">{p.home_score_pred} - {p.away_score_pred}</span>
                <span className="font-medium">{p.away_team}</span>
              </div>
              <div className="flex items-center gap-3">
                {p.locked && !p.points_earned && <span className="text-xs text-error">CERRADO</span>}
                {p.points_earned !== null && (
                  <span className={`text-xs font-mono ${p.points_earned === 5 ? 'text-gold' : 'text-muted'}`}>
                    +{p.points_earned} pts
                  </span>
                )}
                <Countdown targetUTC={new Date(new Date(p.kickoff_utc).getTime() - 15 * 60 * 1000).toISOString()} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
