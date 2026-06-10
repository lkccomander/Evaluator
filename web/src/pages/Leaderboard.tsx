import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGlobalLeaderboard, getMyLeagueLeaderboard } from '../api/leaderboard'
import { useAuth } from '../hooks/useAuth'
import LeaderboardTable from '../components/LeaderboardTable'

export default function Leaderboard() {
  const [view, setView] = useState<'global' | 'league'>('global')
  const { user } = useAuth()

  const { data: global, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: getGlobalLeaderboard,
    refetchInterval: 60_000,
  })

  const { data: league, isLoading: leagueLoading, isError: leagueError } = useQuery({
    queryKey: ['leaderboard', 'mine'],
    queryFn: getMyLeagueLeaderboard,
    enabled: view === 'league' && !!user?.league_id,
    refetchInterval: 60_000,
  })

  const loading = view === 'global' ? isLoading : leagueLoading
  const error = view === 'global' ? isError : leagueError
  const entries = view === 'global' ? (global ?? []) : (league ?? [])

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-lg font-bold">Leaderboard</h1>
        <div className="flex bg-surface-card border border-surface-border rounded-lg overflow-hidden">
          <button
            onClick={() => setView('global')}
            className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${view === 'global' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
          >
            Global
          </button>
          {user?.league_id && (
            <button
              onClick={() => setView('league')}
              className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${view === 'league' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
            >
              Mi Liga
            </button>
          )}
        </div>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-error text-sm text-center">Error al cargar el leaderboard</p>
        ) : !entries.length ? (
          <p className="text-muted text-sm text-center">No hay participantes</p>
        ) : (
          <LeaderboardTable entries={entries} showLeague={view === 'global'} />
        )}
      </div>
    </div>
  )
}
