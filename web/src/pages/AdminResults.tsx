import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatches, enterResult } from '../api/matches'

export default function AdminResults() {
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const qc = useQueryClient()

  const { data: matches } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
    refetchInterval: 15_000,
  })

  const pendingMatches = matches?.filter(m => {
    const kickoff = new Date(m.kickoff_utc).getTime()
    return m.status !== 'finished' && Date.now() >= kickoff
  }) ?? []

  const resultMut = useMutation({
    mutationFn: ({ id, home, away }: { id: string; home: number; away: number }) =>
      enterResult(id, home, away),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })

  const setScore = (id: string, field: 'home' | 'away', value: string) => {
    setScores(s => ({
      ...s,
      [id]: { ...s[id] ?? { home: '', away: '' }, [field]: value },
    }))
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Admin - Resultados</h1>
      <div className="grid gap-2">
        {pendingMatches.map(m => {
          const sc = scores[m.id] ?? { home: '', away: '' }
          return (
            <div key={m.id} className="bg-surface-card border border-surface-border rounded-lg px-3 py-3 flex items-center justify-between text-sm gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="hidden sm:inline text-muted text-xs shrink-0">{m.group_name ? `Grupo ${m.group_name}` : ''}</span>
                <span className="font-medium truncate text-right min-w-0 flex-1">{m.home_team}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={0}
                    value={sc.home}
                    onChange={e => setScore(m.id, 'home', e.target.value)}
                    className="w-12 h-12 bg-surface border border-surface-border rounded text-center font-mono text-base text-white focus:outline-none focus:border-gold"
                  />
                  <span className="text-muted">-</span>
                  <input
                    type="number"
                    min={0}
                    value={sc.away}
                    onChange={e => setScore(m.id, 'away', e.target.value)}
                    className="w-12 h-12 bg-surface border border-surface-border rounded text-center font-mono text-base text-white focus:outline-none focus:border-gold"
                  />
                </div>
                <span className="font-medium truncate min-w-0 flex-1">{m.away_team}</span>
              </div>
              <button
                onClick={() => resultMut.mutate({ id: m.id, home: Number(sc.home), away: Number(sc.away) })}
                disabled={sc.home === '' || sc.away === '' || resultMut.isPending}
                className="bg-gold text-black font-semibold px-4 py-2 rounded text-xs shrink-0 disabled:opacity-50 hover:bg-gold-dark transition-colors min-h-[44px]"
              >
                {resultMut.isPending ? '...' : 'Guardar'}
              </button>
            </div>
          )
        })}
        {pendingMatches.length === 0 && (
          <p className="text-muted text-sm">No hay partidos pendientes de resultado.</p>
        )}
      </div>
    </div>
  )
}
