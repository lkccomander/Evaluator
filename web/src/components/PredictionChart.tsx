import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { PredictionStats } from '../api/predictionStats'

const COLORS = {
  local: '#22c55e',
  empate: '#eab308',
  visita: '#ef4444',
}

const LABELS = {
  local: 'Local',
  empate: 'Empate',
  visita: 'Visita',
}

export default function PredictionChart({ data, compact = false }: { data: PredictionStats; compact?: boolean }) {
  const chartData = [
    { name: 'local', value: data.local, fill: COLORS.local },
    { name: 'empate', value: data.empate, fill: COLORS.empate },
    { name: 'visita', value: data.visita, fill: COLORS.visita },
  ]

  if (data.total === 0) {
    return <p className="text-xs text-muted text-center">Sin pronósticos</p>
  }

  return (
    <div className={compact ? 'h-20' : 'h-64'}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={compact ? { top: 0, right: 0, bottom: 0, left: 0 } : { top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: compact ? 10 : 12, fill: '#94a3b8' }}
            tickFormatter={(v: string) => LABELS[v as keyof typeof LABELS]}
            axisLine={false}
            tickLine={false}
          />
          {!compact && (
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          )}
          {!compact && (
            <Tooltip
              formatter={(value: unknown, name: unknown) => [value as number, LABELS[name as keyof typeof LABELS]]}
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }}
              labelStyle={{ display: 'none' }}
            />
          )}
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
