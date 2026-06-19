import { useCallback, useEffect, useRef, useState } from 'react'

type ServiceStatus = 'operational' | 'degraded' | 'down'

interface CheckPoint {
  t: number
  ok: boolean
  ms: number
}

interface ServiceState {
  name: string
  label: string
  status: ServiceStatus
  ms: number | null
  history: CheckPoint[]
  lastDown: string | null
}

function envStr(key: string, fallback: string): string {
  return (typeof import.meta !== 'undefined' ? (import.meta.env as Record<string, string>)[key] : '') || fallback
}

function envInt(key: string, fallback: number): number {
  const v = envStr(key, '')
  if (!v) return fallback
  const n = parseInt(v, 10)
  return isNaN(n) ? fallback : n
}

const CHECK_LIMIT = 72
const STORAGE_KEY = 'quiniela_status_history'
const STATUS_API = envStr('VITE_STATUS_API_ENDPOINT', '/api/v1/public/settings')
const STATUS_DB = envStr('VITE_STATUS_DB_ENDPOINT', '/api/v1/matches')
const REFRESH_INTERVAL = envInt('VITE_STATUS_REFRESH_INTERVAL', 30)
const CHECK_TIMEOUT = envInt('VITE_STATUS_CHECK_TIMEOUT', 8000)

function loadHistory(name: string): CheckPoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const all: Record<string, CheckPoint[]> = JSON.parse(raw)
    return (all[name] ?? []).filter((p: CheckPoint) => Date.now() - p.t < 86400000)
  } catch { return [] }
}

function saveHistory(name: string, points: CheckPoint[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all: Record<string, CheckPoint[]> = raw ? JSON.parse(raw) : {}
    all[name] = points.slice(-CHECK_LIMIT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch { /* ignore quota errors */ }
}

function uptimeLabel(history: CheckPoint[]): string {
  if (history.length === 0) return '—'
  const ok = history.filter((h) => h.ok).length
  return ((ok / history.length) * 100).toFixed(2) + '%'
}

function makeInitial(name: string, label: string): ServiceState {
  const history = loadHistory(name)
  const last = history[history.length - 1]
  let status: ServiceStatus = 'operational'
  if (last && !last.ok) {
    const recent = history.slice(-3)
    const failCount = recent.filter((r) => !r.ok).length
    status = failCount >= 3 ? 'down' : 'degraded'
  }
  let lastDown: string | null = null
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].ok) {
      lastDown = new Date(history[i].t).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' })
      break
    }
  }
  return { name, label, status, ms: last ? last.ms : null, history, lastDown }
}

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

async function checkURL(url: string): Promise<{ ok: boolean; ms: number }> {
  const start = performance.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(CHECK_TIMEOUT) })
    return { ok: res.ok, ms: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, ms: Math.round(performance.now() - start) }
  }
}

function Bar({ ok, ms, idx }: { ok: boolean; ms: number; idx: number }) {
  const isSlow = ok && ms > 1500
  const color = !ok ? 'bg-red-500' : isSlow ? 'bg-amber-500' : 'bg-green-500'
  const opacity = ok ? (isSlow ? '0.8' : '0.35') : '0.65'
  return (
    <div
      className={`h-8 w-[5px] rounded-sm ${color} transition-all duration-300`}
      style={{ opacity: Number(opacity), animationDelay: `${idx * 12}ms` }}
      title={ok ? `${ms}ms` : `Down (${ms}ms)`}
    />
  )
}

function HistoryBars({ history }: { history: CheckPoint[] }) {
  if (history.length === 0) {
    return <div className="text-[10px] text-muted italic mt-3">No data yet — checks appear every 30s</div>
  }
  const bars = history.slice(-CHECK_LIMIT)
  return (
    <div className="flex items-end gap-[3px] mt-3 h-8">
      {bars.map((p, i) => (
        <Bar key={i} ok={p.ok} ms={p.ms} idx={i} />
      ))}
    </div>
  )
}

function msLabel(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return (ms / 1000).toFixed(1) + 's'
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
          Uptime: <span className="text-white/60 font-medium">{uptimeLabel(svc.history)}</span>
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
  const [services, setServices] = useState<ServiceState[]>([
    makeInitial('api', 'API'),
    makeInitial('db', 'Database'),
  ])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [refreshSec, setRefreshSec] = useState(0)
  const mounted = useRef(true)

  const runChecks = useCallback(async () => {
    const results: Record<string, { ok: boolean; ms: number }> = {}
    ;(
      await Promise.all([
        checkURL(STATUS_API).then((r) => { results['api'] = r }),
        checkURL(STATUS_DB).then((r) => { results['db'] = r }),
      ])
    )

    if (!mounted.current) return

    setServices((prev) =>
      prev.map((svc) => {
        const r = results[svc.name]
        if (!r) return svc
        const point: CheckPoint = { t: Date.now(), ok: r.ok, ms: r.ms }
        const history = [...svc.history, point].slice(-CHECK_LIMIT)
        saveHistory(svc.name, history)
        const recent = history.slice(-3)
        const failCount = recent.filter((h) => !h.ok).length
        let status: ServiceStatus = svc.status
        if (r.ok && failCount === 0) status = 'operational'
        else if (!r.ok && failCount >= 3) status = 'down'
        else if (!r.ok) status = 'degraded'
        else status = 'operational'

        let lastDown: string | null = svc.lastDown
        if (!r.ok) {
          lastDown = new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' })
        }
        return { ...svc, status, ms: r.ms, history, lastDown }
      })
    )
    setLastUpdate(new Date())
    setRefreshSec(0)
  }, [])

  useEffect(() => {
    mounted.current = true
    runChecks()
    const interval = setInterval(() => runChecks(), REFRESH_INTERVAL * 1000)
    const tick = setInterval(() => setRefreshSec((s) => s + 1), 1000)
    return () => {
      mounted.current = false
      clearInterval(interval)
      clearInterval(tick)
    }
  }, [runChecks])

  const overall = overallStatus(services)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-[0.15em] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          Quiniela 2026
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Status</h1>
        <div className="flex items-center gap-2 mt-2">
          {statusIcon(overall.label === 'All systems operational' ? 'operational' : overall.label === 'Degraded performance' ? 'degraded' : 'down')}
          <span className={`text-sm font-medium ${overall.color}`}>{overall.label}</span>
        </div>
      </div>

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
            onClick={runChecks}
            className="ml-2 text-gold hover:underline"
          >
            Refresh now
          </button>
        </span>
      </div>
    </div>
  )
}
