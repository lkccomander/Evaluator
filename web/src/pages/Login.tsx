import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/matches')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-surface-card border border-surface-border rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gold mb-6 text-center">Iniciar Sesión</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold"
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold"
            required
          />
          {error && <p className="text-error text-xs">{error}</p>}
          <button
            type="submit"
            className="bg-gold text-black font-semibold py-2 rounded text-sm hover:bg-gold-dark transition-colors"
          >
            Entrar
          </button>
        </form>
        <p className="text-center text-xs text-muted mt-4">
          ¿No tienes cuenta? <Link to="/register" className="text-gold hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
