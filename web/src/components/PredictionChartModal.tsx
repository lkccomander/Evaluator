import type { PredictionStats } from '../api/predictionStats'
import PredictionChart from './PredictionChart'
import { TeamName } from './TeamFlag'

interface Props {
  match: { home_team: string; away_team: string }
  data: PredictionStats
  onClose: () => void
}

export default function PredictionChartModal({ match, data, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="bg-surface-card border border-surface-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Pronósticos</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Cerrar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6 text-center">
          <div className="flex-1 text-right"><TeamName name={match.home_team} align="right" /></div>
          <span className="text-muted text-xs">vs</span>
          <div className="flex-1 text-left"><TeamName name={match.away_team} /></div>
        </div>

        <PredictionChart data={data} />

        <div className="flex justify-center gap-6 mt-4 text-xs text-muted">
          <span><span className="inline-block w-3 h-3 rounded-full bg-green-500 align-middle mr-1" /> Local: {data.local}</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-yellow-500 align-middle mr-1" /> Empate: {data.empate}</span>
          <span><span className="inline-block w-3 h-3 rounded-full bg-red-500 align-middle mr-1" /> Visita: {data.visita}</span>
        </div>
      </div>
    </div>
  )
}
