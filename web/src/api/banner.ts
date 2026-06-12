import { request, authToken } from './client'

export interface BannerMessage {
  id: string
  message: string
  created_by: string
  created_at: string
  expires_at: string
}

export function getBannerMessages() {
  return request<BannerMessage[]>('/banner')
}

export function postBannerMessage(message: string) {
  return request<BannerMessage>('/banner', { method: 'POST', body: { message }, token: authToken()! })
}
