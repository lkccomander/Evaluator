import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getMyKnockoutLeaderboard, getKnockoutLeaderboard, getKnockoutLeaderboardByLeague } from '../api/knockout'
import { listLeagues } from '../api/leagues'
import { getBannerMessages, postBannerMessage } from '../api/banner'
import { getLeaderboardHistory } from '../api/leaderboard'
import { PlayerTeamName } from '../components/TeamFlag'
import PointsChart from '../components/PointsChart'

function renderInlineMarkdown(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={index} className="font-semibold text-white">{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={index} className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[0.9em] text-gold">{token.slice(1, -1)}</code>
    }
    return <span key={index}>{token}</span>
  })
}

function renderRulesMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/)
  const elements: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i].trimEnd()
    if (!line.trim()) { i++; continue }
    if (line.startsWith('```')) {
      const codeLines: string[] = []; i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++ }
      i++
      elements.push(<pre key={`code-${key++}`} className="overflow-x-auto rounded-2xl border border-surface-border/80 bg-black/40 p-4 text-xs text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"><code>{codeLines.join('\n')}</code></pre>)
      continue
    }
    if (/^---+$/.test(line.trim())) { elements.push(<hr key={`hr-${key++}`} className="border-surface-border/60" />); i++; continue }
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length; const text = headingMatch[2]
      if (level === 1) {
        elements.push(<div key={`hero-${key++}`} className="rounded-2xl border border-gold/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(20,20,20,0.98)_42%,rgba(20,20,20,0.96)_100%)] px-5 py-5 shadow-[0_18px_55px_rgba(0,0,0,0.28)]"><div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold/80">Reglamento Oficial</div><h1 className="text-3xl font-black tracking-tight text-white">{renderInlineMarkdown(text)}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Todo lo que necesitas para entender puntajes, deadlines, ligas y desempates de la quiniela.</p></div>)
      } else if (level === 2) {
        elements.push(<div key={`h-${key++}`} className="pt-3"><h2 className="text-xl font-semibold tracking-wide text-gold">{renderInlineMarkdown(text)}</h2></div>)
      } else {
        elements.push(<h3 key={`h-${key++}`} className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200">{renderInlineMarkdown(text)}</h3>)
      }
      i++; continue
    }
    const isTableRow = (value: string) => value.includes('|') && value.trim().startsWith('|') && value.trim().endsWith('|')
    if (isTableRow(line) && i + 1 < lines.length && /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[i + 1].trim())) {
      const headerCells = line.split('|').slice(1, -1).map(cell => cell.trim())
      const bodyRows: string[][] = []; i += 2
      while (i < lines.length && isTableRow(lines[i].trim())) { bodyRows.push(lines[i].split('|').slice(1, -1).map(cell => cell.trim())); i++ }
      elements.push(<div key={`table-${key++}`} className="overflow-x-auto rounded-2xl border border-surface-border/80 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"><table className="w-full min-w-[520px] border-collapse text-sm"><thead><tr className="border-b border-surface-border text-left text-[11px] uppercase tracking-[0.22em] text-muted">{headerCells.map((cell, idx) => <th key={idx} className="bg-white/[0.02] px-3 py-3">{renderInlineMarkdown(cell)}</th>)}</tr></thead><tbody>{bodyRows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-surface-border/50 align-top odd:bg-white/[0.01]">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3 text-slate-200">{renderInlineMarkdown(cell)}</td>)}</tr>)}</tbody></table></div>)
      continue
    }
    if (/^- /.test(line.trim())) {
      const items: string[] = []
      while (i < lines.length && /^- /.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^- /, '')); i++ }
      elements.push(<ul key={`ul-${key++}`} className="space-y-2 text-sm text-slate-200">{items.map((item, idx) => <li key={idx} className="flex items-start gap-3"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-gold/90" /><span className="flex-1">{renderInlineMarkdown(item)}</span></li>)}</ul>)
      continue
    }
    if (/^\d+\. /.test(line.trim())) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\. /, '')); i++ }
      elements.push(<ol key={`ol-${key++}`} className="space-y-2 text-sm text-slate-200">{items.map((item, idx) => <li key={idx} className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-mono text-xs text-gold">{idx + 1}</span><span className="flex-1 pt-0.5">{renderInlineMarkdown(item)}</span></li>)}</ol>)
      continue
    }
    const paragraphLines: string[] = []
    while (i < lines.length && lines[i].trim()) {
      const current = lines[i].trim()
      if (current.startsWith('```') || /^---+$/.test(current) || /^(#{1,6})\s+/.test(current) || /^- /.test(current) || /^\d+\. /.test(current) || (isTableRow(current) && i + 1 < lines.length && /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[i + 1].trim()))) break
      paragraphLines.push(current); i++
    }
    if (paragraphLines.length) elements.push(<p key={`p-${key++}`} className="text-sm leading-7 text-slate-200">{renderInlineMarkdown(paragraphLines.join(' '))}</p>)
  }
  return elements
}

function useTimer(expiresAt: string | null) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!expiresAt) return
    const update = () => { const diff = new Date(expiresAt).getTime() - Date.now(); setRemaining(Math.max(0, diff)) }
    update(); const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return remaining
}

function formatTimer(ms: number) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
}

function BannerMessageSection() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: banners = [] } = useQuery({
    queryKey: ['banner'],
    queryFn: getBannerMessages,
    refetchInterval: 60_000,
  })

  const banner = banners[0] ?? null
  const myMessage = banner?.created_by === user?.id
  const remaining = useTimer(banner?.expires_at ?? null)

  const mut = useMutation({
    mutationFn: (msg: string) => postBannerMessage(msg),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['banner'] }); setText(''); setSuccess(true); setTimeout(() => setSuccess(false), 3000) },
  })

  return (
    <section className="mt-6 rounded-[28px] border border-surface-border bg-[linear-gradient(180deg,rgba(26,26,26,0.98),rgba(15,15,15,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.35)] p-5 md:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-gold mb-4">Mensaje en el banner</h2>
      {banner ? (
        <div>
          <p className="text-sm text-slate-300 mb-1">
            {myMessage ? 'Tu mensaje:' : 'Mensaje activo:'}{' '}
            <span className="text-white font-semibold">&ldquo;{banner.message}&rdquo;</span>
          </p>
          {remaining > 0 ? <p className="font-mono text-xs text-gold">{formatTimer(remaining)}</p> : null}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Escribe un mensaje para el banner (max 3h)..." className="flex-1 bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
          <button onClick={() => mut.mutate(text)} disabled={mut.isPending || !text.trim()} className="bg-gold text-black font-semibold px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-gold-dark transition-colors min-h-[44px]">{mut.isPending ? '...' : 'Publicar'}</button>
          {success && <span className="text-green-500 text-sm font-semibold">Mensaje publicado</span>}
        </div>
      )}
      {mut.isError && <p className="mt-2 text-error text-xs">{(mut.error as Error)?.message || 'Error al publicar'}</p>}
    </section>
  )
}

export default function KnockoutLeaderboard() {
  const { user, isAdmin } = useAuth()
  const [view, setView] = useState<'my' | 'league'>(isAdmin ? 'league' : 'my')
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')

  const { data: myEntries, isLoading: myLoading, isError: myError } = useQuery({
    queryKey: ['knockout-leaderboard', 'mine'],
    queryFn: getMyKnockoutLeaderboard,
    enabled: !isAdmin && !!user?.league_id,
    refetchInterval: 30_000,
  })

  const { data: allEntries } = useQuery({
    queryKey: ['knockout-leaderboard', 'global'],
    queryFn: getKnockoutLeaderboard,
    enabled: isAdmin && view === 'my',
    refetchInterval: 30_000,
  })

  const { data: leagues = [] } = useQuery({
    queryKey: ['knockout-leaderboard', 'leagues'],
    queryFn: listLeagues,
    enabled: isAdmin,
  })

  const { data: leagueEntries, isLoading: leagueLoading, isError: leagueError } = useQuery({
    queryKey: ['knockout-leaderboard', 'league', selectedLeagueId],
    queryFn: () => getKnockoutLeaderboardByLeague(selectedLeagueId),
    enabled: isAdmin && view === 'league' && !!selectedLeagueId,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!isAdmin) return
    if (selectedLeagueId) return
    if (!leagues.length) return
    setSelectedLeagueId(leagues[0].id)
  }, [isAdmin, leagues, selectedLeagueId])

  const historyLeagueId = isAdmin ? (view === 'league' ? selectedLeagueId || undefined : undefined) : user?.league_id || undefined

  const { data: historyData, isLoading: historyLoading, isError: historyError } = useQuery({
    queryKey: ['leaderboard', 'history', historyLeagueId],
    queryFn: () => getLeaderboardHistory(historyLeagueId),
    enabled: !!historyLeagueId || !isAdmin,
    refetchInterval: 60_000,
  })

  const [rulesMarkdown, setRulesMarkdown] = useState('')
  const [rulesOpen, setRulesOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/reglas-quiniela-2026.md')
      .then(res => res.ok ? res.text() : '')
      .then(text => { if (!cancelled) setRulesMarkdown(text) })
      .catch(() => { if (!cancelled) setRulesMarkdown('') })
    return () => { cancelled = true }
  }, [])

  const loading = isAdmin ? (view === 'league' ? leagueLoading : false) : myLoading
  const error = isAdmin ? (view === 'league' ? leagueError : false) : myError
  const entries = isAdmin
    ? (view === 'league' ? (leagueEntries ?? []) : (allEntries ?? []))
    : (myEntries ?? [])

  const rankMedal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">KO Leaderboard</h1>
          <p className="text-xs text-muted">Puntos de eliminatorias solamente</p>
          {isAdmin && (
            <div className="flex bg-surface-card border border-surface-border rounded-lg overflow-hidden">
              <button
                onClick={() => setView('my')}
                className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${view === 'my' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
              >
                Global
              </button>
              <button
                onClick={() => setView('league')}
                className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${view === 'league' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
              >
                Ligas
              </button>
            </div>
          )}
        </div>
        {isAdmin && view === 'league' && (
          <div className="flex items-center gap-2">
            <label htmlFor="ko-league" className="text-xs text-muted">Liga</label>
            <select
              id="ko-league"
              value={selectedLeagueId}
              onChange={e => setSelectedLeagueId(e.target.value)}
              className="bg-surface-card border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold"
            >
              {leagues.map(league => (
                <option key={league.id} value={league.id}>{league.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!isAdmin && !user?.league_id ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-muted text-sm">Necesitas pertenecer a una liga para ver el KO leaderboard.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-error text-sm">Error al cargar la tabla de eliminatorias</p>
        </div>
      ) : !entries?.length ? (
        <div className="bg-surface-card border border-surface-border rounded-lg p-6 text-center">
          <p className="text-muted text-sm">No hay puntos de eliminatorias aún</p>
        </div>
      ) : (
        <div className="bg-surface-card border border-surface-border rounded-lg p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs">
                  <th className="text-left py-2 pr-2">#</th>
                  <th className="text-left py-2 pr-2">Jugador</th>
                  <th className="text-right py-2 pr-2">Pts</th>
                  <th className="text-right py-2 pr-2">Gol Pts</th>
                  <th className="text-right py-2 pr-2">Exactos</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.user_id} className="border-b border-surface-border/50 hover:bg-surface/50 transition-colors">
                    <td className="py-2 pr-2 font-mono text-xs">{rankMedal(i + 1)}</td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <PlayerTeamName name={e.player_team_name} verified={e.is_verified} disabled={e.is_disabled} roundOf16={e.round_of_16} />
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-right font-mono font-bold text-gold">{e.total_points}</td>
                    <td className="py-2 pr-2 text-right font-mono text-muted">{e.total_goal_pts}</td>
                    <td className="py-2 pr-2 text-right font-mono text-muted">{e.exact_hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 bg-surface-card border border-surface-border rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Evolución de puntos</h2>
        <PointsChart data={historyData ?? []} loading={historyLoading} error={historyError} />
      </div>

      <BannerMessageSection />

      <section className="mt-6 rounded-[28px] border border-surface-border bg-[linear-gradient(180deg,rgba(26,26,26,0.98),rgba(15,15,15,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <button
            type="button"
            onClick={() => setRulesOpen(o => !o)}
            className="flex flex-1 items-center justify-between gap-4 rounded-2xl border border-surface-border/80 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-gold/30 hover:bg-gold/5"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold/75">Documento</div>
              <h2 className="text-lg font-bold text-white">Reglas de la quiniela</h2>
              <p className="mt-1 text-sm text-muted">{rulesOpen ? 'Ocultar reglamento completo' : 'Mostrar reglamento completo'}</p>
            </div>
            <span className={`text-2xl leading-none text-gold transition-transform ${rulesOpen ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
          </button>
          <a href="/reglas-quiniela-2026.md" target="_blank" rel="noreferrer" className="rounded-full border border-gold/30 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/10">Abrir markdown original</a>
        </div>
        {rulesOpen ? (
          rulesMarkdown ? (
            <div className="space-y-5 border-t border-surface-border/80 px-5 pb-5 pt-2 md:px-6 md:pb-6">{renderRulesMarkdown(rulesMarkdown)}</div>
          ) : (
            <p className="px-5 pb-5 text-sm text-muted md:px-6 md:pb-6">No se pudieron cargar las reglas en este momento.</p>
          )
        ) : (
          <div className="border-t border-surface-border/80 px-5 pb-5 pt-4 md:px-6 md:pb-6">
            <p className="max-w-3xl text-sm leading-7 text-slate-300">Revisa puntajes, desempates, deadlines y funcionamiento de ligas cuando lo necesites. El reglamento completo queda disponible aqui mismo sin salir del leaderboard.</p>
          </div>
        )}
      </section>
    </div>
  )
}
