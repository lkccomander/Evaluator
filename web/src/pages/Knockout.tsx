import { useQuery } from '@tanstack/react-query'
import { getBracket } from '../api/knockout'
import { getMyPredictions } from '../api/predictions'
import { useAuth } from '../hooks/useAuth'
import { TeamName } from '../components/TeamFlag'

const stageOrder = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third', 'final']
const stageLabels: Record<string, string> = {
  round_of_32: '32vos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  third: '3er Lugar',
  final: 'Final',
}

function getAdvancesTo(stage: string, bracketPos: number | null): number | null {
  if (bracketPos == null) return null
  const idx = stageOrder.indexOf(stage)
  if (idx < 0 || idx >= stageOrder.length - 1) return null
  return Math.ceil(bracketPos / 2)
}

export default function Knockout() {
  const { user } = useAuth()

  const { data: matches, isLoading } = useQuery({
    queryKey: ['knockout-bracket'],
    queryFn: getBracket,
    refetchInterval: 30_000,
  })

  const { data: predictions } = useQuery({
    queryKey: ['my-predictions'],
    queryFn: getMyPredictions,
    enabled: !!user?.league_id,
    refetchInterval: 30_000,
  })

  const predMap = new Map(
    predictions?.map(p => [p.match_id, p]) ?? [],
  )

  const grouped: Record<string, NonNullable<typeof matches>> = {}
  for (const m of matches ?? []) {
    const arr = grouped[m.stage] ?? []
    arr.push(m)
    grouped[m.stage] = arr
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Eliminatorias</h1>

      {!matches?.length ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-muted text-sm">No hay partidos de eliminatorias disponibles</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
          {stageOrder.map(stage => {
            const stageMatches = grouped[stage] ?? []
            if (!stageMatches.length) return null
            return (
              <div key={stage} className="flex-shrink-0 w-56">
                <h2 className="text-sm font-semibold text-gold mb-2 text-center uppercase tracking-wider">
                  {stageLabels[stage]}
                </h2>
                <div className="flex flex-col gap-2">
                  {stageMatches.map(m => {
                    const pred = predMap.get(m.id)
                    const advPos = getAdvancesTo(m.stage, m.bracket_position)

                    const crTime = new Date(m.kickoff_utc).toLocaleString('es-CR', {
                      timeZone: 'America/Costa_Rica',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <div
                        key={m.id}
                        className="bg-surface-card border border-surface-border rounded-lg p-3 text-sm"
                      >
                        <div className="text-xs text-muted mb-1">{crTime}</div>

                        <div className="flex items-center justify-between gap-1">
                          <span className="flex-1 text-right truncate"><TeamName name={m.home_team} align="right" /></span>
                          <span className="font-mono text-base font-bold px-1">
                            {m.status === 'finished'
                              ? `${m.home_score ?? '?'} - ${m.away_score ?? '?'}`
                              : 'vs'}
                          </span>
                          <span className="flex-1 truncate"><TeamName name={m.away_team} /></span>
                        </div>

                        {m.status === 'finished' && m.penalty_home_score != null && (
                          <div className="text-xs text-muted text-center mt-1">
                            Pen: {m.penalty_home_score} - {m.penalty_away_score}
                          </div>
                        )}

                        {pred && m.status === 'finished' && (
                          <div className="text-xs text-muted text-center mt-1">
                            Tu pronóstico: {pred.home_score_pred}-{pred.away_score_pred}
                            {pred.pen_home_pred != null && ` (pen: ${pred.pen_home_pred}-${pred.pen_away_pred})`}
                            {pred.points_earned != null && (
                              <span className="text-gold ml-1">+{pred.points_earned}pts</span>
                            )}
                          </div>
                        )}

                        {m.locked && m.status !== 'finished' && !pred && (
                          <div className="text-xs text-error text-center mt-1">No pronosticado</div>
                        )}

                        {advPos != null && (
                          <div className="text-xs text-muted text-center mt-1 opacity-50">
                            → {stageLabels[stageOrder[stageOrder.indexOf(m.stage) + 1]]}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
