import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getMyKnockoutLeaderboard, getKnockoutLeaderboard, getKnockoutLeaderboardByLeague } from '../api/knockout'
import { listLeagues } from '../api/leagues'
import { PlayerTeamName } from '../components/TeamFlag'

export default function KnockoutLeaderboard() {
  const { user, isAdmin } = useAuth()
  const [view, setView] = useState<'my' | 'league'>(isAdmin ? 'league' : 'my')
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')

  const { data: myEntries, isLoading: myLoading, isError: myError } = useQuery({
    queryKey: ['knockout-leaderboard', 'mine'],
    queryFn: getMyKnockoutLeaderboard,
    enabled: !isAdmin && !!user?.league_id,
    refetchInterval: 30_000,
  })

  const { data: allEntries } = useQuery({
    queryKey: ['knockout-leaderboard', 'global'],
    queryFn: getKnockoutLeaderboard,
    enabled: isAdmin && view === 'my',
    refetchInterval: 30_000,
  })

  const { data: leagues = [] } = useQuery({
    queryKey: ['knockout-leaderboard', 'leagues'],
    queryFn: listLeagues,
    enabled: isAdmin,
  })

  const { data: leagueEntries, isLoading: leagueLoading, isError: leagueError } = useQuery({
    queryKey: ['knockout-leaderboard', 'league', selectedLeagueId],
    queryFn: () => getKnockoutLeaderboardByLeague(selectedLeagueId),
    enabled: isAdmin && view === 'league' && !!selectedLeagueId,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!isAdmin) return
    if (selectedLeagueId) return
    if (!leagues.length) return
    setSelectedLeagueId(leagues[0].id)
  }, [isAdmin, leagues, selectedLeagueId])

  const loading = isAdmin ? (view === 'league' ? leagueLoading : false) : myLoading
  const error = isAdmin ? (view === 'league' ? leagueError : false) : myError
  const entries = isAdmin
    ? (view === 'league' ? (leagueEntries ?? []) : (allEntries ?? []))
    : (myEntries ?? [])

  const rankMedal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">KO Leaderboard</h1>
          <p className="text-xs text-muted">Puntos de eliminatorias solamente</p>
          {isAdmin && (
            <div className="flex bg-surface-card border border-surface-border rounded-lg overflow-hidden">
              <button
                onClick={() => setView('my')}
                className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${view === 'my' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
              >
                Global
              </button>
              <button
                onClick={() => setView('league')}
                className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${view === 'league' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
              >
                Ligas
              </button>
            </div>
          )}
        </div>
        {isAdmin && view === 'league' && (
          <div className="flex items-center gap-2">
            <label htmlFor="ko-league" className="text-xs text-muted">Liga</label>
            <select
              id="ko-league"
              value={selectedLeagueId}
              onChange={e => setSelectedLeagueId(e.target.value)}
              className="bg-surface-card border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold"
            >
              {leagues.map(league => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!isAdmin && !user?.league_id ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-muted text-sm">Necesitas pertenecer a una liga para ver el KO leaderboard.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-error text-sm">Error al cargar la tabla de eliminatorias</p>
        </div>
      ) : !entries?.length ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-muted text-sm">No hay puntos de eliminatorias aún</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-surface-border rounded-lg p-4">
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
                        <PlayerTeamName name={e.player_team_name} verified={e.is_verified} disabled={e.is_disabled} roundOf16={e.round_of_16} />
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
        </div>
      )}
    </div>
  )
}
