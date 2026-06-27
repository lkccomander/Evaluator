import type { LeaderboardEntry } from '../api/leaderboard'
import { PlayerTeamName } from './TeamFlag'

export default function LeaderboardTable({
  entries,
  showLeague = true,
}: {
  entries: LeaderboardEntry[]
  showLeague?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted text-xs uppercase tracking-wider border-b border-surface-border">
            <th className="text-left py-2 pr-2">#</th>
            <th className="text-left py-2 px-2">Jugador</th>
            {showLeague && <th className="text-left py-2 px-2">Liga</th>}
            <th className="text-right py-2 px-2">Pts</th>
            <th className="text-right py-2 px-2">Gol Pts</th>
            <th className="text-right py-2 px-2">Exactas</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const rank = entry.rank ?? i + 1
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
            return (
              <tr key={entry.user_id} className="border-b border-surface-border/50 hover:bg-surface-card/50 transition-colors">
                <td className={`py-3 pr-2 font-mono text-xs ${rank <= 3 ? 'text-gold' : 'text-muted'}`}>
                  {medal || rank}
                </td>
                <td className="py-2 px-2 font-medium">
                  <PlayerTeamName
                    name={entry.display_name || entry.player_team_name}
                    verified={entry.is_verified}
                    disabled={entry.is_disabled}
                    roundOf16={entry.round_of_16}
                  />
                </td>
                {showLeague && (
                  <td className="py-2 px-2 text-muted text-xs">{entry.league_name ?? '—'}</td>
                )}
                <td className={`py-2 px-2 text-right font-mono font-bold ${rank <= 3 ? 'text-gold' : ''}`}>
                  {entry.total_points}
                </td>
                <td className="py-2 px-2 text-right font-mono text-muted">{entry.total_goal_pts}</td>
                <td className="py-2 px-2 text-right font-mono text-muted">{entry.exact_hits}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
