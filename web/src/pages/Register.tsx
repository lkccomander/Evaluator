import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', player_team_name: '', league_code: '' })
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        player_team_name: form.player_team_name,
        league_code: form.league_code || undefined,
      })
      navigate('/matches')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-surface-card border border-surface-border rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gold mb-6 text-center">Registrarse</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">Username</span>
            <input value={form.username} onChange={update('username')} placeholder="Username" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">Email</span>
            <input type="email" value={form.email} onChange={update('email')} placeholder="Email" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">Contraseña</span>
            <input type="password" value={form.password} onChange={update('password')} placeholder="Contraseña" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">Nombre del equipo</span>
            <input value={form.player_team_name} onChange={update('player_team_name')} placeholder="Nombre de equipo" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">Código de liga</span>
            <input value={form.league_code} onChange={update('league_code')} placeholder="Código de liga (opcional)" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" maxLength={9} />
          </label>
          {error && <p className="text-error text-xs">{error}</p>}
          <button type="submit" className="bg-gold text-black font-semibold py-2 rounded text-sm hover:bg-gold-dark transition-colors">Registrarse</button>
        </form>
        <p className="text-center text-xs text-muted mt-4">
          ¿Ya tienes cuenta? <Link to="/login" className="text-gold hover:underline">Ingresa</Link>
        </p>
      </div>
    </div>
  )
}
