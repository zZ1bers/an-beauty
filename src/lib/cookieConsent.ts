export type CookiePrefs = {
  necessary: true
  preferences: boolean
  analytics: boolean
  marketing: boolean
}

const COOKIE_KEY = 'an-beauty-cookies'
export const COOKIE_ACCEPTED_EVENT = 'an-cookies-accepted'

export const defaultCookiePrefs = (): CookiePrefs => ({
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
})

export function getCookiePrefs(): CookiePrefs | null {
  try {
    const raw = localStorage.getItem(COOKIE_KEY)
    if (!raw) return null
    if (raw === 'accepted') {
      return { necessary: true, preferences: true, analytics: true, marketing: true }
    }
    const parsed = JSON.parse(raw) as Partial<CookiePrefs>
    return {
      necessary: true,
      preferences: Boolean(parsed.preferences),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    }
  } catch {
    return null
  }
}

export function hasCookieConsent() {
  return getCookiePrefs() !== null
}

export function saveCookiePrefs(prefs: CookiePrefs) {
  const next: CookiePrefs = { ...prefs, necessary: true }
  try {
    localStorage.setItem(COOKIE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(COOKIE_ACCEPTED_EVENT, { detail: next }))
}

export function acceptAllCookies() {
  saveCookiePrefs({
    necessary: true,
    preferences: true,
    analytics: true,
    marketing: true,
  })
}

export function acceptNecessaryOnly() {
  saveCookiePrefs(defaultCookiePrefs())
}
