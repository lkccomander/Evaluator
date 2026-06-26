import { request, authToken } from './client'

export interface BracketEntry {
  id: string
  match_number: number
  stage: string
  kickoff_utc: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  penalty_home_score: number | null
  penalty_away_score: number | null
  bracket_position: number | null
  status: string
  deadline: string
  locked: boolean
}

export function getBracket() {
  return request<BracketEntry[]>('/knockout/bracket')
}

export interface KnockoutLeaderboardEntry {
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
}

export function getKnockoutLeaderboard() {
  return request<KnockoutLeaderboardEntry[]>('/leaderboard/knockout')
}

export interface UnseededSlot {
  bracket_position: number
  home_team: string | null
  away_team: string | null
}

export function getUnseededSlots() {
  return request<UnseededSlot[]>('/admin/knockout/unseeded', { token: authToken()! })
}

export function seedBracket(matches: { bracket_position: number; home_team: string; away_team: string }[]) {
  return request<{ message: string }>('/admin/knockout/seed', {
    method: 'POST',
    body: { matches },
    token: authToken()!,
  })
}
