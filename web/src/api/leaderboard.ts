import { request, authToken } from './client'

export interface LeaderboardEntry {
  user_id: string
  display_name: string | null
  player_team_name: string
  is_verified: boolean
  is_disabled: boolean
  league_name: string | null
  total_points: number
  total_goal_pts: number
  scored_matches: number
  exact_hits: number
  rank?: number
}

export function getGlobalLeaderboard() {
  return request<LeaderboardEntry[]>('/leaderboard/global', { token: authToken()! })
}

export function getLeagueLeaderboard(leagueId: string) {
  return request<LeaderboardEntry[]>(`/leaderboard/league/${leagueId}`)
}

export function getMyLeagueLeaderboard() {
  return request<LeaderboardEntry[]>('/leaderboard/mine', { token: authToken()! })
}

export function getMyGlobalPosition() {
  return request<{ me: LeaderboardEntry; neighbor: LeaderboardEntry[] }>('/leaderboard/me', {
    token: authToken()!,
  })
}
