import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { motion, type PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { api } from '../lib/api'
import { NeonHeart } from './NeonHeart'
import './MastersStrip.css'

type Master = {
  id: string
  name: string
  role: { ru: string; de: string }
  bio: { ru: string; de: string }
  image: string
  rating: number
}

function useVisibleCount() {
  const [visible, setVisible] = useState(1)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1100) setVisible(3)
      else if (w >= 720) setVisible(2)
      else setVisible(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return visible
}

function gapPx() {
  if (typeof window === 'undefined') return 24
  if (window.innerWidth >= 900) return 32
  if (window.innerWidth >= 720) return 28
  return 24
}

export function MastersStrip() {
  const { t, locale } = useLang()
  const [masters, setMasters] = useState<Master[]>([])
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const visible = useVisibleCount()
  const maxIndex = Math.max(0, masters.length - visible)
  const showControls = masters.length > visible

  useEffect(() => {
    void api<Master[]>('/masters?home=1', { auth: false }).then(setMasters)
  }, [])

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex))
  }, [maxIndex])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const measure = () => {
      const w = el.clientWidth
      setStep((w + gapPx()) / visible)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [visible, masters.length])

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  const next = useCallback(() => {
    setIndex((i) => Math.min(maxIndex, i + 1))
  }, [maxIndex])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!showControls || step <= 0) return
    const { offset, velocity } = info
    if (offset.x < -step * 0.22 || velocity.x < -450) next()
    else if (offset.x > step * 0.22 || velocity.x > 450) prev()
  }

  return (
    <section className="masters" id="masters">
      <NeonHeart side="left" top="12%" size={22} delay={0.5} opacity={0.58} tilt={-18} depth="edge" />
      <NeonHeart side="right" top="38%" size={18} delay={1.3} opacity={0.5} tilt={26} depth="near" />
      <NeonHeart side="left" top="62%" size={28} delay={0.9} opacity={0.65} tilt={9} depth="mid" />
      <NeonHeart side="right" top="88%" size={16} delay={0.2} opacity={0.45} tilt={-14} depth="edge" />
      <div className="masters__inner layout-container">
        <header className="masters__head">
          <div className="masters__head-text section-heading section-heading--end">
            <span className="lux-line lux-line--vertical" aria-hidden />
            <div className="section-heading__text">
              <p className="eyebrow">{t.masters.eyebrow}</p>
              <h2 className="masters__title display">{t.masters.title}</h2>
              <p className="masters__sub">{t.masters.subtitle}</p>
            </div>
          </div>

          {showControls && (
            <div className="masters__controls">
              <button
                type="button"
                className="masters__nav"
                onClick={prev}
                disabled={index === 0}
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="masters__counter">
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <i>/</i>
                <em>{String(maxIndex + 1).padStart(2, '0')}</em>
              </span>
              <button
                type="button"
                className="masters__nav"
                onClick={next}
                disabled={index >= maxIndex}
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </header>

        {masters.length === 0 ? (
          <p className="masters__empty">—</p>
        ) : (
          <div
            ref={viewportRef}
            className="masters__viewport"
            style={{ '--visible': visible } as CSSProperties}
          >
            <motion.ul
              className="masters__track"
              drag={showControls ? 'x' : false}
              dragConstraints={{
                left: -maxIndex * step,
                right: 0,
              }}
              dragElastic={0.12}
              dragTransition={{ bounceStiffness: 320, bounceDamping: 28 }}
              animate={{ x: -index * step }}
              transition={{ type: 'spring', stiffness: 340, damping: 38, mass: 0.85 }}
              onDragEnd={onDragEnd}
            >
              {masters.map((master, i) => (
                <li key={master.id} className="masters__item">
                  <div className="masters__photo">
                    <img
                      src={master.image || '/placeholder-master.svg'}
                      alt={master.name}
                      loading="lazy"
                      draggable={false}
                    />
                    <span className="masters__index">{String(i + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="masters__copy">
                    <p className="masters__role">{master.role[locale]}</p>
                    <h3 className="serif">{master.name}</h3>
                    <p className="masters__bio">{master.bio[locale]}</p>
                    <div className="masters__meta">
                      <span className="masters__rating">{master.rating.toFixed(2)}</span>
                      <Link to={`/booking?master=${master.id}`} className="btn btn-primary">
                        {t.masters.select}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </motion.ul>
          </div>
        )}
      </div>
    </section>
  )
}
