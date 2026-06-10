import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { path: '/matches', label: 'Partidos', auth: true },
  { path: '/my-predictions', label: 'Mis Pronósticos', auth: true },
  { path: '/leaderboard', label: 'Leaderboard', auth: false },
]

const adminItems = [
  { path: '/admin/leagues', label: 'Admin Ligas' },
  { path: '/admin/results', label: 'Admin Resultados' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path: string) =>
    location.pathname === path ? 'text-gold' : 'text-muted hover:text-white'

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
              <span className="hidden sm:inline text-xs text-muted">{user.player_team_name || user.username}</span>
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
              <span className="sm:hidden py-2 text-xs text-muted border-t border-surface-border mt-1 pt-3">
                {user.player_team_name || user.username}
              </span>
            )}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {children}
      </main>
    </div>
  )
}
