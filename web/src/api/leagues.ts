import { request, authToken } from './client'

export interface League {
  id: string
  name: string
  join_code: string
  member_count?: number
  created_at?: string
}

export function createLeague(name: string) {
  return request<League>('/leagues', {
    method: 'POST',
    body: { name },
    token: authToken()!,
  })
}

export function listLeagues() {
  return request<League[]>('/leagues', { token: authToken()! })
}

export function getLeagueMembers(leagueId: string) {
  return request<{ id: string; username: string; created_at: string }[]>(
    `/leagues/${leagueId}/members`,
    { token: authToken()! },
  )
}

export function joinLeague(code: string) {
  return request<{ message: string; league_id: string }>('/leagues/join', {
    method: 'POST',
    body: { code },
    token: authToken()!,
  })
}

export function getMyLeague() {
  return request<League>('/leagues/mine', { token: authToken()! })
}
