import { authToken, request } from './client'

export interface AdminUser {
  id: string
  username: string
  email: string
  player_team_name: string
  display_name: string | null
  league_id: string | null
  league_name: string | null
  is_admin: boolean
  is_verified: boolean
  is_disabled: boolean
  created_at: string
}

export interface AdminUserPayload {
  username: string
  email: string
  password?: string
  player_team_name: string
  display_name?: string | null
  league_id?: string | null
  is_admin: boolean
  is_verified: boolean
  is_disabled: boolean
}

export function listUsers() {
  return request<AdminUser[]>('/users', { token: authToken()! })
}

export function createUser(body: AdminUserPayload) {
  return request<AdminUser>('/users', {
    method: 'POST',
    body,
    token: authToken()!,
  })
}

export function updateUser(id: string, body: AdminUserPayload) {
  return request<{ message: string }>(`/users/${id}`, {
    method: 'PUT',
    body,
    token: authToken()!,
  })
}

export function deleteUser(id: string) {
  return request<{ message: string }>(`/users/${id}`, {
    method: 'DELETE',
    token: authToken()!,
  })
}
