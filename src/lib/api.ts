const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const TOKEN_KEY = 'anbeauty_token'

export type Role = 'CLIENT' | 'MASTER' | 'ADMIN'

export type AuthUser = {
  id: string
  email: string
  role: Role
  firstName: string
  lastName: string
  phone: string | null
  locale: string
  clientProfileId: string | null
  masterProfileId: string | null
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (options.auth !== false) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    let message = res.statusText
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const apiUrl = API_URL
