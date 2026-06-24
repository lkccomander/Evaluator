import { request } from './client'

export interface GraphNode {
  id: string
  name: string
}

export interface GraphLink {
  source: string
  target: string
  local: number
  empate: number
  visita: number
  total: number
  match_number: number
  stage: string
}

export interface PredictionGraph {
  nodes: GraphNode[]
  links: GraphLink[]
}

export function getPredictionGraph() {
  return request<PredictionGraph>('/visualization/prediction-graph')
}
