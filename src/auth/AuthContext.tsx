import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken, type AuthUser, type Role } from '../lib/api'

type AuthState = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
  }) => Promise<AuthUser>
  acceptSession: (token: string, user: AuthUser) => void
  logout: () => void
  refresh: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const data = await api<{ user: AuthUser }>('/auth/me')
      setUser(data.user)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(
    async (payload: {
      email: string
      password: string
      firstName: string
      lastName: string
      phone?: string
    }) => {
      const data = await api<{ token: string; user: AuthUser }>('/auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify(payload),
      })
      setToken(data.token)
      setUser(data.user)
      return data.user
    },
    [],
  )

  const acceptSession = useCallback((token: string, nextUser: AuthUser) => {
    setToken(token)
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (...roles: Role[]) => !!user && roles.includes(user.role),
    [user],
  )

  const value = useMemo(
    () => ({ user, loading, login, register, acceptSession, logout, refresh, hasRole }),
    [user, loading, login, register, acceptSession, logout, refresh, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function homeForRole(role: Role) {
  if (role === 'ADMIN') return '/admin'
  if (role === 'MASTER') return '/staff'
  return '/cabinet'
}
