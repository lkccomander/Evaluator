import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listLeagues } from '../api/leagues'
import { createUser, deleteUser, listUsers, updateUser, type AdminUser, type AdminUserPayload } from '../api/users'
import { PlayerTeamName } from '../components/TeamFlag'

type FormState = {
  username: string
  email: string
  password: string
  player_team_name: string
  display_name: string
  league_id: string
  is_admin: boolean
  is_verified: boolean
  is_disabled: boolean
}

const emptyForm: FormState = {
  username: '',
  email: '',
  password: '',
  player_team_name: '',
  display_name: '',
  league_id: '',
  is_admin: false,
  is_verified: false,
  is_disabled: false,
}

function toPayload(form: FormState): AdminUserPayload {
  return {
    username: form.username.trim(),
    email: form.email.trim(),
    password: form.password.trim() || undefined,
    player_team_name: form.player_team_name.trim(),
    display_name: form.display_name.trim() || null,
    league_id: form.league_id || null,
    is_admin: form.is_admin,
    is_verified: form.is_verified,
    is_disabled: form.is_disabled,
  }
}

function formFromUser(user: AdminUser): FormState {
  return {
    username: user.username,
    email: user.email,
    password: '',
    player_team_name: user.player_team_name,
    display_name: user.display_name ?? '',
    league_id: user.league_id ?? '',
    is_admin: user.is_admin,
    is_verified: user.is_verified,
    is_disabled: user.is_disabled,
  }
}

export default function AdminUsers() {
  const qc = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [createForm, setCreateForm] = useState<FormState>(emptyForm)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: listUsers,
    refetchInterval: 15_000,
  })

  const { data: leagues = [] } = useQuery({
    queryKey: ['admin-leagues-options'],
    queryFn: listLeagues,
  })

  const selectedUser = useMemo(
    () => users.find(user => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  )
  const filteredUsers = useMemo(() => {
    if (leagueFilter === 'all') return users
    if (leagueFilter === 'none') return users.filter(user => !user.league_id)
    return users.filter(user => user.league_id === leagueFilter)
  }, [leagueFilter, users])

  const invalidateUsers = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] })
    qc.invalidateQueries({ queryKey: ['leaderboard'] })
  }

  const createMut = useMutation({
    mutationFn: (payload: AdminUserPayload) => createUser(payload),
    onSuccess: () => {
      setCreateForm(emptyForm)
      invalidateUsers()
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUserPayload }) => updateUser(id, payload),
    onSuccess: () => {
      invalidateUsers()
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      setSelectedUserId(null)
      setEditForm(emptyForm)
      invalidateUsers()
    },
  })

  const selectUser = (user: AdminUser) => {
    setSelectedUserId(user.id)
    setEditForm(formFromUser(user))
  }

  const updateCreateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setCreateForm(current => ({ ...current, [key]: value }))
  }

  const updateEditField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setEditForm(current => ({ ...current, [key]: value }))
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
      <section className="bg-surface-card border border-surface-border rounded-lg p-4">
        <h1 className="text-lg font-bold mb-4">Admin - Usuarios</h1>
        <form
          onSubmit={e => {
            e.preventDefault()
            createMut.mutate(toPayload(createForm))
          }}
          className="grid gap-3"
        >
          <input value={createForm.username} onChange={e => updateCreateField('username', e.target.value)} placeholder="Username" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
          <input value={createForm.email} onChange={e => updateCreateField('email', e.target.value)} placeholder="Email" type="email" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
          <input value={createForm.password} onChange={e => updateCreateField('password', e.target.value)} placeholder="Password" type="password" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
          <input value={createForm.player_team_name} onChange={e => updateCreateField('player_team_name', e.target.value)} placeholder="Nombre del equipo" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
          <input value={createForm.display_name} onChange={e => updateCreateField('display_name', e.target.value)} placeholder="Nombre visible (opcional)" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
          <select value={createForm.league_id} onChange={e => updateCreateField('league_id', e.target.value)} className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold">
            <option value="">Sin liga</option>
            {leagues.map(league => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={createForm.is_admin} onChange={e => updateCreateField('is_admin', e.target.checked)} />
            Admin
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={createForm.is_verified} onChange={e => updateCreateField('is_verified', e.target.checked)} />
            Verificado
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={createForm.is_disabled} onChange={e => updateCreateField('is_disabled', e.target.checked)} />
            Deshabilitado
          </label>
          {createMut.isError && <p className="text-error text-xs">{createMut.error.message}</p>}
          <button type="submit" disabled={createMut.isPending} className="bg-gold text-black font-semibold px-4 py-2 rounded text-sm disabled:opacity-50">
            {createMut.isPending ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      </section>

      <section className="grid gap-4">
        <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-bold">Usuarios</h2>
            <div className="flex items-center gap-2">
              <label htmlFor="league-filter" className="text-xs text-muted">Filtrar por liga</label>
              <select
                id="league-filter"
                value={leagueFilter}
                onChange={e => setLeagueFilter(e.target.value)}
                className="bg-surface border border-surface-border rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
              >
                <option value="all">Todas</option>
                <option value="none">Sin liga</option>
                {leagues.map(league => (
                  <option key={league.id} value={league.id}>{league.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase border-b border-surface-border">
                  <th className="text-left py-2 px-3">Equipo</th>
                  <th className="text-left py-2 px-3">Usuario</th>
                  <th className="text-left py-2 px-3">Liga</th>
                  <th className="text-center py-2 px-3">Admin</th>
                  <th className="text-center py-2 px-3">Verif.</th>
                  <th className="text-center py-2 px-3">Deshab.</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className={`border-b border-surface-border/50 cursor-pointer hover:bg-surface-card/60 transition-colors ${selectedUserId === user.id ? 'bg-surface/70' : ''}`}
                  >
                    <td className="py-3 px-3 font-medium">
                      <PlayerTeamName name={user.player_team_name} verified={user.is_verified} disabled={user.is_disabled} />
                    </td>
                    <td className="py-3 px-3 text-muted">{user.username}<div className="text-xs">{user.email}</div></td>
                    <td className="py-3 px-3 text-muted">{user.league_name ?? '—'}</td>
                    <td className="py-3 px-3 text-center">{user.is_admin ? 'Sí' : 'No'}</td>
                    <td className="py-3 px-3 text-center">{user.is_verified ? '✅' : '—'}</td>
                    <td className="py-3 px-3 text-center">{user.is_disabled ? '✗' : '—'}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 px-3 text-center text-sm text-muted">
                      No hay usuarios para ese filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedUser && (
          <div className="bg-surface-card border border-surface-border rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold">Editar usuario</h2>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Eliminar a ${selectedUser.username}?`)) {
                    deleteMut.mutate(selectedUser.id)
                  }
                }}
                disabled={deleteMut.isPending}
                className="text-xs text-error hover:underline disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                updateMut.mutate({ id: selectedUser.id, payload: toPayload(editForm) })
              }}
              className="grid gap-3"
            >
              <input value={editForm.username} onChange={e => updateEditField('username', e.target.value)} placeholder="Username" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
              <input value={editForm.email} onChange={e => updateEditField('email', e.target.value)} placeholder="Email" type="email" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
              <input value={editForm.password} onChange={e => updateEditField('password', e.target.value)} placeholder="Nueva password (opcional)" type="password" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
              <input value={editForm.player_team_name} onChange={e => updateEditField('player_team_name', e.target.value)} placeholder="Nombre del equipo" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" required />
              <input value={editForm.display_name} onChange={e => updateEditField('display_name', e.target.value)} placeholder="Nombre visible (opcional)" className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold" />
              <select value={editForm.league_id} onChange={e => updateEditField('league_id', e.target.value)} className="bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gold">
                <option value="">Sin liga</option>
                {leagues.map(league => (
                  <option key={league.id} value={league.id}>{league.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={editForm.is_admin} onChange={e => updateEditField('is_admin', e.target.checked)} />
                Admin
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={editForm.is_verified} onChange={e => updateEditField('is_verified', e.target.checked)} />
                Verificado
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={editForm.is_disabled} onChange={e => updateEditField('is_disabled', e.target.checked)} />
                Deshabilitado
              </label>
              {updateMut.isError && <p className="text-error text-xs">{updateMut.error.message}</p>}
              {deleteMut.isError && <p className="text-error text-xs">{deleteMut.error.message}</p>}
              <button type="submit" disabled={updateMut.isPending} className="bg-gold text-black font-semibold px-4 py-2 rounded text-sm disabled:opacity-50">
                {updateMut.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  )
}
