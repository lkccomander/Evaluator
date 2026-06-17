import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGlobalLeaderboard, getMyLeagueLeaderboard, getLeagueLeaderboard, getLeaderboardHistory } from '../api/leaderboard'
import { listLeagues } from '../api/leagues'
import { getBannerMessages, postBannerMessage } from '../api/banner'
import { useAuth } from '../hooks/useAuth'
import LeaderboardTable from '../components/LeaderboardTable'
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

    if (!line.trim()) {
      i++
      continue
    }

    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      elements.push(
        <pre key={`code-${key++}`} className="overflow-x-auto rounded-2xl border border-surface-border/80 bg-black/40 p-4 text-xs text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      continue
    }

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={`hr-${key++}`} className="border-surface-border/60" />)
      i++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const className = level === 1
        ? 'text-3xl font-black tracking-tight text-white'
        : level === 2
          ? 'text-xl font-semibold tracking-wide text-gold'
          : 'text-sm font-semibold uppercase tracking-[0.22em] text-slate-200'
      if (level === 1) {
        elements.push(
          <div key={`hero-${key++}`} className="rounded-2xl border border-gold/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(20,20,20,0.98)_42%,rgba(20,20,20,0.96)_100%)] px-5 py-5 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold/80">Reglamento Oficial</div>
            <h1 className={className}>{renderInlineMarkdown(text)}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Todo lo que necesitas para entender puntajes, deadlines, ligas y desempates de la quiniela.
            </p>
          </div>,
        )
      } else if (level === 2) {
        elements.push(
          <div key={`h-${key++}`} className="pt-3">
            <h2 className={className}>{renderInlineMarkdown(text)}</h2>
          </div>,
        )
      } else {
        elements.push(<h3 key={`h-${key++}`} className={className}>{renderInlineMarkdown(text)}</h3>)
      }
      i++
      continue
    }

    const isTableRow = (value: string) => value.includes('|') && value.trim().startsWith('|') && value.trim().endsWith('|')
    if (
      isTableRow(line)
      && i + 1 < lines.length
      && /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[i + 1].trim())
    ) {
      const headerCells = line.split('|').slice(1, -1).map(cell => cell.trim())
      const bodyRows: string[][] = []
      i += 2
      while (i < lines.length && isTableRow(lines[i].trim())) {
        bodyRows.push(lines[i].split('|').slice(1, -1).map(cell => cell.trim()))
        i++
      }
      elements.push(
        <div key={`table-${key++}`} className="overflow-x-auto rounded-2xl border border-surface-border/80 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-[11px] uppercase tracking-[0.22em] text-muted">
                {headerCells.map((cell, idx) => (
                  <th key={idx} className="bg-white/[0.02] px-3 py-3">{renderInlineMarkdown(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-surface-border/50 align-top odd:bg-white/[0.01]">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-3 text-slate-200">{renderInlineMarkdown(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    if (/^- /.test(line.trim())) {
      const items: string[] = []
      while (i < lines.length && /^- /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^- /, ''))
        i++
      }
      elements.push(
        <ul key={`ul-${key++}`} className="space-y-2 text-sm text-slate-200">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gold/90" />
              <span className="flex-1">{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\d+\. /.test(line.trim())) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={`ol-${key++}`} className="space-y-2 text-sm text-slate-200">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-mono text-xs text-gold">
                {idx + 1}
              </span>
              <span className="flex-1 pt-0.5">{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ol>,
      )
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length && lines[i].trim()) {
      const current = lines[i].trim()
      if (
        current.startsWith('```')
        || /^---+$/.test(current)
        || /^(#{1,6})\s+/.test(current)
        || (/^- /.test(current))
        || (/^\d+\. /.test(current))
        || (isTableRow(current) && i + 1 < lines.length && /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[i + 1].trim()))
      ) {
        break
      }
      paragraphLines.push(current)
      i++
    }
    if (paragraphLines.length) {
      elements.push(
        <p key={`p-${key++}`} className="text-sm leading-7 text-slate-200">
          {renderInlineMarkdown(paragraphLines.join(' '))}
        </p>,
      )
    }
  }

  return elements
}

function useTimer(expiresAt: string | null) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!expiresAt) return
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      setRemaining(Math.max(0, diff))
    }
    update()
    const id = setInterval(update, 1000)
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banner'] })
      setText('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
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
          {remaining > 0 ? (
            <p className="font-mono text-xs text-gold">{formatTimer(remaining)}</p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escribe un mensaje para el banner (max 3h)..."
            className="flex-1 bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold"
          />
          <button
            onClick={() => mut.mutate(text)}
            disabled={mut.isPending || !text.trim()}
            className="bg-gold text-black font-semibold px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-gold-dark transition-colors min-h-[44px]"
          >
            {mut.isPending ? '...' : 'Publicar'}
          </button>
          {success && <span className="text-green-500 text-sm font-semibold">Mensaje publicado</span>}
        </div>
      )}
      {mut.isError && (
        <p className="mt-2 text-error text-xs">{(mut.error as Error)?.message || 'Error al publicar'}</p>
      )}
    </section>
  )
}

export default function Leaderboard() {
  const { user, isAdmin } = useAuth()
  const [view, setView] = useState<'global' | 'league'>(isAdmin ? 'global' : 'league')
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')
  const [rulesMarkdown, setRulesMarkdown] = useState('')
  const [rulesOpen, setRulesOpen] = useState(false)

  const { data: global, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: getGlobalLeaderboard,
    enabled: isAdmin && view === 'global',
    refetchInterval: 60_000,
  })

  const { data: league, isLoading: leagueLoading, isError: leagueError } = useQuery({
    queryKey: ['leaderboard', 'mine'],
    queryFn: getMyLeagueLeaderboard,
    enabled: view === 'league' && !isAdmin && !!user?.league_id,
    refetchInterval: 60_000,
  })

  const { data: leagues = [] } = useQuery({
    queryKey: ['leaderboard', 'leagues'],
    queryFn: listLeagues,
    enabled: isAdmin,
    refetchInterval: 60_000,
  })

  const { data: adminLeagueEntries, isLoading: adminLeagueLoading, isError: adminLeagueError } = useQuery({
    queryKey: ['leaderboard', 'league', selectedLeagueId],
    queryFn: () => getLeagueLeaderboard(selectedLeagueId),
    enabled: isAdmin && view === 'league' && !!selectedLeagueId,
    refetchInterval: 60_000,
  })

  const historyLeagueId = view === 'league'
    ? (isAdmin ? selectedLeagueId || undefined : user?.league_id || undefined)
    : undefined

  const { data: historyData, isLoading: historyLoading, isError: historyError } = useQuery({
    queryKey: ['leaderboard', 'history', historyLeagueId],
    queryFn: () => getLeaderboardHistory(historyLeagueId),
    enabled: view === 'global' || !!historyLeagueId,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!isAdmin) return
    if (selectedLeagueId) return
    if (!leagues.length) return
    setSelectedLeagueId(leagues[0].id)
  }, [isAdmin, leagues, selectedLeagueId])

  useEffect(() => {
    let cancelled = false

    fetch('/reglas-quiniela-2026.md')
      .then(res => res.ok ? res.text() : '')
      .then(text => {
        if (!cancelled) setRulesMarkdown(text)
      })
      .catch(() => {
        if (!cancelled) setRulesMarkdown('')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loading = view === 'global'
    ? isLoading
    : (isAdmin ? adminLeagueLoading : leagueLoading)
  const error = view === 'global'
    ? isError
    : (isAdmin ? adminLeagueError : leagueError)
  const entries = view === 'global'
    ? (global ?? [])
    : (isAdmin ? (adminLeagueEntries ?? []) : (league ?? []))

  return (
    <div>
      <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold">Leaderboard</h1>
        <div className="flex bg-surface-card border border-surface-border rounded-lg overflow-hidden">
          {isAdmin && (
            <button
              onClick={() => setView('global')}
              className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${view === 'global' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
            >
              Global
            </button>
          )}
          {(isAdmin || user?.league_id) && (
            <button
              onClick={() => setView('league')}
              className={`px-4 py-2 text-xs font-semibold transition-colors min-h-[44px] ${view === 'league' ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
            >
              {isAdmin ? 'Ligas' : 'Mi Liga'}
            </button>
          )}
        </div>
        </div>
        {isAdmin && view === 'league' && (
          <div className="flex items-center gap-2">
            <label htmlFor="leaderboard-league" className="text-xs text-muted">Liga</label>
            <select
              id="leaderboard-league"
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
      <div className="bg-surface-card border border-surface-border rounded-lg p-4">
        {!isAdmin && !user?.league_id ? (
          <p className="text-muted text-sm text-center">Necesitas pertenecer a una liga para ver rankings.</p>
        ) : isAdmin && view === 'league' && !selectedLeagueId ? (
          <p className="text-muted text-sm text-center">No hay ligas disponibles.</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-error text-sm text-center">Error al cargar el leaderboard</p>
        ) : !entries.length ? (
          <p className="text-muted text-sm text-center">No hay participantes</p>
        ) : (
          <LeaderboardTable entries={entries} showLeague={view === 'global'} />
        )}
      </div>

      <div className="mt-6 bg-surface-card border border-surface-border rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Evolución de puntos</h2>
        <PointsChart data={historyData ?? []} loading={historyLoading} error={historyError} />
      </div>
      <div className="mt-4 rounded-2xl border border-gold/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(20,20,20,0.96)_55%)] px-4 py-3">
        <p className="text-sm text-slate-200">
          <span className="mr-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-gold/30 bg-gold/10 px-2 text-base">✅</span>
          Esta marca indica que el jugador esta verificado en la quiniela.
        </p>
      </div>

      <BannerMessageSection />
      <section className="mt-6 rounded-[28px] border border-surface-border bg-[linear-gradient(180deg,rgba(26,26,26,0.98),rgba(15,15,15,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <button
            type="button"
            onClick={() => setRulesOpen(open => !open)}
            className="flex flex-1 items-center justify-between gap-4 rounded-2xl border border-surface-border/80 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-gold/30 hover:bg-gold/5"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold/75">Documento</div>
              <h2 className="text-lg font-bold text-white">Reglas de la quiniela</h2>
              <p className="mt-1 text-sm text-muted">
                {rulesOpen ? 'Ocultar reglamento completo' : 'Mostrar reglamento completo'}
              </p>
            </div>
            <span
              className={`text-2xl leading-none text-gold transition-transform ${rulesOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
          <a
            href="/reglas-quiniela-2026.md"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-gold/30 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/10"
          >
            Abrir markdown original
          </a>
        </div>
        {rulesOpen ? (
          rulesMarkdown ? (
            <div className="space-y-5 border-t border-surface-border/80 px-5 pb-5 pt-2 md:px-6 md:pb-6">
              {renderRulesMarkdown(rulesMarkdown)}
            </div>
          ) : (
            <p className="px-5 pb-5 text-sm text-muted md:px-6 md:pb-6">No se pudieron cargar las reglas en este momento.</p>
          )
        ) : (
          <div className="border-t border-surface-border/80 px-5 pb-5 pt-4 md:px-6 md:pb-6">
            <p className="max-w-3xl text-sm leading-7 text-slate-300">
              Revisa puntajes, desempates, deadlines y funcionamiento de ligas cuando lo necesites. El reglamento completo queda disponible aqui mismo sin salir del leaderboard.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
