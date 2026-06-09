import { useState } from 'react'
import type { Match } from '../api/matches'
import { submitPrediction } from '../api/predictions'
import Countdown from './Countdown'

export default function MatchCard({
  match,
  userHasLeague,
  userPrediction,
}: {
  match: Match
  userHasLeague: boolean
  userPrediction?: { home: number; away: number } | null
}) {
  const [home, setHome] = useState(userPrediction?.home?.toString() ?? '')
  const [away, setAway] = useState(userPrediction?.away?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const canPredict = userHasLeague && !match.locked && match.status === 'upcoming'

  const handleSave = async () => {
    if (!canPredict) return
    setSaving(true)
    try {
      await submitPrediction(match.id, Number(home), Number(away))
    } catch { /* ignore */ }
    setSaving(false)
  }

  const crTime = new Date(match.kickoff_utc).toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{match.group_name ? `Grupo ${match.group_name}` : match.stage}</span>
        <span>{crTime}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-right font-medium text-sm truncate">{match.home_team}</div>

        <div className="flex items-center gap-2">
          {match.status === 'finished' ? (
            <span className="font-mono font-bold text-lg">
              {match.home_score ?? '?'} - {match.away_score ?? '?'}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={20}
                value={home}
                disabled={!canPredict}
                onChange={e => setHome(e.target.value)}
                className="w-10 h-10 bg-surface border border-surface-border rounded text-center font-mono text-sm text-white disabled:opacity-30 focus:outline-none focus:border-gold"
              />
              <span className="text-muted font-mono">-</span>
              <input
                type="number"
                min={0}
                max={20}
                value={away}
                disabled={!canPredict}
                onChange={e => setAway(e.target.value)}
                className="w-10 h-10 bg-surface border border-surface-border rounded text-center font-mono text-sm text-white disabled:opacity-30 focus:outline-none focus:border-gold"
              />
            </div>
          )}
        </div>

        <div className="flex-1 font-medium text-sm truncate">{match.away_team}</div>
      </div>

      <div className="flex items-center justify-between">
        <Countdown targetUTC={match.deadline} />
        {canPredict && home !== '' && away !== '' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs text-gold hover:underline disabled:opacity-50"
          >
            {saving ? '...' : 'Guardar'}
          </button>
        )}
        {match.status === 'finished' && userPrediction && (
          <span className="text-xs text-muted">
            Pronóstico: {userPrediction.home}-{userPrediction.away}
          </span>
        )}
      </div>
    </div>
  )
}
