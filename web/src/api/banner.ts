import { request } from './client'

export interface BannerMessage {
  id: string
  message: string
  created_at: string
}

export function getBannerMessage() {
  return request<BannerMessage>('/banner')
}

export function setBannerMessage(message: string) {
  return request<BannerMessage>('/banner', { method: 'POST', body: { message } })
}
