import { useEffect, useState } from 'react'
import type { PredictionEntry } from '../api/predictionList'
import { getPredictionList } from '../api/predictionList'
import { TeamName } from './TeamFlag'

interface Props {
  match: { id: string; home_team: string; away_team: string }
  leagueId?: string
  showNames: boolean
  onClose: () => void
}

export default function PredictionsListModal({ match, leagueId, showNames, onClose }: Props) {
  const [entries, setEntries] = useState<PredictionEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPredictionList(match.id, leagueId, showNames)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [match.id, leagueId, showNames])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="bg-surface-card border border-surface-border rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Pronósticos</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Cerrar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 mb-4 text-center">
          <div className="flex-1 text-right"><TeamName name={match.home_team} align="right" /></div>
          <span className="text-muted text-xs">vs</span>
          <div className="flex-1 text-left"><TeamName name={match.away_team} /></div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-muted text-sm text-center py-4">No hay pronósticos</p>
        ) : (
          <div className="overflow-y-auto flex-1 -mx-2">
            {entries.map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 text-sm border-b border-surface-border/50 last:border-0"
              >
                {showNames && (
                  <span className="text-muted truncate min-w-0 mr-3">
                    {e.display_name || '—'}
                  </span>
                )}
                <span className="font-mono font-medium tabular-nums ml-auto">
                  {e.home_score_pred} – {e.away_score_pred}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
