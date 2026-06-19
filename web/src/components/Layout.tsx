import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PlayerTeamName } from './TeamFlag'
import { updateProfile } from '../api/auth'
import GameTicker from './GameTicker'

const navItems = [
  { path: '/matches', label: 'Partidos', auth: true },
  { path: '/results', label: 'Resultados', auth: true },
  { path: '/my-predictions', label: 'Mis Pronósticos', auth: true },
  { path: '/leaderboard', label: 'Leaderboard', auth: true },
  { path: '/status', label: 'Status', auth: false },
]

const adminItems = [
  { path: '/admin/leagues', label: 'Admin Ligas' },
  { path: '/admin/results', label: 'Admin Resultados' },
  { path: '/admin/users', label: 'Admin Usuarios' },
  { path: '/admin/banner-config', label: 'Config Banner' },
  { path: '/admin/settings', label: 'Config' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout, refreshUser } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editTeamName, setEditTeamName] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const isActive = (path: string) =>
    location.pathname === path ? 'text-gold' : 'text-muted hover:text-white'

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError('')
    setEditLoading(true)
    try {
      const body: { display_name?: string | null; player_team_name?: string } = {}
      if (editDisplayName.trim()) {
        body.display_name = editDisplayName.trim()
      } else {
        body.display_name = null
      }
      if (editTeamName.trim()) {
        body.player_team_name = editTeamName.trim()
      }
      await updateProfile(body)
      await refreshUser()
      setEditOpen(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setEditLoading(false)
    }
  }

  const allLinks = [
    ...navItems.filter(i => !i.auth || user),
    ...(isAdmin ? adminItems : []),
  ]

  return (
    <div className="min-h-screen bg-surface">
      <nav className="sticky top-0 z-50 border-b border-surface-border px-4 py-3 bg-surface/95 backdrop-blur flex items-center justify-between"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-gold font-bold text-lg tracking-tight">QUINI26</Link>
          <div className="hidden md:flex items-center gap-6">
            {allLinks.map(item => (
              <Link key={item.path} to={item.path} className={`text-sm transition-colors ${isActive(item.path)}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="hidden sm:inline text-xs text-muted">
                <PlayerTeamName name={user.player_team_name || user.username} verified={user.is_verified} disabled={user.is_disabled} />
                <button
                  onClick={() => { setEditDisplayName(user.display_name || ''); setEditTeamName(user.player_team_name || ''); setEditError(''); setEditOpen(true) }}
                  className="ml-1.5 align-middle text-muted hover:text-white transition-colors"
                  aria-label="Editar perfil"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </span>
              <button onClick={logout} className="text-xs text-muted hover:text-error transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">Salir</button>
            </>
          ) : (
            <Link to="/login" className="text-xs text-gold hover:underline min-h-[44px] min-w-[44px] flex items-center justify-center">Ingresar</Link>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-muted hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
	      </nav>

	      <GameTicker />

	      {menuOpen && (
        <div className="md:hidden border-b border-surface-border bg-surface-card">
          <div className="px-4 py-2 flex flex-col gap-1">
            {allLinks.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`py-3 text-sm transition-colors ${isActive(item.path)}`}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <span className="sm:hidden py-2 text-xs text-muted border-t border-surface-border mt-1 pt-3 flex items-center gap-1">
                <PlayerTeamName name={user.player_team_name || user.username} verified={user.is_verified} disabled={user.is_disabled} />
                <button
                  onClick={() => { setEditDisplayName(user.display_name || ''); setEditTeamName(user.player_team_name || ''); setEditError(''); setEditOpen(true); setMenuOpen(false) }}
                  className="text-muted hover:text-white transition-colors"
                  aria-label="Editar perfil"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => !editLoading && setEditOpen(false)}>
          <div className="bg-surface-card border border-surface-border rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-semibold text-lg mb-4">Editar Perfil</h2>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-muted mb-1">Nombre visible</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  className="w-full bg-surface text-white border border-surface-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors"
                  placeholder="Tu nombre público"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Equipo</label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={e => setEditTeamName(e.target.value)}
                  className="w-full bg-surface text-white border border-surface-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors"
                  placeholder="Nombre de tu equipo"
                />
              </div>
              {editError && <p className="text-error text-xs">{editError}</p>}
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={editLoading}
                  className="px-4 py-2 text-xs text-muted hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 text-xs bg-gold text-black font-semibold rounded hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {editLoading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {children}
      </main>
    </div>
  )
}
