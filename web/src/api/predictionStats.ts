import { request } from './client'

export interface PredictionStats {
  local: number
  empate: number
  visita: number
  total: number
}

export function getPredictionStats(matchId: string, leagueId?: string) {
  const qs = leagueId ? `?league_id=${leagueId}` : ''
  return request<PredictionStats>(`/matches/${matchId}/prediction-stats${qs}`)
}
