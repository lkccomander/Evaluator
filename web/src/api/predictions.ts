import { request, authToken } from './client'

export interface Prediction {
  id: string
  match_id: string
  match_number: number
  home_team: string
  away_team: string
  kickoff_utc: string
  home_score_pred: number
  away_score_pred: number
  home_score: number | null
  away_score: number | null
  points_earned: number | null
  goal_pts_earned: number | null
  locked: boolean
  submitted_at: string
}

export function getMyPredictions() {
  return request<Prediction[]>('/predictions/my', { token: authToken()! })
}

export function submitPrediction(matchId: string, homeScorePred: number, awayScorePred: number) {
  return request<{ message: string }>('/predictions', {
    method: 'POST',
    body: { match_id: matchId, home_score_pred: homeScorePred, away_score_pred: awayScorePred },
    token: authToken()!,
  })
}

export function updatePrediction(id: string, homeScorePred: number, awayScorePred: number) {
  return request<{ message: string }>(`/predictions/${id}`, {
    method: 'PUT',
    body: { home_score_pred: homeScorePred, away_score_pred: awayScorePred },
    token: authToken()!,
  })
}

export interface AdminPlayerPrediction {
  user_id: string
  username: string
  display_name: string | null
  player_team_name: string
  home_score_pred: number | null
  away_score_pred: number | null
}

export function adminSetPrediction(userId: string, matchId: string, homeScorePred: number, awayScorePred: number) {
  return request<{ message: string }>('/admin/predictions', {
    method: 'POST',
    body: { user_id: userId, match_id: matchId, home_score_pred: homeScorePred, away_score_pred: awayScorePred },
    token: authToken()!,
  })
}

export function getMatchPredictionsWithUsers(matchId: string) {
  return request<AdminPlayerPrediction[]>(`/admin/predictions/${matchId}`, {
    token: authToken()!,
  })
}
