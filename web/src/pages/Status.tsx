import { useCallback, useEffect, useRef, useState } from 'react'

type ServiceStatus = 'operational' | 'degraded' | 'down'

interface APIServiceStatus {
  service_name: string
  display_name: string
  status: ServiceStatus
  response_time_ms: number
  error_message: string
  checked_at: string
  uptime: string
}

interface APICheckHistory {
  status: ServiceStatus
  response_time_ms: number
  checked_at: string
}

interface ServiceState {
  name: string
  label: string
  status: ServiceStatus
  ms: number | null
  uptime: string
  history: APICheckHistory[]
  errorMessage: string
  lastDown: string | null
}

function envInt(key: string, fallback: number): number {
  const v = (typeof import.meta !== 'undefined' ? (import.meta.env as Record<string, string>)[key] : '') || ''
  if (!v) return fallback
  const n = parseInt(v, 10)
  return isNaN(n) ? fallback : n
}

const REFRESH_INTERVAL = envInt('VITE_STATUS_REFRESH_INTERVAL', 30)

function statusIcon(status: ServiceStatus) {
  switch (status) {
    case 'operational': return <><span className="text-green-400">●</span><span className="text-green-400/40 ml-0.5">●</span><span className="text-green-400/20 ml-0.5">●</span></>
    case 'degraded': return <><span className="text-amber-400">●</span><span className="text-amber-400/40 ml-0.5">●</span><span className="text-amber-400/20 ml-0.5">●</span></>
    case 'down': return <><span className="text-red-400">●</span><span className="text-red-400/40 ml-0.5">●</span><span className="text-red-400/20 ml-0.5">●</span></>
  }
}

function overallStatus(services: ServiceState[]): { label: string; color: string } {
  if (services.some((s) => s.status === 'down')) return { label: 'Some systems down', color: 'text-red-400' }
  if (services.some((s) => s.status === 'degraded')) return { label: 'Degraded performance', color: 'text-amber-400' }
  return { label: 'All systems operational', color: 'text-green-400' }
}

function getBg(status: ServiceStatus): string {
  switch (status) {
    case 'operational': return 'bg-green-500'
    case 'degraded': return 'bg-amber-500'
    case 'down': return 'bg-red-500'
  }
}

function msLabel(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return (ms / 1000).toFixed(1) + 's'
}

function lastDownFrom(history: APICheckHistory[]): string | null {
  for (const h of history) {
    if (h.status !== 'operational') {
      const d = new Date(h.checked_at)
      return d.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' })
    }
  }
  return null
}

function Bar({ status, ms }: { status: ServiceStatus; ms: number }) {
  const color = status === 'down' ? 'bg-red-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-green-500'
  const opacity = status === 'operational' ? '0.35' : status === 'degraded' ? '0.7' : '0.65'
  return (
    <div
      className={`h-8 w-[5px] rounded-sm ${color} transition-all duration-300`}
      style={{ opacity: Number(opacity) }}
      title={`${status} ${ms}ms`}
    />
  )
}

function HistoryBars({ history }: { history: APICheckHistory[] }) {
  if (history.length === 0) {
    return <div className="text-[10px] text-muted italic mt-3">No data yet</div>
  }
  return (
    <div className="flex items-end gap-[3px] mt-3 h-8">
      {history.slice(-72).map((p, i) => (
        <Bar key={i} status={p.status} ms={p.response_time_ms} />
      ))}
    </div>
  )
}

function ServiceCard({ svc }: { svc: ServiceState }) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg px-5 py-4 transition-colors hover:border-[#2a2a2a]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${getBg(svc.status)} shadow-[0_0_6px] ${svc.status === 'operational' ? 'shadow-green-500/30' : svc.status === 'degraded' ? 'shadow-amber-500/30' : 'shadow-red-500/30'}`} />
          <span className="text-sm text-white font-medium">{svc.label}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-muted tabular-nums">{msLabel(svc.ms)}</span>
          <span className={`text-[11px] font-medium ${svc.status === 'operational' ? 'text-green-400' : svc.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`}>
            {svc.status === 'operational' ? 'Operational' : svc.status === 'degraded' ? 'Degraded' : 'Down'}
          </span>
        </div>
      </div>
      <HistoryBars history={svc.history} />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted">
          Uptime (24h): <span className="text-white/60 font-medium">{svc.uptime}</span>
        </span>
        {svc.lastDown && (
          <span className="text-[10px] text-muted">
            Last issue: {svc.lastDown}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Status() {
  const [services, setServices] = useState<ServiceState[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [refreshSec, setRefreshSec] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const fetchStatus = useCallback(async () => {
    try {
      const [svcRes, histRes] = await Promise.all([
        fetch('/api/v1/status/services'),
        Promise.all([
          fetch('/api/v1/status/history?service=api&limit=72').then(r => r.json()),
          fetch('/api/v1/status/history?service=db&limit=72').then(r => r.json()),
        ]),
      ])

      if (!mounted.current) return

      if (!svcRes.ok) {
        setError(`API returned ${svcRes.status}`)
        return
      }

      const svcData: APIServiceStatus[] = await svcRes.json()
      const [apiHistory, dbHistory] = histRes as [APICheckHistory[], APICheckHistory[]]

      const historyMap: Record<string, APICheckHistory[]> = {
        api: apiHistory,
        db: dbHistory,
      }

      setServices(
        svcData.map((s) => ({
          name: s.service_name,
          label: s.display_name,
          status: s.status,
          ms: s.response_time_ms,
          uptime: s.uptime,
          history: historyMap[s.service_name] || [],
          errorMessage: s.error_message,
          lastDown: lastDownFrom(historyMap[s.service_name] || []),
        }))
      )
      setError(null)
      setLastUpdate(new Date())
      setRefreshSec(0)
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'fetch failed')
      }
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    fetchStatus()
    const interval = setInterval(() => fetchStatus(), REFRESH_INTERVAL * 1000)
    const tick = setInterval(() => setRefreshSec((s) => s + 1), 1000)
    return () => {
      mounted.current = false
      clearInterval(interval)
      clearInterval(tick)
    }
  }, [fetchStatus])

  const overall = overallStatus(services)

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center h-48">
        <div className="text-muted text-sm animate-pulse">Loading status...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-[0.15em] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Quiniela 2026
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Status</h1>
        <div className="flex items-center gap-2 mt-2">
          {services.length > 0
            ? statusIcon(overall.label === 'All systems operational' ? 'operational' : overall.label === 'Degraded performance' ? 'degraded' : 'down')
            : statusIcon('operational')}
          <span className={`text-sm font-medium ${overall.color}`}>{overall.label}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {services.map((svc) => (
          <ServiceCard key={svc.name} svc={svc} />
        ))}
      </div>

      <div className="flex items-center justify-between mt-6 text-[10px] text-muted">
        <span>
          Updated {lastUpdate.toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', second: '2-digit' })} CST
        </span>
        <span>
          Auto-refresh in {Math.max(0, REFRESH_INTERVAL - refreshSec)}s
          <button
            onClick={fetchStatus}
            className="ml-2 text-gold hover:underline"
          >
            Refresh now
          </button>
        </span>
      </div>
    </div>
  )
}
