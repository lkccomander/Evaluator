import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import * as authApi from '../api/auth'

interface AuthState {
  user: authApi.User | null
  accessToken: string | null
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (body: Parameters<typeof authApi.register>[0]) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('access_token'))
  const [loading, setLoading] = useState(true)

  const token = accessToken

  const fetchUser = useCallback(async () => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const u = await authApi.getMe(token)
      setUser(u)
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setAccessToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchUser() }, [fetchUser])

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    localStorage.setItem('access_token', res.access_token)
    localStorage.setItem('refresh_token', res.refresh_token)
    setAccessToken(res.access_token)
    const u = await authApi.getMe(res.access_token)
    setUser(u)
  }

  const register = async (body: Parameters<typeof authApi.register>[0]) => {
    const res = await authApi.register(body)
    localStorage.setItem('access_token', res.access_token)
    localStorage.setItem('refresh_token', res.refresh_token)
    setAccessToken(res.access_token)
    const u = await authApi.getMe(res.access_token)
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setAccessToken(null)
    setUser(null)
  }

  const refreshUser = fetchUser

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      isAdmin: user?.is_admin ?? false,
      loading,
      login,
      register,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
