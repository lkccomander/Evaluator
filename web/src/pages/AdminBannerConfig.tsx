import { useState, useEffect } from 'react'
import { request, authToken } from '../api/client'

const TICKER_SPEED_KEY = 'ticker_speed'

function getStoredSpeed(): number {
  const v = localStorage.getItem(TICKER_SPEED_KEY)
  if (v) {
    const n = parseInt(v, 10)
    if (!isNaN(n) && n >= 38 && n <= 3600) return n
  }
  return 960
}

interface ApiGameEntry {
  id: string
  home_team: string
  away_team: string
  home_score: string
  away_score: string
  finished: string
  time_elapsed: string
  timezone: string
}

interface MergeDebugEntry {
  id: string
  home_team_db: string
  db_score: string
  api_found: boolean
  api_score: string
  api_status: string
}

interface TickerEntry {
  id: string
  home_team: string
  away_team: string
  group: string
  kickoff: string
  status: string
  home_score: string
  away_score: string
  timezone: string
}

interface DebugResponse {
  api_raw: ApiGameEntry[]
  api_cached: ApiGameEntry[]
  api_ok: boolean
  api_error: string
  merge_debug: MergeDebugEntry[]
  ticker_entries: TickerEntry[]
  today_cr: string
}

export default function AdminBannerConfig() {
  const [data, setData] = useState<DebugResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sliderPos, setSliderPos] = useState(() => {
    const s = getStoredSpeed()
    return 1800 - Math.round((1800 - s) * 1740 / 1762)
  })
  const speed = Math.round(1800 - 1762 * (sliderPos - 60) / 1740)

  useEffect(() => {
    localStorage.setItem(TICKER_SPEED_KEY, speed.toString())
    window.dispatchEvent(new CustomEvent('opencode-speed', { detail: speed }))
  }, [speed])

  const fetchDebug = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await request<DebugResponse>('/admin/banner-debug', {
        token: authToken()!,
      })
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Configuración del Banner</h1>

      <div className="mb-6 bg-surface-card border border-surface-border rounded-lg p-4">
        <label className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Velocidad del ticker</span>
          <span className="text-sm text-muted font-mono tabular-nums">
            {speed < 120 ? '⚡ Rápido' : speed > 600 ? '🐢 Lento' : 'Normal'} ({speed}s)
          </span>
        </label>
        <input
          type="range"
          min={60}
          max={1800}
          step={30}
          value={sliderPos}
          onChange={e => setSliderPos(parseInt(e.target.value, 10))}
          className="w-full accent-gold"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>Lento</span>
          <span>Rápido</span>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={fetchDebug}
          disabled={loading}
          className="bg-gold text-black font-semibold px-5 py-2.5 rounded text-sm disabled:opacity-50 hover:bg-gold-dark transition-colors"
        >
          {loading ? 'Consultando…' : 'Solicitar info del API'}
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('opencode-goal'))}
          className="bg-error text-white font-semibold px-5 py-2.5 rounded text-sm hover:opacity-90 transition-colors"
        >
          ⚽ Simular gol
        </button>
      </div>

      {error && (
        <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-3 mb-6">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${data.api_ok ? 'bg-green-500' : 'bg-red-500'}`} />
              API fresco (GetGamesFresh) — {data.today_cr}
            </h2>
            {data.api_error && (
              <p className="text-error text-xs mb-2">Error del API: {data.api_error}</p>
            )}
            <pre className="bg-[#0d0d0d] border border-surface-border rounded-lg p-4 text-xs font-mono text-green-400 overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(data.api_raw, null, 2)}
            </pre>
          </section>

          {data.api_cached && data.api_cached.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                API cacheado (GetGames — usado para merge)
              </h2>
              <pre className="bg-[#0d0d0d] border border-surface-border rounded-lg p-4 text-xs font-mono text-yellow-400 overflow-auto max-h-48 whitespace-pre-wrap">
                {JSON.stringify(data.api_cached, null, 2)}
              </pre>
            </section>
          )}

          {data.merge_debug && data.merge_debug.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                Diagnóstico de merge (por partido)
              </h2>
              <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface-border text-muted uppercase">
                      <th className="text-left px-3 py-2">Home (DB)</th>
                      <th className="text-center px-3 py-2">DB Score</th>
                      <th className="text-center px-3 py-2">API encontrado</th>
                      <th className="text-center px-3 py-2">API Score</th>
                      <th className="text-center px-3 py-2">API Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.merge_debug.map(m => (
                      <tr key={m.id} className="border-b border-surface-border/50 last:border-0">
                        <td className="px-3 py-2 font-medium">{m.home_team_db}</td>
                        <td className="px-3 py-2 text-center font-mono">{m.db_score}</td>
                        <td className="px-3 py-2 text-center">
                          {m.api_found ? (
                            <span className="text-green-500">✓</span>
                          ) : (
                            <span className="text-red-500">✗</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{m.api_score}</td>
                        <td className="px-3 py-2 text-center">{m.api_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
              Lo que debería estar saliendo en el ticker
            </h2>
            <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
              {data.ticker_entries.length === 0 ? (
                <p className="text-muted text-sm p-4">No hay partidos para hoy.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-xs text-muted uppercase">
                      <th className="text-left px-4 py-2 font-medium">Hora CR</th>
                      <th className="text-left px-4 py-2 font-medium">Local</th>
                      <th className="text-center px-4 py-2 font-medium">Marcador</th>
                      <th className="text-right px-4 py-2 font-medium">Visita</th>
                      <th className="text-center px-4 py-2 font-medium">Estado</th>
                      <th className="text-center px-4 py-2 font-medium">Grupo</th>
                      <th className="text-center px-4 py-2 font-medium">Zona</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ticker_entries.map(e => {
                      const kickoff = new Date(e.kickoff).toLocaleString('es-CR', {
                        timeZone: 'America/Costa_Rica',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      return (
                        <tr key={e.id} className="border-b border-surface-border/50 last:border-0">
                          <td className="px-4 py-2.5 whitespace-nowrap text-muted">{kickoff}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{e.home_team}</td>
                          <td className="px-4 py-2.5 text-center font-mono">
                            {e.status === 'Programado' ? (
                              <span className="text-muted">vs</span>
                            ) : (
                              <span className={e.status === 'En juego' ? 'text-error' : 'text-white'}>
                                {e.home_score || '0'}–{e.away_score || '0'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-medium">{e.away_team}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              e.status === 'En juego' ? 'bg-error/20 text-error' :
                              e.status === 'Finalizado' ? 'bg-gold/20 text-gold' :
                              'bg-surface text-muted'
                            }`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted text-xs">{e.group}</td>
                          <td className="px-4 py-2.5 text-center text-muted text-xs font-mono">{e.timezone || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
