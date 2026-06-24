import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type { HistoryDayEntry } from '../api/leaderboard'

interface Props {
  data: HistoryDayEntry[]
}

const BAR_COLORS = [
  '#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#e11d48',
  '#06b6d4', '#84cc16', '#a855f7', '#f43f5e', '#0ea5e9',
  '#22c55e', '#eab308', '#d946ef', '#0284c7', '#65a30d',
]

export default function BarChartRace({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const animate = useCallback(() => {
    if (!svgRef.current || !data.length) return

    const width = svgRef.current.clientWidth
    const height = 500
    const margin = { top: 40, right: 120, bottom: 40, left: 160 }

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom
    const maxBars = 15

    // Prepare all frames
    const frames: { date: string; sorted: { id: string; name: string; value: number }[] }[] = []
    for (const day of data) {
      const sorted = day.players
        .map(p => ({ id: p.user_id, name: p.player_team_name || p.username, value: p.total_points }))
        .sort((a, b) => b.value - a.value)
        .slice(0, maxBars)
      frames.push({ date: day.date, sorted })
    }

    if (frames.length < 2) return

    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(frames, f => d3.max(f.sorted, d => d.value)) || 100])
      .range([0, chartWidth])

    const yScale = d3.scaleBand()
      .domain(d3.range(maxBars).map(String))
      .range([0, chartHeight])
      .padding(0.2)
    const barHeight = yScale.bandwidth()

    // Date label
    const dateLabel = chart.append('text')
      .attr('x', chartWidth)
      .attr('y', -10)
      .attr('text-anchor', 'end')
      .attr('fill', '#a0aec0')
      .attr('font-size', 14)

    // X axis
    const xAxis = chart.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).ticks(6))
      .attr('color', '#2a2a2a')

    // Prepare bars
    const barGroups = chart.selectAll('g.bar-group')
      .data(d3.range(maxBars).reverse().map(String), (d: string) => d)
      .join('g')
      .attr('class', 'bar-group')
      .attr('transform', (_, i) => `translate(0,${yScale(String(i))!})`)

    barGroups.append('rect')
      .attr('height', barHeight)
      .attr('fill', (_, i) => BAR_COLORS[i % BAR_COLORS.length])
      .attr('rx', 3)

    barGroups.append('text')
      .attr('class', 'bar-label')
      .attr('x', -8)
      .attr('y', barHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#e5e5e5')
      .attr('font-size', 12)

    barGroups.append('text')
      .attr('class', 'bar-value')
      .attr('x', 8)
      .attr('y', barHeight / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#a0aec0')
      .attr('font-size', 11)

    let frameIndex = 0
    let isAnimating = true

    function updateFrame(idx: number) {
      const frame = frames[idx]
      const sorted = [...frame.sorted]
      while (sorted.length < maxBars) {
        sorted.push({ id: '', name: '', value: 0 })
      }

      // Update domain if needed
      const maxVal = d3.max(frame.sorted, d => d.value) || 100
      xScale.domain([0, maxVal])

      // Bars
      const groups = chart.selectAll('g.bar-group')
        .data(sorted, (d: any) => d.id || Math.random().toString())

      const entering = groups.enter()
        .append('g')
        .attr('class', 'bar-group')
        .attr('transform', `translate(0,${chartHeight})`)

      entering.append('rect')
        .attr('height', barHeight)
        .attr('fill', (_, i) => BAR_COLORS[i % BAR_COLORS.length])
        .attr('rx', 3)
        .attr('width', 0)

      entering.append('text')
        .attr('class', 'bar-label')
        .attr('x', -8)
        .attr('y', barHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#e5e5e5')
        .attr('font-size', 12)

      entering.append('text')
        .attr('class', 'bar-value')
        .attr('x', 8)
        .attr('y', barHeight / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#a0aec0')
        .attr('font-size', 11)

      const merged = groups.merge(entering as any)

      // Sort bars by value
      const sortedData = [...sorted].sort((a, b) => b.value - a.value)
      const rankMap = new Map(sortedData.map((d, i) => [d.id, i]))

      merged.sort((a: any, b: any) => (rankMap.get(a.id) ?? maxBars) - (rankMap.get(b.id) ?? maxBars))

      // Transition
      const t = d3.transition().duration(600).ease(d3.easeCubicOut)

      merged.transition(t)
        .attr('transform', (_: any, i: number) => `translate(0,${yScale(String(i))!})`)

      merged.select('rect')
        .transition(t)
        .attr('width', (d: any) => d.value > 0 ? xScale(d.value) : 0)

      merged.select('.bar-label')
        .text((d: any) => d.name)
        .attr('fill', (d: any) => d.name ? '#e5e5e5' : 'transparent')

      merged.select('.bar-value')
        .text((d: any) => d.value > 0 ? `${d.value} pts` : '')
        .attr('x', (d: any) => d.value > 0 ? xScale(d.value) + 8 : 0)

      // Remove excess
      merged.exit()
        .transition(t)
        .attr('transform', `translate(0,${chartHeight})`)
        .remove()

      // Update x axis
      xAxis.transition(t).call(d3.axisBottom(xScale).ticks(6))

      // Date
      dateLabel.text(formatDate(frame.date))
    }

    function formatDate(dateStr: string) {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    }

    // Start animation
    updateFrame(0)

    intervalRef.current = setInterval(() => {
      if (!isAnimating) return
      frameIndex++
      if (frameIndex >= frames.length) {
        frameIndex = 0
      }
      updateFrame(frameIndex)
    }, 1800)
  }, [data])

  useEffect(() => {
    animate()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [animate])

  if (!data.length) {
    return <p className="text-muted text-sm text-center py-12">No hay historial de puntos</p>
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
      <svg ref={svgRef} className="w-full" style={{ minHeight: 500 }} />
      <div className="px-4 pb-3 text-center">
        <p className="text-xs text-muted">Top 15 jugadores · animación ciclo continuo</p>
      </div>
    </div>
  )
}
