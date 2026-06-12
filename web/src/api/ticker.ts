import { request } from './client'

export interface TickerGame {
  id: string
  home_team: string
  away_team: string
  group: string
  kickoff: string
  status: 'Programado' | 'En juego' | 'Finalizado' | string
  time_elapsed: string
  home_score: string
  away_score: string
}

export function getTodayTicker() {
  return request<TickerGame[]>('/ticker/today')
}
