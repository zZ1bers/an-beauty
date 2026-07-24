import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import {
  acceptAllCookies,
  acceptNecessaryOnly,
  defaultCookiePrefs,
  hasCookieConsent,
  saveCookiePrefs,
  type CookiePrefs,
} from '../lib/cookieConsent'
import './CookieConsent.css'

export function CookieConsent() {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(false)
  const [prefs, setPrefs] = useState<CookiePrefs>(defaultCookiePrefs)

  useEffect(() => {
    if (!hasCookieConsent()) setOpen(true)
  }, [])

  const close = () => {
    setOpen(false)
    setSettings(false)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cookie-bar"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-label={t.cookies.title}
        >
          <div className="cookie-bar__main">
            <p>
              {t.cookies.body}{' '}
              <Link to="/datenschutz" onClick={close}>
                {t.cookies.privacy}
              </Link>
            </p>

            <AnimatePresence initial={false}>
              {settings && (
                <motion.div
                  className="cookie-bar__settings"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="cookie-bar__opt cookie-bar__opt--locked">
                    <input type="checkbox" checked disabled readOnly />
                    <span>
                      <strong>{t.cookies.necessary}</strong>
                      <em>{t.cookies.necessaryHint}</em>
                    </span>
                  </label>
                  <label className="cookie-bar__opt">
                    <input
                      type="checkbox"
                      checked={prefs.preferences}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, preferences: e.target.checked }))
                      }
                    />
                    <span>
                      <strong>{t.cookies.preferences}</strong>
                      <em>{t.cookies.preferencesHint}</em>
                    </span>
                  </label>
                  <label className="cookie-bar__opt">
                    <input
                      type="checkbox"
                      checked={prefs.analytics}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, analytics: e.target.checked }))
                      }
                    />
                    <span>
                      <strong>{t.cookies.analytics}</strong>
                      <em>{t.cookies.analyticsHint}</em>
                    </span>
                  </label>
                  <label className="cookie-bar__opt">
                    <input
                      type="checkbox"
                      checked={prefs.marketing}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, marketing: e.target.checked }))
                      }
                    />
                    <span>
                      <strong>{t.cookies.marketing}</strong>
                      <em>{t.cookies.marketingHint}</em>
                    </span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="cookie-bar__actions">
            {settings ? (
              <>
                <button
                  type="button"
                  className="btn btn-ghost cookie-bar__btn"
                  onClick={() => {
                    acceptNecessaryOnly()
                    close()
                  }}
                >
                  {t.cookies.necessaryOnly}
                </button>
                <button
                  type="button"
                  className="btn btn-primary cookie-bar__btn"
                  onClick={() => {
                    saveCookiePrefs(prefs)
                    close()
                  }}
                >
                  {t.cookies.save}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-ghost cookie-bar__btn"
                  onClick={() => setSettings(true)}
                >
                  {t.cookies.settings}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost cookie-bar__btn"
                  onClick={() => {
                    acceptNecessaryOnly()
                    close()
                  }}
                >
                  {t.cookies.necessaryOnly}
                </button>
                <button
                  type="button"
                  className="btn btn-primary cookie-bar__btn"
                  onClick={() => {
                    acceptAllCookies()
                    close()
                  }}
                >
                  {t.cookies.acceptAll}
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
