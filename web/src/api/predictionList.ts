import { request } from './client'

export interface PredictionEntry {
  display_name?: string
  home_score_pred: number
  away_score_pred: number
}

export function getPredictionList(matchId: string, leagueId?: string, showNames?: boolean) {
  const params = new URLSearchParams()
  if (leagueId) params.set('league_id', leagueId)
  if (showNames) params.set('show_names', 'true')
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request<PredictionEntry[]>(`/matches/${matchId}/predictions-list${qs}`)
}
