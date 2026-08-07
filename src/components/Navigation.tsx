import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Globe, LogOut, Bell, Sun, Moon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { useTheme } from '../theme/ThemeContext'
import { useAuth, homeForRole } from '../auth/AuthContext'
import { api, ApiError } from '../lib/api'
import { isPortalPath } from '../lib/portalRoutes'
import { Drawer } from './ui/Drawer'
import { useToast } from './ui/Toast'
import { scrollToHash } from './HashScroll'
import './Navigation.css'

type NotificationItem = {
  id: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

export function Navigation() {
  const { t, locale, setLocale } = useLang()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ignoreNextClick = useRef(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const location = useLocation()
  const isPortal =
    isPortalPath(location.pathname) || location.pathname.startsWith('/login')

  const isClient = user?.role === 'CLIENT'
  const isMaster = user?.role === 'MASTER'
  const canNotify = isClient || isMaster
  const clientName = isClient && user ? user.firstName : null

  const links = [
    { to: '/#about', label: t.nav.about },
    { to: '/#services', label: t.nav.services },
    { to: '/#masters', label: t.nav.masters },
    { to: '/booking', label: t.nav.book },
    { to: '/cabinet', label: t.nav.cabinet },
  ]

  const onHashNav = (e: MouseEvent<HTMLAnchorElement>, to: string) => {
    setOpen(false)
    const hashIndex = to.indexOf('#')
    if (hashIndex === -1) return

    const path = to.slice(0, hashIndex) || '/'
    const hash = to.slice(hashIndex)

    if (location.pathname === path) {
      e.preventDefault()
      window.history.pushState(null, '', hash)
      scrollToHash(hash)
      return
    }

    // Navigate home with hash; HashScroll will finish after mount
    e.preventDefault()
    navigate(to)
  }

  const onRouteNav = (to: string) => {
    setOpen(false)
    if (location.pathname === to) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }
  }

  const unread = notifications.filter((n) => !n.readAt).length

  const loadNotifications = useCallback(async () => {
    if (!canNotify) {
      setNotifications([])
      return
    }
    try {
      const list = await api<NotificationItem[]>('/me/notifications')
      setNotifications(list)
    } catch {
      /* keep previous */
    }
  }, [canNotify])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications, location.pathname])

  useEffect(() => {
    if (!canNotify) return
    const id = window.setInterval(() => void loadNotifications(), 60_000)
    return () => window.clearInterval(id)
  }, [canNotify, loadNotifications])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const markRead = async (id: string) => {
    try {
      await api(`/me/notifications/${id}/read`, { method: 'POST' })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      )
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    }
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id)
    await Promise.all(unreadIds.map((id) => api(`/me/notifications/${id}/read`, { method: 'POST' })))
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    )
  }

  const portalLabel =
    user?.role === 'ADMIN'
      ? t.nav.admin
      : user?.role === 'MASTER'
        ? t.nav.staff
        : (clientName ?? t.nav.cabinet)

  return (
    <header className={`nav ${isPortal ? 'nav--portal' : ''}`}>
      <div className="nav__inner glass">
        <Link to="/" className="nav__brand" onClick={() => setOpen(false)}>
          <span className="nav__mark">AN</span>
          <span className="nav__dot">.</span>
          <span className="nav__name">Beauty</span>
        </Link>

        <nav className="nav__links">
          {links.map((l) =>
            l.to.includes('#') ? (
              <a
                key={l.to}
                href={l.to}
                className="nav__link"
                onClick={(e) => onHashNav(e, l.to)}
              >
                {l.label}
              </a>
            ) : (
              <NavLink key={l.to} to={l.to} className="nav__link" onClick={() => onRouteNav(l.to)}>
                {l.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="nav__actions">
          <button
            className="nav__lang"
            onClick={() => toggleTheme()}
            aria-label={theme === 'light' ? t.nav.themeDark : t.nav.themeLight}
            title={theme === 'light' ? t.nav.themeDark : t.nav.themeLight}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            className="nav__lang"
            onClick={() => setLocale(locale === 'ru' ? 'de' : 'ru')}
            aria-label="Language"
          >
            <Globe size={16} />
            <span>{locale.toUpperCase()}</span>
          </button>
          {user ? (
            <>
              <Link to={homeForRole(user.role)} className="btn btn-ghost nav__cta">
                {portalLabel}
              </Link>
              {canNotify && (
                <button
                  type="button"
                  className="nav__notify"
                  onClick={() => setDrawerOpen(true)}
                  aria-label={t.client.notifications}
                  title={t.client.notifications}
                >
                  <Bell size={16} />
                  {unread > 0 && <i className="nav__notify-dot" />}
                </button>
              )}
              {!isClient && (
                <button
                  className="nav__lang nav__logout"
                  onClick={() => logout()}
                  aria-label={t.admin.logout}
                  title={t.admin.logout}
                >
                  <LogOut size={16} />
                </button>
              )}
            </>
          ) : (
            <Link to="/login" className="btn btn-primary nav__cta">
              {locale === 'ru' ? 'Войти' : 'Login'}
            </Link>
          )}
          <button
            type="button"
            className="nav__burger"
            onPointerDown={(e) => {
              // Open on touch-down so the menu doesn't wait for click after a heavy paint
              if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                ignoreNextClick.current = true
                setOpen((v) => !v)
              }
            }}
            onClick={() => {
              if (ignoreNextClick.current) {
                ignoreNextClick.current = false
                return
              }
              setOpen((v) => !v)
            }}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="nav-mobile-panel"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`nav__mobile-backdrop ${open ? 'is-open' : ''}`}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <aside
        id="nav-mobile-panel"
        className={`nav__mobile ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
      >
        <div className="nav__mobile-top">
          <Link to="/" className="nav__brand" onClick={() => setOpen(false)}>
            <span className="nav__mark">AN</span>
            <span className="nav__dot">.</span>
            <span className="nav__name">Beauty</span>
          </Link>
          <button
            type="button"
            className="nav__burger"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <p className="nav__mobile-eyebrow eyebrow">{locale === 'ru' ? 'Навигация' : 'Navigation'}</p>

        <nav className="nav__mobile-nav">
          {links.map((l, i) =>
            l.to.includes('#') ? (
              <a
                key={l.to}
                href={l.to}
                className="nav__mobile-link"
                onClick={(e) => onHashNav(e, l.to)}
              >
                <span className="nav__mobile-index">0{i + 1}</span>
                <span className="nav__mobile-label">{l.label}</span>
              </a>
            ) : (
              <Link key={l.to} to={l.to} className="nav__mobile-link" onClick={() => onRouteNav(l.to)}>
                <span className="nav__mobile-index">0{i + 1}</span>
                <span className="nav__mobile-label">{l.label}</span>
              </Link>
            ),
          )}
        </nav>

        <div className="nav__mobile-foot">
          {canNotify && (
            <button
              type="button"
              className="nav__mobile-notify"
              onClick={() => {
                setOpen(false)
                setDrawerOpen(true)
              }}
            >
              <Bell size={18} />
              {t.client.notifications}
              {unread > 0 && <span className="nav__mobile-notify-count">{unread}</span>}
            </button>
          )}

          <div className="nav__mobile-cta">
            {user ? (
              <>
                <Link
                  to={homeForRole(user.role)}
                  className="btn btn-primary"
                  onClick={() => setOpen(false)}
                >
                  {portalLabel}
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setOpen(false)
                    logout()
                    navigate('/')
                  }}
                >
                  <LogOut size={16} />
                  {t.admin.logout}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary" onClick={() => setOpen(false)}>
                  {locale === 'ru' ? 'Войти' : 'Login'}
                </Link>
                <Link
                  to="/login"
                  state={{ mode: 'register' }}
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  {locale === 'ru' ? 'Регистрация' : 'Registrieren'}
                </Link>
              </>
            )}
          </div>

          <div className="nav__mobile-legal">
            <Link to="/impressum" onClick={() => setOpen(false)}>
              {t.footer.impressum}
            </Link>
            <Link to="/datenschutz" onClick={() => setOpen(false)}>
              {t.footer.datenschutz}
            </Link>
          </div>
        </div>
      </aside>

      {canNotify && (
        <Drawer
          open={drawerOpen}
          title={t.client.notifications}
          onClose={() => setDrawerOpen(false)}
        >
          {unread > 0 && (
            <button
              type="button"
              className="btn btn-ghost drawer-mark-all"
              onClick={() => void markAllRead()}
            >
              {t.client.markAllRead}
            </button>
          )}
          <div className="nav-notify-list">
            {notifications.length === 0 && (
              <p className="nav-notify-empty">{t.client.noNotifications}</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`nav-notify-item ${!n.readAt ? 'is-unread' : ''}`}
                onClick={() => !n.readAt && void markRead(n.id)}
              >
                <strong>{n.title}</strong>
                <span>{n.body}</span>
                <em>
                  {new Date(n.createdAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </em>
              </button>
            ))}
          </div>
        </Drawer>
      )}
    </header>
  )
}
