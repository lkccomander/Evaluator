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

  return (
    <div className="min-h-screen bg-surface">
      <nav className="border-b border-surface-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-gold font-bold text-lg tracking-tight">QUINI26</Link>
          {navItems.map(item => {
            if (item.auth && !user) return null
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm transition-colors ${
                  location.pathname === item.path ? 'text-gold' : 'text-muted hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          {isAdmin && adminItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm transition-colors ${
                location.pathname === item.path ? 'text-gold' : 'text-muted hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-xs text-muted">{user.player_team_name || user.username}</span>
              <button onClick={logout} className="text-xs text-muted hover:text-error transition-colors">Salir</button>
            </>
          ) : (
            <Link to="/login" className="text-xs text-gold hover:underline">Ingresar</Link>
          )}
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
