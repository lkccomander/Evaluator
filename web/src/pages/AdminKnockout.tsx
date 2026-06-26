import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBracket, seedBracket } from '../api/knockout'
import { getMatches } from '../api/matches'

const stageLabels: Record<string, string> = {
  round_of_32: '32vos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  third: '3er Lugar',
  final: 'Final',
}

export default function AdminKnockout() {
  const qc = useQueryClient()

  const { data: knockoutMatches } = useQuery({
    queryKey: ['knockout-bracket'],
    queryFn: getBracket,
  })

  const { data: allMatches } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
  })

  const [teamOverrides, setTeamOverrides] = useState<Record<number, { home: string; away: string }>>({})

  const seedMut = useMutation({
    mutationFn: seedBracket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knockout-bracket'] })
    },
  })

  const groupMatches = allMatches?.filter(m => m.stage === 'group' && m.status === 'finished') ?? []

  const possibleTeams = new Set<string>()
  for (const m of groupMatches) {
    if (m.home_score != null && m.away_score != null) {
      possibleTeams.add(m.home_team)
      possibleTeams.add(m.away_team)
    }
  }

  const allTeams = Array.from(possibleTeams).sort()

  const needsSeed = knockoutMatches?.filter(
    m => !m.home_team || !m.away_team || m.home_team === '' || m.away_team === '',
  ) ?? []

  const setTeam = (bracketPos: number, field: 'home' | 'away', value: string) => {
    setTeamOverrides(s => ({
      ...s,
      [bracketPos]: {
        ...(s[bracketPos] ?? { home: '', away: '' }),
        [field]: value,
      },
    }))
  }

  const handleSeedAll = async () => {
    const updates = Object.entries(teamOverrides)
      .filter(([_, v]) => v.home && v.away)
      .map(([pos, v]) => ({
        bracket_position: Number(pos),
        home_team: v.home,
        away_team: v.away,
      }))
    if (updates.length === 0) return
    seedMut.mutate(updates)
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Armar Bracket</h1>

      {(needsSeed.length === 0 || (knockoutMatches && knockoutMatches.every(m => m.home_team && m.away_team))) ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-muted text-sm">Todos los equipos han sido asignados.</p>
          <p className="text-muted text-xs mt-1">Usa los selectores abajo para reasignar si es necesario.</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 mb-6">
          <p className="text-sm text-muted mb-4">
            Asigna los equipos clasificados a las casillas del bracket. Usa los equipos finalizados de la fase de grupos.
          </p>
          <button
            onClick={handleSeedAll}
            disabled={Object.keys(teamOverrides).length === 0 || seedMut.isPending}
            className="bg-gold text-black font-semibold px-4 py-2 rounded text-sm disabled:opacity-50 hover:brightness-110 transition-all min-h-[44px]"
          >
            {seedMut.isPending ? 'Guardando...' : 'Guardar asignaciones'}
          </button>
          {seedMut.isSuccess && <span className="text-green-500 text-sm ml-3">¡Guardado!</span>}
          {seedMut.isError && <span className="text-error text-sm ml-3">Error al guardar</span>}
        </div>
      )}

      <div className="grid gap-3">
        {knockoutMatches?.map(m => {
          const override = teamOverrides[m.bracket_position ?? -1]
          const homeVal = override?.home ?? m.home_team
          const awayVal = override?.away ?? m.away_team
          const crTime = new Date(m.kickoff_utc).toLocaleString('es-CR', {
            timeZone: 'America/Costa_Rica',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
          return (
            <div key={m.id} className="bg-surface-card border border-surface-border rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span className="font-semibold text-gold uppercase tracking-wider">
                  {stageLabels[m.stage] ?? m.stage} · Posición {m.bracket_position}
                </span>
                <span>{crTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={homeVal}
                  onChange={e => setTeam(m.bracket_position ?? -1, 'home', e.target.value)}
                  className="flex-1 bg-surface border border-surface-border rounded px-2 py-2 text-sm text-white focus:outline-none focus:border-gold"
                >
                  <option value="">Seleccionar local</option>
                  {allTeams.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="text-muted font-mono">vs</span>
                <select
                  value={awayVal}
                  onChange={e => setTeam(m.bracket_position ?? -1, 'away', e.target.value)}
                  className="flex-1 bg-surface border border-surface-border rounded px-2 py-2 text-sm text-white focus:outline-none focus:border-gold"
                >
                  <option value="">Seleccionar visitante</option>
                  {allTeams.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
