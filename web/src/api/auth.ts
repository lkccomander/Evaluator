import { request } from './client'

interface TokenResponse {
  access_token: string
  refresh_token: string
  user_id: string
  is_admin: boolean
}

export interface User {
  id: string
  username: string
  email: string
  player_team_name: string
  display_name: string | null
  league_id: string | null
  is_admin: boolean
  created_at: string
}

export function register(body: {
  username: string
  email: string
  password: string
  player_team_name: string
  league_code?: string
}) {
  return request<TokenResponse>('/auth/register', { body })
}

export function login(body: { email: string; password: string }) {
  return request<TokenResponse>('/auth/login', { body })
}

export function refresh(refreshToken: string) {
  return request<{ access_token: string }>('/auth/refresh', {
    body: { refresh_token: refreshToken },
  })
}

export function getMe(token: string) {
  return request<User>('/me', { token })
}
