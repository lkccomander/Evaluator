const BASE = (() => {
  const env = (typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_URL : '') || ''
  if (env) {
    const clean = env.replace(/\/+$/, '')
    return clean.endsWith('/api/v1') ? clean : clean + '/api/v1'
  }
  return '/api/v1'
})()

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string
}

let refreshPromise: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  const rt = localStorage.getItem('refresh_token')
  if (!rt) return null
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    })
    if (!res.ok) return null
    const data = await res.json()
    localStorage.setItem('access_token', data.access_token)
    return data.access_token
  } catch {
    return null
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.body) {
    headers['Content-Type'] = 'application/json'
  }
  if (opts.token) {
    headers['Authorization'] = `Bearer ${opts.token}`
  }

  let res = await fetch(`${BASE}${path}`, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

  if (res.status === 401 && opts.token) {
    if (!refreshPromise) {
      refreshPromise = doRefresh()
    }
    const newToken = await refreshPromise
    refreshPromise = null

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${BASE}${path}`, {
        method: opts.method || (opts.body ? 'POST' : 'GET'),
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      })
    } else {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.reload()
      throw new Error('Sesión expirada')
    }
  }

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
