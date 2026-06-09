import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listLeagues, createLeague, getLeagueMembers } from '../api/leagues'

export default function AdminLeagues() {
  const [name, setName] = useState('')
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: leagues } = useQuery({
    queryKey: ['admin-leagues'],
    queryFn: listLeagues,
    refetchInterval: 15_000,
  })

  const { data: members } = useQuery({
    queryKey: ['admin-league-members', selectedLeague],
    queryFn: () => getLeagueMembers(selectedLeague!),
    enabled: !!selectedLeague,
  })

  const createMut = useMutation({
    mutationFn: () => createLeague(name),
    onSuccess: () => {
      setName('')
      qc.invalidateQueries({ queryKey: ['admin-leagues'] })
    },
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h1 className="text-lg font-bold mb-4">Admin - Ligas</h1>
        <form
          onSubmit={e => { e.preventDefault(); createMut.mutate() }}
          className="flex gap-2 mb-4"
        >
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre de la liga"
            className="flex-1 bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold"
            required
          />
          <button
            type="submit"
            disabled={createMut.isPending}
            className="bg-gold text-black font-semibold px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {createMut.isPending ? '...' : 'Crear'}
          </button>
        </form>
        {createMut.isError && (
          <p className="text-error text-xs mb-2">{createMut.error.message}</p>
        )}
        <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs uppercase border-b border-surface-border">
                <th className="text-left py-2 px-3">Nombre</th>
                <th className="text-left py-2 px-3">Código</th>
                <th className="text-right py-2 px-3">Miembros</th>
              </tr>
            </thead>
            <tbody>
              {leagues?.map(l => (
                <tr
                  key={l.id}
                  onClick={() => setSelectedLeague(l.id)}
                  className={`border-b border-surface-border/50 cursor-pointer hover:bg-surface/50 transition-colors ${
                    selectedLeague === l.id ? 'bg-surface' : ''
                  }`}
                >
                  <td className="py-2 px-3">{l.name}</td>
                  <td className="py-2 px-3 font-mono text-xs text-gold">{l.join_code}</td>
                  <td className="py-2 px-3 text-right text-muted">{l.member_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLeague && (
        <div>
          <h2 className="text-md font-bold mb-4">Miembros</h2>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            {members?.length === 0 ? (
              <p className="text-muted text-sm">Sin miembros</p>
            ) : (
              <div className="flex flex-col gap-1">
                {members?.map(m => (
                  <div key={m.id} className="text-sm py-1 border-b border-surface-border/50 last:border-0">
                    {m.username}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
