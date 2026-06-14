import { request, authToken } from './client'

export function getSettings() {
  return request<Record<string, string>>('/admin/settings', { token: authToken()! })
}

export function updateSetting(key: string, value: string) {
  return request<{ key: string; value: string }>(
    '/admin/settings',
    { method: 'PUT', body: { key, value }, token: authToken()! },
  )
}
