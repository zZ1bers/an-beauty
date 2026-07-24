import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Globe, LogOut, Bell, Sun, Moon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { useTheme } from '../theme/ThemeContext'
import { useAuth, homeForRole } from '../auth/AuthContext'
import { api, ApiError } from '../lib/api'
import { Drawer } from './ui/Drawer'
import { useToast } from './ui/Toast'
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
  const [open, setOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const location = useLocation()
  const isPortal =
    location.pathname.startsWith('/staff') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/login')

  const isClient = user?.role === 'CLIENT'
  const clientName = isClient && user ? user.firstName : null

  const links = [
    { to: '/#services', label: t.nav.services },
    { to: '/#masters', label: t.nav.masters },
    { to: '/#about', label: t.nav.about },
    { to: '/booking', label: t.nav.book },
    { to: '/cabinet', label: t.nav.cabinet },
  ]

  const unread = notifications.filter((n) => !n.readAt).length

  const loadNotifications = useCallback(async () => {
    if (!isClient) {
      setNotifications([])
      return
    }
    try {
      const list = await api<NotificationItem[]>('/me/notifications')
      setNotifications(list)
    } catch {
      /* keep previous */
    }
  }, [isClient])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications, location.pathname])

  useEffect(() => {
    if (!isClient) return
    const id = window.setInterval(() => void loadNotifications(), 60_000)
    return () => window.clearInterval(id)
  }, [isClient, loadNotifications])

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
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className="nav__link" onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
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
              {isClient ? (
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
              ) : (
                <button
                  className="nav__lang"
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
          <button className="nav__burger" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="nav__mobile glass-strong"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {links.map((l, i) => (
              <motion.div
                key={l.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link to={l.to} className="nav__mobile-link" onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              </motion.div>
            ))}
            {isClient && (
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
          </motion.div>
        )}
      </AnimatePresence>

      {isClient && (
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
