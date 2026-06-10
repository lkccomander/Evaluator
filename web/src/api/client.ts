const BASE = (typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_URL : '') || '/api/v1'

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.body) {
    headers['Content-Type'] = 'application/json'
  }
  if (opts.token) {
    headers['Authorization'] = `Bearer ${opts.token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data as T
}

function authToken(): string | null {
  const stored = localStorage.getItem('access_token')
  return stored || null
}

export { request, authToken }
export type { RequestOptions }
