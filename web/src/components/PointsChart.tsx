import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { HistoryDayEntry } from '../api/leaderboard'

const COLORS = [
  '#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#e11d48',
  '#06b6d4', '#84cc16', '#a855f7', '#f43f5e', '#0ea5e9',
  '#22c55e', '#eab308', '#d946ef', '#0284c7', '#65a30d',
]

interface Props {
  data: HistoryDayEntry[]
  loading: boolean
  error: boolean
  maxPlayers?: number
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<Record<string, unknown>>; label?: string }) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => ((b.value as number) ?? 0) - ((a.value as number) ?? 0))
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
      padding: '8px 12px', fontSize: '12px',
    }}>
      <p style={{ color: '#a0aec0', fontWeight: 600, margin: '0 0 4px' }}>{label}</p>
      {sorted.map(entry => (
        <div key={entry.dataKey as string} style={{ color: (entry.color as string) || '#e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{entry.name as string}</span>
          <span style={{ fontWeight: 600 }}>{entry.value as number} pts</span>
        </div>
      ))}
    </div>
  )
}

export default function PointsChart({ data, loading, error, maxPlayers = 10 }: Props) {
  const { chartData, lines } = useMemo(() => {
    if (!data.length) return { chartData: [], lines: [] }

    const playerTotals: Record<string, number> = {}
    const lastDay = data[data.length - 1]
    for (const p of lastDay.players) {
      playerTotals[p.user_id] = p.total_points
    }

    const topPlayers = Object.entries(playerTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxPlayers)
      .map(([id]) => id)

    const topPlayerSet = new Set(topPlayers)

    const labels: Record<string, string> = {}
    for (const day of data) {
      for (const p of day.players) {
        if (topPlayerSet.has(p.user_id)) {
          labels[p.user_id] = p.player_team_name || p.username
        }
      }
    }

    const chartData = data.map(day => {
      const point: Record<string, string | number> = { date: formatDate(day.date) }
      const dayMap: Record<string, number> = {}
      for (const p of day.players) {
        dayMap[p.user_id] = p.total_points
      }
      for (const id of topPlayers) {
        point[id] = dayMap[id] ?? 0
      }
      return point
    })

    const lines = topPlayers.map((id, i) => ({
      dataKey: id,
      name: labels[id] || id,
      color: COLORS[i % COLORS.length],
      strokeWidth: 2,
    }))

    return { chartData, lines }
  }, [data, maxPlayers])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return <p className="text-error text-sm text-center py-8">Error al cargar el historial de puntos</p>
  }

  if (!chartData.length) {
    return <p className="text-muted text-sm text-center py-8">Aún no hay datos de puntos para mostrar</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#a0aec0', fontSize: 11 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#a0aec0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#a0aec0', paddingTop: '4px' }}
            iconType="plainline"
          />
          {lines.map(line => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              dot={false}
              activeDot={{ r: 3, fill: line.color }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted mt-1">Mostrando top {maxPlayers} jugadores por puntos totales.</p>
    </div>
  )
}
