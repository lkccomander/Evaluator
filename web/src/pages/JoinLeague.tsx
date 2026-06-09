import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinLeague } from '../api/leagues'
import { useAuth } from '../hooks/useAuth'

export default function JoinLeague() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  if (!user || user.league_id) {
    navigate('/matches')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await joinLeague(code)
      await refreshUser()
      navigate('/matches')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-surface-card border border-surface-border rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gold mb-2 text-center">Unirse a una Liga</h1>
        <p className="text-xs text-muted text-center mb-6">Ingresa el código que te dio el administrador</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="X7K2-MN9P"
            className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white text-center font-mono tracking-widest focus:outline-none focus:border-gold"
            maxLength={9}
            autoFocus
          />
          {error && <p className="text-error text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length < 8}
            className="bg-gold text-black font-semibold py-2 rounded text-sm disabled:opacity-50 hover:bg-gold-dark transition-colors"
          >
            {loading ? '...' : 'Unirse'}
          </button>
        </form>
      </div>
    </div>
  )
}
