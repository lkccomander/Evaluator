import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { GraphNode, GraphLink } from '../api/visualization'

interface Props {
  nodes: GraphNode[]
  links: GraphLink[]
}

const TEAM_COLORS: Record<string, string> = {
  'Argentina': '#75AADB', 'Australia': '#FFD700', 'Austria': '#ED2939',
  'Bolivia': '#D52B1E', 'Brazil': '#009739', 'Cameroon': '#007A5E',
  'Canada': '#FF0000', 'Chile': '#0039A6', 'Colombia': '#FCD116',
  'Costa Rica': '#002B7F', "Côte d'Ivoire": '#F77F00', 'Croatia': '#ED1C24',
  'Denmark': '#C60C30', 'Ecuador': '#FFD100', 'Egypt': '#CE1126',
  'England': '#CF142B', 'France': '#002395', 'Germany': '#DD0000',
  'Ghana': '#006B3F', 'Greece': '#0D5EAF', 'Honduras': '#0080C8',
  'Hungary': '#CD2A3E', 'Iran': '#DA0000', 'Iraq': '#007A5E',
  'Italy': '#009246', 'Japan': '#BC002D', 'Mexico': '#006847',
  'Morocco': '#C1272D', 'Netherlands': '#FF6600', 'Nigeria': '#008751',
  'Norway': '#BA0C2F', 'Panama': '#005493', 'Paraguay': '#D52B1E',
  'Peru': '#D91023', 'Poland': '#DC143C', 'Portugal': '#006600',
  'Saudi Arabia': '#006C35', 'Senegal': '#00853F', 'Serbia': '#0C4076',
  'Slovakia': '#0B4EA2', 'Slovenia': '#005DA4', 'South Africa': '#007A4D',
  'South Korea': '#CD2E3A', 'Spain': '#C60B1E', 'Sweden': '#FECC02',
  'Switzerland': '#FF0000', 'Tunisia': '#E70013', 'Turkey': '#E30A17',
  'Ukraine': '#005BBB', 'United States': '#3C3B6E', 'Uruguay': '#0038A8',
  'Venezuela': '#FCD116', 'Wales': '#D30731',
}

function getTeamColor(name: string): string {
  return TEAM_COLORS[name] || '#666'
}

export default function PredictionGraph({ nodes, links }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return

    const width = svgRef.current.clientWidth
    const height = 700

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g')

    // Zoom
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    )

    // Force simulation
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
        .id(d => (d as unknown as GraphNode).id)
        .distance(d => {
          const l = d as unknown as GraphLink
          return l.total > 0 ? 120 : 180
        })
      )
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35))

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', d => {
        const l = d as unknown as GraphLink
        return l.total > 0 ? 1 + Math.min(l.total / 5, 6) : 0.5
      })
      .attr('stroke', d => {
        const l = d as unknown as GraphLink
        if (l.total === 0) return '#1f1f1f'
        const max = Math.max(l.local, l.empate, l.visita)
        if (max === l.local) return '#3b82f6'
        if (max === l.visita) return '#ef4444'
        return '#6b7280'
      })
      .attr('stroke-opacity', d => {
        const l = d as unknown as GraphLink
        return l.total > 0 ? 0.8 : 0.2
      })
      .attr('class', 'transition-all')

    // Link labels (hover only)
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .text(d => {
        const l = d as unknown as GraphLink
        if (l.total === 0) return ''
        const pctLocal = (l.local / l.total * 100).toFixed(0)
        const pctVisita = (l.visita / l.total * 100).toFixed(0)
        const pctEmp = (l.empate / l.total * 100).toFixed(0)
        return `#${l.match_number} L:${pctLocal}% E:${pctEmp}% V:${pctVisita}%`
      })
      .attr('font-size', 9)
      .attr('fill', '#6b7280')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .style('pointer-events', 'none')
      .style('opacity', 0)

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        })
      )

    node.append('circle')
      .attr('r', d => {
        const n = d as unknown as GraphNode
        let totalPredictions = 0
        for (const link of links) {
          if (link.source === n.id || link.target === n.id) {
            totalPredictions += link.total
          }
        }
        return 10 + Math.min(totalPredictions / 8, 20)
      })
      .attr('fill', d => getTeamColor((d as unknown as GraphNode).name))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'grab')

    node.append('text')
      .text(d => (d as unknown as GraphNode).name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => {
        const n = d as unknown as GraphNode
        let totalPredictions = 0
        for (const link of links) {
          if (link.source === n.id || link.target === n.id) totalPredictions += link.total
        }
        return 16 + Math.min(totalPredictions / 8, 20)
      })
      .attr('fill', '#e5e5e5')
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .style('pointer-events', 'none')

    // Hover: show link details
    node.on('mouseenter', (_event, d) => {
      const n = d as unknown as GraphNode
      linkLabel
        .style('opacity', (ld: unknown) => {
          const l = ld as GraphLink
          return l.source === n.id || l.target === n.id ? 1 : 0
        })
    })
    node.on('mouseleave', () => {
      linkLabel.style('opacity', 0)
    })

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y)

      linkLabel
        .attr('x', d => ((d.source as any).x + (d.target as any).x) / 2)
        .attr('y', d => ((d.source as any).y + (d.target as any).y) / 2)

      node.attr('transform', d => `translate(${(d as any).x},${(d as any).y})`)
    })

    return () => { simulation.stop() }
  }, [nodes, links])

  if (!nodes.length) {
    return <p className="text-muted text-sm text-center py-12">No hay datos de partidos para graficar</p>
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
      <svg ref={svgRef} className="w-full" style={{ minHeight: 700 }} />
      <div className="flex items-center justify-center gap-6 px-4 pb-3 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#1f1f1f] inline-block" /> Sin predicciones</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block" /> Mayoría Local</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block" /> Mayoría Visita</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#6b7280] inline-block" /> Mayoría Empate</span>
        <span className="text-muted">· Hover en equipo para ver detalles</span>
      </div>
    </div>
  )
}
