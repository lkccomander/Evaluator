import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBracket, seedBracket } from '../api/knockout'
import { getMatches, updateMatchKickoff } from '../api/matches'

function toCSTDate(utcStr: string): string {
  const d = new Date(utcStr)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' })
}

function toCSTTime(utcStr: string): string {
  const d = new Date(utcStr)
  return d.toLocaleTimeString('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' })
}

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

  const [teamOverrides, setTeamOverrides] = useState<Record<string, { home: string; away: string }>>({})
  const [dateOverrides, setDateOverrides] = useState<Record<string, { date: string; time: string }>>({})

  const seedMut = useMutation({
    mutationFn: seedBracket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knockout-bracket'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })

  const kickoffMut = useMutation({
    mutationFn: (params: { matchId: string; cst: string }) => updateMatchKickoff(params.matchId, params.cst),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knockout-bracket'] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
    onError: () => {},
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

  const setTeam = (matchId: string, field: 'home' | 'away', value: string) => {
    setTeamOverrides(s => ({
      ...s,
      [matchId]: {
        ...(s[matchId] ?? { home: '', away: '' }),
        [field]: value,
      },
    }))
  }

  const handleSeedAll = async () => {
    const updates = Object.entries(teamOverrides)
      .filter(([_, v]) => v.home && v.away)
      .map(([matchId, v]) => ({
        match_id: matchId,
        home_team: v.home,
        away_team: v.away,
      }))
    if (updates.length === 0) return
    seedMut.mutate(updates)
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Armar Bracket</h1>

      <div className="bg-surface-card border border-surface-border rounded-lg p-6 mb-6">
        <p className="text-sm text-muted mb-4">
          Asigna los equipos y ajusta la fecha/hora (hora de Costa Rica).
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleSeedAll}
            disabled={Object.keys(teamOverrides).length === 0 || seedMut.isPending}
            className="bg-gold text-black font-semibold px-4 py-2 rounded text-sm disabled:opacity-50 hover:brightness-110 transition-all min-h-[44px]"
          >
            {seedMut.isPending ? 'Guardando...' : 'Guardar equipos'}
          </button>
          {seedMut.isSuccess && <span className="text-green-500 text-sm self-center">✓ Equipos guardados</span>}
          {seedMut.isError && <span className="text-error text-sm self-center">Error</span>}
        </div>
      </div>

      <div className="grid gap-3">
        {knockoutMatches?.map(m => {
          const override = teamOverrides[m.id]
          const homeVal = override?.home ?? m.home_team
          const awayVal = override?.away ?? m.away_team
          const dateOverride = dateOverrides[m.id]
          const dateVal = dateOverride?.date ?? toCSTDate(m.kickoff_utc)
          const timeVal = dateOverride?.time ?? toCSTTime(m.kickoff_utc)
          const dateChanged = dateOverride && (dateOverride.date !== toCSTDate(m.kickoff_utc) || dateOverride.time !== toCSTTime(m.kickoff_utc))
          const savingKickoff = kickoffMut.isPending && kickoffMut.variables?.matchId === m.id

          return (
            <div key={m.id} className="bg-surface-card border border-surface-border rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span className="font-semibold text-gold uppercase tracking-wider">
                  {stageLabels[m.stage] ?? m.stage} · Posición {m.bracket_position}
                </span>
                <span className="text-muted">
                  <input
                    type="date"
                    value={dateVal}
                    onChange={e => setDateOverrides(s => ({ ...s, [m.id]: { date: e.target.value, time: timeVal } }))}
                    className="w-32 bg-surface text-white border border-surface-border rounded px-1.5 py-1 text-xs outline-none focus:border-gold"
                  />
                  <input
                    type="time"
                    value={timeVal}
                    onChange={e => setDateOverrides(s => ({ ...s, [m.id]: { date: dateVal, time: e.target.value } }))}
                    className="w-24 bg-surface text-white border border-surface-border rounded px-1.5 py-1 text-xs outline-none focus:border-gold ml-1"
                  />
                  {dateChanged && (
                    <button
                      onClick={() => kickoffMut.mutate({ matchId: m.id, cst: `${dateVal}T${timeVal}` })}
                      disabled={kickoffMut.isPending}
                      className="ml-1 px-2 py-1 text-xs bg-gold/20 text-gold rounded hover:bg-gold/30 disabled:opacity-50"
                    >
                      {savingKickoff ? '...' : 'HR'}
                    </button>
                  )}
                  {kickoffMut.isSuccess && dateChanged && kickoffMut.variables?.matchId === m.id && (
                    <span className="text-green-400 text-xs ml-1">✓</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={homeVal}
                  onChange={e => setTeam(m.id, 'home', e.target.value)}
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
                  onChange={e => setTeam(m.id, 'away', e.target.value)}
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
