import { request, authToken } from './client'

export interface Match {
  id: string
  match_number: number
  stage: string
  group_name: string
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

export function getMatches() {
  return request<Match[]>('/matches')
}

export function getMatch(id: string) {
  return request<Match>(`/matches/${id}`)
}

export function enterResult(matchId: string, homeScore: number, awayScore: number) {
  return request<{ message: string; predictions_updated: number }>(
    `/matches/${matchId}/result`,
    { method: 'PUT', body: { home_score: homeScore, away_score: awayScore }, token: authToken()! },
  )
}

export function updateLiveScore(matchId: string, homeScore: number, awayScore: number) {
  return request<{ message: string; predictions_updated: number }>(
    `/matches/${matchId}/score`,
    { method: 'PUT', body: { home_score: homeScore, away_score: awayScore }, token: authToken()! },
  )
}

export function updateMatchKickoff(matchId: string, kickoffCST: string) {
  return request<{ message: string }>(
    `/matches/${matchId}/kickoff`,
    { method: 'PUT', body: { kickoff_cst: kickoffCST }, token: authToken()! },
  )
}
