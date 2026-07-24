import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Smooth-scroll to #hash targets (React Router does not do this by itself). */
export function HashScroll() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.replace(/^#/, ''))
    if (!id) return

    let tries = 0
    const run = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      if (tries++ < 20) {
        window.setTimeout(run, 50)
      }
    }

    // Wait a tick for route/page enter to paint
    const t = window.setTimeout(run, pathname === '/' ? 40 : 120)
    return () => window.clearTimeout(t)
  }, [pathname, hash])

  return null
}

export function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, '')
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }
  return false
}
