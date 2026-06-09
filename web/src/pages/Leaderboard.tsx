import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGlobalLeaderboard, getMyLeagueLeaderboard } from '../api/leaderboard'
import { useAuth } from '../hooks/useAuth'
import LeaderboardTable from '../components/LeaderboardTable'

export default function Leaderboard() {
  const [view, setView] = useState<'global' | 'league'>('global')
  const { user } = useAuth()

  const { data: global } = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: getGlobalLeaderboard,
    refetchInterval: 60_000,
  })

  const { data: league } = useQuery({
    queryKey: ['leaderboard', 'mine'],
    queryFn: getMyLeagueLeaderboard,
    enabled: view === 'league' && !!user?.league_id,
    refetchInterval: 60_000,
  })

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-lg font-bold">Leaderboard</h1>
        <div className="flex bg-surface-card border border-surface-border rounded-lg overflow-hidden text-xs">
          <button
            onClick={() => setView('global')}
            className={`px-3 py-1.5 transition-colors ${view === 'global' ? 'bg-gold text-black font-semibold' : 'text-muted hover:text-white'}`}
          >
            Global
          </button>
          {user?.league_id && (
            <button
              onClick={() => setView('league')}
              className={`px-3 py-1.5 transition-colors ${view === 'league' ? 'bg-gold text-black font-semibold' : 'text-muted hover:text-white'}`}
            >
              Mi Liga
            </button>
          )}
        </div>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        <LeaderboardTable
          entries={view === 'global' ? global ?? [] : league ?? []}
          showLeague={view === 'global'}
        />
      </div>
    </div>
  )
}
