import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatches, enterResult, updateLiveScore } from '../api/matches'
import { getBannerMessages, postBannerMessage } from '../api/banner'
import { TeamName } from '../components/TeamFlag'

const crDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Costa_Rica',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export default function AdminResults() {
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const qc = useQueryClient()

  const { data: matches } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
    refetchInterval: 15_000,
  })

  const todayCr = crDateFormatter.format(new Date())
  const todaysMatches = matches?.filter(m => crDateFormatter.format(new Date(m.kickoff_utc)) === todayCr) ?? []

  const resultMut = useMutation({
    mutationFn: ({ id, home, away }: { id: string; home: number; away: number }) =>
      enterResult(id, home, away),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })

  const liveScoreMut = useMutation({
    mutationFn: ({ id, home, away }: { id: string; home: number; away: number }) =>
      updateLiveScore(id, home, away),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })

  const setScore = (id: string, field: 'home' | 'away', value: string) => {
    setScores(s => ({
      ...s,
      [id]: { ...s[id] ?? { home: '', away: '' }, [field]: value },
    }))
  }

  const { data: banners = [] } = useQuery({
    queryKey: ['banner'],
    queryFn: getBannerMessages,
  })

  const banner = banners[0]

  const [bannerText, setBannerText] = useState('')
  const [bannerSuccess, setBannerSuccess] = useState(false)

  const bannerMut = useMutation({
    mutationFn: (msg: string) => postBannerMessage(msg),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banner'] })
      setBannerSuccess(true)
      setTimeout(() => setBannerSuccess(false), 3000)
    },
  })

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Admin - Resultados</h1>

      <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-3 mb-6">
        <h2 className="text-sm font-semibold mb-2">Mensaje del banner</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={bannerText}
            onChange={e => setBannerText(e.target.value)}
            placeholder={banner?.message || 'Escribe un mensaje para el banner...'}
            className="flex-1 bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold"
          />
          <button
            onClick={() => bannerMut.mutate(bannerText)}
            disabled={bannerMut.isPending || !bannerText.trim()}
            className="bg-gold text-black font-semibold px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-gold-dark transition-colors"
          >
            {bannerMut.isPending ? '...' : 'Publicar'}
          </button>
          {bannerSuccess && <span className="text-green-500 text-sm font-semibold">Mensaje publicado</span>}
        </div>
      </div>

      <div className="grid gap-2">
        {todaysMatches.map(m => {
          const sc = scores[m.id] ?? {
            home: m.home_score?.toString() ?? '',
            away: m.away_score?.toString() ?? '',
          }
          const kickoff = new Date(m.kickoff_utc).getTime()
          const hasStarted = Date.now() >= kickoff
          const canEditLive = hasStarted && m.status !== 'finished'
          const canFinalize = hasStarted && m.status !== 'finished'
          const kickoffLabel = new Date(m.kickoff_utc).toLocaleString('es-CR', {
            timeZone: 'America/Costa_Rica',
            hour: '2-digit',
            minute: '2-digit',
          })
          return (
            <div key={m.id} className="bg-surface-card border border-surface-border rounded-lg px-3 py-3 text-sm">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
                <span>{m.group_name ? `Grupo ${m.group_name}` : m.stage}</span>
                <span>{kickoffLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium text-right min-w-0 flex-1"><TeamName name={m.home_team} align="right" /></span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      value={sc.home}
                      onChange={e => setScore(m.id, 'home', e.target.value)}
                      disabled={!canEditLive}
                      className="w-12 h-12 bg-surface border border-surface-border rounded text-center font-mono text-base text-white focus:outline-none focus:border-gold disabled:opacity-40"
                    />
                    <span className="text-muted">-</span>
                    <input
                      type="number"
                      min={0}
                      value={sc.away}
                      onChange={e => setScore(m.id, 'away', e.target.value)}
                      disabled={!canEditLive}
                      className="w-12 h-12 bg-surface border border-surface-border rounded text-center font-mono text-base text-white focus:outline-none focus:border-gold disabled:opacity-40"
                    />
                  </div>
                  <span className="font-medium min-w-0 flex-1"><TeamName name={m.away_team} /></span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => liveScoreMut.mutate({ id: m.id, home: Number(sc.home), away: Number(sc.away) })}
                    disabled={!canEditLive || sc.home === '' || sc.away === '' || liveScoreMut.isPending || resultMut.isPending}
                    className="border border-gold text-gold font-semibold px-3 py-2 rounded text-xs disabled:opacity-50 hover:bg-surface/50 transition-colors min-h-[44px]"
                  >
                    {liveScoreMut.isPending ? '...' : 'Marcador en vivo'}
                  </button>
                  <button
                    onClick={() => resultMut.mutate({ id: m.id, home: Number(sc.home), away: Number(sc.away) })}
                    disabled={!canFinalize || sc.home === '' || sc.away === '' || resultMut.isPending || liveScoreMut.isPending}
                    className="bg-gold text-black font-semibold px-4 py-2 rounded text-xs disabled:opacity-50 hover:bg-gold-dark transition-colors min-h-[44px]"
                  >
                    {resultMut.isPending ? '...' : 'Finalizar'}
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs">
                {m.status === 'finished' ? (
                  <span className="text-muted">Finalizado</span>
                ) : hasStarted ? (
                  <span className="text-error">Partido iniciado. Puedes guardar marcador en vivo o finalizar.</span>
                ) : (
                  <span className="text-muted">Programado para hoy</span>
                )}
              </div>
            </div>
          )
        })}
        {todaysMatches.length === 0 && (
          <p className="text-muted text-sm">No hay partidos para hoy.</p>
        )}
      </div>
    </div>
  )
}
