import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Gift } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { api } from '../lib/api'
import { COOKIE_ACCEPTED_EVENT, hasCookieConsent } from '../lib/cookieConsent'
import { Modal } from './ui/Modal'
import './PromoGift.css'

type ActivePromo = {
  id: string
  headline: { ru: string; de: string }
  body: { ru: string; de: string }
  discountPct: number | null
  serviceIds: string[]
}

export function PromoGift() {
  const { t, locale } = useLang()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const [promo, setPromo] = useState<ActivePromo | null>(null)
  const [cookiesOk, setCookiesOk] = useState(false)
  const [ready, setReady] = useState(false)
  const [landed, setLanded] = useState(false)
  const [restTop, setRestTop] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const update = () => setRestTop(Math.max(80, window.innerHeight - 88))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    setCookiesOk(hasCookieConsent())
    const onAccept = () => setCookiesOk(true)
    window.addEventListener(COOKIE_ACCEPTED_EVENT, onAccept)
    return () => window.removeEventListener(COOKIE_ACCEPTED_EVENT, onAccept)
  }, [])

  useEffect(() => {
    void api<ActivePromo[]>('/promos/active', { auth: false })
      .then((list) => setPromo(list[0] ?? null))
      .catch(() => setPromo(null))
  }, [])

  useEffect(() => {
    if (!cookiesOk || !promo || location.pathname !== '/') {
      setReady(false)
      setLanded(false)
      return
    }
    setLanded(false)
    const id = window.setTimeout(() => setReady(true), 400)
    return () => window.clearTimeout(id)
  }, [cookiesOk, promo, location.pathname])

  const visible = location.pathname === '/' && cookiesOk && !!promo && ready && restTop > 0

  const bookingTo =
    promo?.serviceIds.length === 1
      ? `/booking?service=${promo.serviceIds[0]}`
      : '/booking'

  const hasDiscount = promo != null && promo.discountPct != null && promo.discountPct > 0

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="promo-gift-wrap"
            style={{ right: 'max(1rem, env(safe-area-inset-right))' }}
            initial={{ top: -120 }}
            animate={{ top: restTop }}
            exit={{ opacity: 0, top: restTop + 24 }}
            transition={
              reduceMotion
                ? { duration: 0.25 }
                : {
                    type: 'spring',
                    stiffness: 220,
                    damping: 14,
                    mass: 1.15,
                    velocity: 1200,
                  }
            }
            onAnimationComplete={() => setLanded(true)}
          >
            <button
              type="button"
              className={`promo-gift ${landed && !reduceMotion ? 'promo-gift--alive' : ''}`}
              aria-label={t.hero.offer}
              onClick={() => setModalOpen(true)}
            >
              <span className="promo-gift__face">
                <Gift className="promo-gift__icon" size={26} strokeWidth={1.75} aria-hidden />
                {hasDiscount && <span className="promo-gift__pct">−{promo.discountPct}%</span>}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={modalOpen && !!promo}
        title={promo?.headline[locale] ?? t.hero.offer}
        onClose={() => setModalOpen(false)}
      >
        {promo && (
          <div className="promo-gift-modal">
            {hasDiscount && (
              <p className="promo-gift-modal__badge">−{promo.discountPct}%</p>
            )}
            <p className="promo-gift-modal__body">{promo.body[locale]}</p>
            <div className="promo-gift-modal__actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                {t.hero.offerLater}
              </button>
              <Link
                to={bookingTo}
                className="btn btn-primary"
                onClick={() => setModalOpen(false)}
              >
                {t.hero.offerCta}
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
