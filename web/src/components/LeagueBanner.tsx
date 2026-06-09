import { useState } from 'react'
import { joinLeague } from '../api/leagues'
import { useAuth } from '../hooks/useAuth'

export default function LeagueBanner() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, refreshUser } = useAuth()

  if (!user || user.league_id) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await joinLeague(code)
      await refreshUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al unirse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 mb-6">
      <p className="text-sm text-muted mb-2">
        Necesitas unirte a una liga para poder pronosticar.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Código de liga (ej. X7K2-MN9P)"
          className="flex-1 bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold"
          maxLength={9}
        />
        <button
          type="submit"
          disabled={loading || code.length < 8}
          className="bg-gold text-black font-semibold px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-gold-dark transition-colors"
        >
          {loading ? '...' : 'Unirse'}
        </button>
      </form>
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  )
}
