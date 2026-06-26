import { useQuery } from '@tanstack/react-query'
import { getKnockoutLeaderboard } from '../api/knockout'
import { PlayerTeamName } from '../components/TeamFlag'

export default function KnockoutLeaderboard() {
  const { data: entries, isLoading, isError } = useQuery({
    queryKey: ['knockout-leaderboard'],
    queryFn: getKnockoutLeaderboard,
    refetchInterval: 30_000,
  })

  const rankMedal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
        <p className="text-error text-sm">Error al cargar la tabla de eliminatorias</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-1">KO Leaderboard</h1>
      <p className="text-xs text-muted mb-4">Puntos de eliminatorias solamente</p>

      {!entries?.length ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-muted text-sm">No hay puntos de eliminatorias aún</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-muted text-xs">
                <th className="text-left py-2 pr-2">#</th>
                <th className="text-left py-2 pr-2">Jugador</th>
                <th className="text-right py-2 pr-2">Pts</th>
                <th className="text-right py-2 pr-2">Gol Pts</th>
                <th className="text-right py-2 pr-2">Exactos</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.user_id} className="border-b border-surface-border/50 hover:bg-surface/50 transition-colors">
                  <td className="py-2 pr-2 font-mono text-xs">{rankMedal(i + 1)}</td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <PlayerTeamName name={e.player_team_name} verified={e.is_verified} disabled={e.is_disabled} />
                      {e.league_name && (
                        <span className="text-[10px] text-muted bg-surface px-1.5 py-0.5 rounded">{e.league_name}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-right font-mono font-bold text-gold">{e.total_points}</td>
                  <td className="py-2 pr-2 text-right font-mono text-muted">{e.total_goal_pts}</td>
                  <td className="py-2 pr-2 text-right font-mono text-muted">{e.exact_hits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
