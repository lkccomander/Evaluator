import { request, authToken } from './client'

export interface ChatMessage {
  id: string
  user_id: string
  username: string
  display_name: string | null
  message: string
  created_at: string
}

export function getChatMessages() {
  return request<ChatMessage[]>('/chat')
}

export function postChatMessage(message: string) {
  return request<ChatMessage>('/chat', { method: 'POST', body: { message }, token: authToken()! })
}
