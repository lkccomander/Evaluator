import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatches, updateMatchKickoff } from '../api/matches'
import type { Match } from '../api/matches'

const STAGE_LABELS: Record<string, string> = {
  group: 'Grupos',
  round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semifinales',
  third: 'Tercer Lugar',
  final: 'Final',
}

const STAGE_ORDER: Record<string, number> = {
  group: 0,
  round_of_32: 1,
  round_of_16: 2,
  quarter: 3,
  semi: 4,
  third: 5,
  final: 6,
}

function toCSTDate(utcStr: string): string {
  const d = new Date(utcStr)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' })
}

function toCSTTime(utcStr: string): string {
  const d = new Date(utcStr)
  return d.toLocaleTimeString('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' })
}

function fromCST(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}`
}

function MatchRow({
  match,
  onSaved,
}: {
  match: Match
  onSaved: () => void
}) {
  const [date, setDate] = useState(toCSTDate(match.kickoff_utc))
  const [time, setTime] = useState(toCSTTime(match.kickoff_utc))

  const mut = useMutation({
    mutationFn: () => updateMatchKickoff(match.id, fromCST(date, time)),
    onSuccess: onSaved,
  })

  const hasChanged = fromCST(date, time) !== fromCST(toCSTDate(match.kickoff_utc), toCSTTime(match.kickoff_utc))

  return (
    <tr className="border-b border-surface-border/50 text-sm">
      <td className="py-2 px-2 text-muted whitespace-nowrap">{match.match_number}</td>
      <td className="py-2 px-2 text-muted whitespace-nowrap">
        <span className={`${match.stage === 'group' ? 'text-white' : 'text-gold'}`}>
          {STAGE_LABELS[match.stage] ?? match.stage}
        </span>
        {match.group_name && <span className="ml-1 text-muted">({match.group_name})</span>}
      </td>
      <td className="py-2 px-2 text-white whitespace-nowrap">
        {match.home_team} vs {match.away_team}
      </td>
      <td className="py-2 px-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-36 bg-surface text-white border border-surface-border rounded px-2 py-1.5 text-sm outline-none focus:border-gold"
        />
      </td>
      <td className="py-2 px-2">
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="w-28 bg-surface text-white border border-surface-border rounded px-2 py-1.5 text-sm outline-none focus:border-gold"
        />
      </td>
      <td className="py-2 px-2">
        {hasChanged && (
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-3 py-1.5 text-xs bg-gold text-black font-semibold rounded hover:brightness-110 transition-all disabled:opacity-50"
          >
            {mut.isPending ? '...' : 'Guardar'}
          </button>
        )}
        {mut.isSuccess && <span className="text-xs text-green-400 ml-2">✓</span>}
        {mut.isError && <span className="text-xs text-error ml-2">Error</span>}
      </td>
    </tr>
  )
}

export default function AdminSchedule() {
  const qc = useQueryClient()
  const { data: matches } = useQuery({
    queryKey: ['admin-matches'],
    queryFn: getMatches,
    refetchInterval: 30_000,
  })

  const grouped = matches
    ? Object.entries(
        matches.reduce(
          (acc, m) => {
            const key = m.stage
            if (!acc[key]) acc[key] = []
            acc[key].push(m)
            return acc
          },
          {} as Record<string, Match[]>,
        ),
      )
        .sort(([a], [b]) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99))
        .map(([stage, list]) => [
          stage,
          list.sort(
            (a, b) =>
              new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime(),
          ),
        ])
    : []

  return (
    <div className="bg-surface min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Horario de Partidos (Costa Rica)</h1>
        <span className="text-xs text-muted">Zona horaria: America/Costa_Rica (UTC-6)</span>
      </div>

      {grouped.map(([stage, stageMatches]) => (
        <details key={stage as string} className="mb-4 bg-surface-card border border-surface-border rounded-lg" open={stage !== 'group'}>
          <summary className="px-4 py-3 text-sm font-semibold text-white cursor-pointer select-none hover:bg-surface/50 rounded-lg">
            {STAGE_LABELS[stage as string] ?? stage} ({(stageMatches as Match[]).length})
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted border-b border-surface-border">
                  <th className="text-left py-2 px-2 font-medium">#</th>
                  <th className="text-left py-2 px-2 font-medium">Ronda</th>
                  <th className="text-left py-2 px-2 font-medium">Partido</th>
                  <th className="text-left py-2 px-2 font-medium">Fecha (CR)</th>
                  <th className="text-left py-2 px-2 font-medium">Hora (CR)</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {(stageMatches as Match[]).map(m => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    onSaved={() => qc.invalidateQueries({ queryKey: ['admin-matches'] })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  )
}