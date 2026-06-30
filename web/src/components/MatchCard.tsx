import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Match } from '../api/matches'
import type { PredictionStats } from '../api/predictionStats'
import { getPredictionStats } from '../api/predictionStats'
import { submitPrediction } from '../api/predictions'
import Countdown from './Countdown'
import { TeamName } from './TeamFlag'
import PredictionChartModal from './PredictionChartModal'
import PredictionsListModal from './PredictionsListModal'

export default function MatchCard({
  match,
  userHasLeague,
  userPrediction,
  leagueId,
  chartVisibility = 'locked_only',
  showPredictionNames = false,
}: {
  match: Match
  userHasLeague: boolean
  userPrediction?: { home: number; away: number; pen_home_pred?: number | null; pen_away_pred?: number | null } | null
  leagueId?: string
  chartVisibility?: 'always' | 'locked_only'
  showPredictionNames?: boolean
}) {
  const qc = useQueryClient()
  const [home, setHome] = useState(userPrediction?.home?.toString() ?? '')
  const [away, setAway] = useState(userPrediction?.away?.toString() ?? '')
  const [penWinner, setPenWinner] = useState<'home' | 'away' | null>(
    userPrediction?.pen_home_pred === 1 ? 'home' : userPrediction?.pen_home_pred === 0 ? 'away' : null,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<PredictionStats | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [predictionsModalOpen, setPredictionsModalOpen] = useState(false)

  useEffect(() => {
    setHome(userPrediction?.home?.toString() ?? '')
    setAway(userPrediction?.away?.toString() ?? '')
    setPenWinner(
      userPrediction?.pen_home_pred === 1 ? 'home' : userPrediction?.pen_home_pred === 0 ? 'away' : null,
    )
  }, [match.id, userPrediction?.home, userPrediction?.away, userPrediction?.pen_home_pred])

  const showChart = chartVisibility === 'always' || match.locked || match.status === 'finished'

  useEffect(() => {
    if (!showChart) {
      setStats(null)
      return
    }
    let cancelled = false
    getPredictionStats(match.id, leagueId).then(data => { if (!cancelled) setStats(data) }).catch(() => {})
    return () => { cancelled = true }
  }, [match.id, showChart, leagueId])

  const canPredict = userHasLeague && !match.locked && match.status === 'upcoming'
  const isKnockout = match.stage !== '' && match.stage !== 'group'
  const isDrawPrediction = home !== '' && away !== '' && Number(home) === Number(away)
  const showPenaltyPicker = isKnockout && isDrawPrediction && canPredict
  const msUntilKickoff = new Date(match.kickoff_utc).getTime() - Date.now()
  const hasStarted = msUntilKickoff <= 0
  const statusDotClass = msUntilKickoff <= 5 * 60 * 1000
    ? 'bg-error'
    : msUntilKickoff <= 30 * 60 * 1000
      ? 'bg-yellow-400'
      : 'bg-green-500'
  const statusLabel = msUntilKickoff <= 5 * 60 * 1000
    ? 'Cierra en 5 minutos o menos'
    : msUntilKickoff <= 30 * 60 * 1000
      ? 'Faltan 30 minutos o menos'
      : 'Disponible para pronóstico'
  const matchStateLabel = match.status === 'finished'
    ? 'Finalizado'
    : hasStarted
      ? 'En juego'
      : 'Programado'

  const handleSave = async () => {
    if (!canPredict) return
    setSaving(true)
    setError('')
    try {
      await submitPrediction(
        match.id,
        Number(home),
        Number(away),
        showPenaltyPicker ? penWinner ?? undefined : undefined,
      )
      qc.invalidateQueries({ queryKey: ['my-predictions'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
    setSaving(false)
  }

  function stageCardBorder(stage: string): string {
    switch (stage) {
      case 'round_of_32': return 'border-sky-400/40 bg-sky-950/10'
      case 'round_of_16': return 'border-green-400/40 bg-green-950/10'
      case 'quarter': return 'border-pink-400/40 bg-pink-950/10'
      case 'semi': return 'border-purple-400/40 bg-purple-950/10'
      case 'third': return 'border-gray-400/40'
      case 'final': return 'border-yellow-400/40 bg-yellow-950/10'
      default: return 'border-surface-border'
    }
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
    <div className={`bg-surface-card border ${stageCardBorder(match.stage)} rounded-lg p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{match.group_name ? `Grupo ${match.group_name}` : match.stage}</span>
        <span>{crTime}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-right font-medium text-sm min-w-0"><TeamName name={match.home_team} align="right" /></div>

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
                className="w-12 h-12 bg-surface border border-surface-border rounded text-center font-mono text-base text-white disabled:opacity-30 focus:outline-none focus:border-gold"
              />
              <span className="text-muted font-mono">-</span>
              <input
                type="number"
                min={0}
                max={20}
                value={away}
                disabled={!canPredict}
                onChange={e => setAway(e.target.value)}
                className="w-12 h-12 bg-surface border border-surface-border rounded text-center font-mono text-base text-white disabled:opacity-30 focus:outline-none focus:border-gold"
              />
            </div>
          )}
        </div>

        <div className="flex-1 font-medium text-sm min-w-0"><TeamName name={match.away_team} /></div>
      </div>

      {showPenaltyPicker && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-xs text-muted mr-1">Penales:</span>
          <button
            type="button"
            onClick={() => setPenWinner('home')}
            className={`px-3 py-1 text-xs rounded border min-h-[44px] min-w-[60px] ${
              penWinner === 'home'
                ? 'border-gold text-gold bg-gold/10'
                : 'border-surface-border text-muted bg-surface hover:border-gray-500'
            }`}
          >
            {match.home_team}
          </button>
          <span className="text-muted text-xs">vs</span>
          <button
            type="button"
            onClick={() => setPenWinner('away')}
            className={`px-3 py-1 text-xs rounded border min-h-[44px] min-w-[60px] ${
              penWinner === 'away'
                ? 'border-gold text-gold bg-gold/10'
                : 'border-surface-border text-muted bg-surface hover:border-gray-500'
            }`}
          >
            {match.away_team}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-full ${statusDotClass}`}
            title={statusLabel}
            aria-label={statusLabel}
          />
          <Countdown targetUTC={match.deadline} />
        </div>
        <div className="flex-1 text-center">
          <span
            className={`text-sm font-semibold tracking-[0.2em] uppercase ${
              match.status === 'finished'
                ? 'text-muted'
                : hasStarted
                  ? 'match-live-pulse text-error'
                  : 'text-slate-300'
            }`}
          >
            {matchStateLabel}
          </span>
        </div>
        {canPredict && home !== '' && away !== '' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className={`text-xs min-h-[44px] min-w-[44px] flex items-center justify-center ${
              saving ? 'text-green-400' : 'text-gold hover:underline'
            } disabled:opacity-50`}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        )}
        {match.status === 'finished' && userPrediction && (
          <span className="text-xs text-muted">
            Pronóstico: {userPrediction.home}-{userPrediction.away}
            {match.penalty_home_score != null && match.penalty_away_score != null &&
              ` (pen: ${match.penalty_home_score}-${match.penalty_away_score})`}
          </span>
        )}
      </div>
      {stats && (match.locked || match.status === 'finished') && (
        <button onClick={() => setModalOpen(true)} className="text-xs text-gold hover:underline text-center min-h-[44px] flex items-center justify-center">
          📊Estadisticas
        </button>
      )}
      {leagueId && (match.locked || match.status === 'finished') && (
        <button onClick={() => setPredictionsModalOpen(true)} className="text-xs text-gold hover:underline text-center min-h-[44px] flex items-center justify-center">
          📋Pronosticos
        </button>
      )}
      {error && <p className="text-error text-xs text-center">{error}</p>}
      {modalOpen && stats && (
        <PredictionChartModal
          match={match}
          data={stats}
          onClose={() => setModalOpen(false)}
        />
      )}
      {predictionsModalOpen && (
        <PredictionsListModal
          match={match}
          leagueId={leagueId}
          showNames={showPredictionNames}
          onClose={() => setPredictionsModalOpen(false)}
        />
      )}
    </div>
  )
}
