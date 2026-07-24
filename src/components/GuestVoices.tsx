import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import { NeonHeart } from './NeonHeart'
import './GuestVoices.css'

function slideStride(viewport: HTMLDivElement) {
  const slide = viewport.querySelector<HTMLElement>('.voices__item')
  const track = viewport.querySelector<HTMLElement>('.voices__list')
  if (!slide) return viewport.clientWidth
  const gap = track ? Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0 : 0
  return slide.getBoundingClientRect().width + gap
}

export function GuestVoices() {
  const { t } = useLang()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 899px)').matches : false,
  )
  const items = t.voices.items

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const sync = () => {
      const stride = slideStride(el)
      if (stride <= 0) return
      setActive(Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / stride))))
    }

    sync()
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [items.length])

  const goTo = (index: number) => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTo({ left: index * slideStride(el), behavior: 'smooth' })
  }

  return (
    <section className="voices" id="voices">
      <NeonHeart side="right" top="12%" size={18} delay={0.6} opacity={0.5} tilt={-16} depth="edge" />
      <NeonHeart side="left" top="35%" size={26} delay={1.4} opacity={0.62} tilt={10} depth="mid" />
      <NeonHeart side="right" top="62%" size={20} delay={0.2} opacity={0.48} tilt={20} depth="near" />
      <NeonHeart side="left" top="88%" size={16} delay={0.95} opacity={0.55} tilt={-22} depth="edge" />
      <div className="voices__inner layout-container">
        <header className="voices__head section-heading">
          <span className="lux-line lux-line--vertical" aria-hidden />
          <div className="section-heading__text">
            <p className="eyebrow">{t.voices.eyebrow}</p>
            <h2 className="voices__title display">{t.voices.title}</h2>
          </div>
        </header>

        <div className="voices__slider">
          <div className="voices__viewport" ref={viewportRef}>
            <div className="voices__track voices__list">
              {items.map((item, i) => {
                const body = (
                  <>
                    <p className="serif">“{item.quote}”</p>
                    <footer>
                      <strong>{item.name}</strong>
                      <span>{item.meta}</span>
                    </footer>
                  </>
                )

                if (isMobile) {
                  return (
                    <blockquote key={item.name} className="voices__item">
                      {body}
                    </blockquote>
                  )
                }

                return (
                  <motion.blockquote
                    key={item.name}
                    className="voices__item"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-8%' }}
                    transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {body}
                  </motion.blockquote>
                )
              })}
            </div>
          </div>

          <div className="voices__dots" role="tablist" aria-label={t.voices.eyebrow}>
            {items.map((item, i) => (
              <button
                key={item.name}
                type="button"
                className={`voices__dot ${i === active ? 'is-active' : ''}`}
                aria-label={`${i + 1} / ${items.length}`}
                aria-current={i === active ? 'true' : undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
