import { useState } from 'react'
import { request, authToken } from '../api/client'

interface ApiGameEntry {
  id: string
  home_team: string
  away_team: string
  home_score: string
  away_score: string
  finished: string
  time_elapsed: string
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
}

interface DebugResponse {
  api_raw: ApiGameEntry[]
  api_error: string
  ticker_entries: TickerEntry[]
  today_cr: string
}

export default function AdminBannerConfig() {
  const [data, setData] = useState<DebugResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      <button
        onClick={fetchDebug}
        disabled={loading}
        className="bg-gold text-black font-semibold px-5 py-2.5 rounded text-sm disabled:opacity-50 hover:bg-gold-dark transition-colors mb-6"
      >
        {loading ? 'Consultando…' : 'Solicitar info del API'}
      </button>

      {error && (
        <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-3 mb-6">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
              Respuesta del API externo ({data.today_cr})
            </h2>
            {data.api_error && (
              <p className="text-error text-xs mb-2">Error del API: {data.api_error}</p>
            )}
            <pre className="bg-[#0d0d0d] border border-surface-border rounded-lg p-4 text-xs font-mono text-green-400 overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(data.api_raw, null, 2)}
            </pre>
          </section>

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
