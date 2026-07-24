import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { api } from '../lib/api'
import './MastersStrip.css'

type Master = {
  id: string
  name: string
  role: { ru: string; de: string }
  bio: { ru: string; de: string }
  image: string
  rating: number
}

export function MastersStrip() {
  const { t, locale } = useLang()
  const [masters, setMasters] = useState<Master[]>([])
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const count = masters.length || 1

  useEffect(() => {
    void api<Master[]>('/masters', { auth: false }).then(setMasters)
  }, [])

  const goTo = useCallback((next: number, dir: number) => {
    const wrapped = ((next % count) + count) % count
    setDirection(dir)
    setIndex(wrapped)
  }, [count])

  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index])
  const next = useCallback(() => goTo(index + 1, 1), [goTo, index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x
    if (offset < -80 || velocity < -500) next()
    else if (offset > 80 || velocity > 500) prev()
  }

  const master = masters[index]
  const prevMaster = masters[(index - 1 + count) % count]
  const nextMaster = masters[(index + 1) % count]

  if (!master) {
    return (
      <section className="masters" id="masters">
        <div className="masters__head">
          <p className="eyebrow">{t.masters.eyebrow}</p>
          <h2 className="masters__title display">{t.masters.title}</h2>
        </div>
      </section>
    )
  }

  return (
    <section className="masters" id="masters">
      <div className="masters__head">
        <div className="masters__head-text">
          <p className="eyebrow">{t.masters.eyebrow}</p>
          <h2 className="masters__title display">{t.masters.title}</h2>
          <p className="masters__sub">{t.masters.subtitle}</p>
        </div>

        <div className="masters__controls">
          <button type="button" className="masters__nav-btn" onClick={prev} aria-label="Previous">
            <ChevronLeft size={20} />
          </button>
          <div className="masters__counter">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <i>/</i>
            <em>{String(masters.length).padStart(2, '0')}</em>
          </div>
          <button type="button" className="masters__nav-btn" onClick={next} aria-label="Next">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="masters__slider">
        <button type="button" className="masters__peek masters__peek--left" onClick={prev} aria-label="Previous master">
          <img src={prevMaster.image} alt="" />
          <span className="serif">{prevMaster.name}</span>
        </button>

        <div className="masters__stage">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.article
              key={master.id}
              className="masters__card"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={onDragEnd}
            >
              <div className="masters__photo">
                <img src={master.image} alt={master.name} draggable={false} />
                <div className="masters__photo-glow" />
                <div className="masters__badge">
                  <Star size={12} fill="currentColor" />
                  {master.rating}
                </div>
              </div>
              <div className="masters__body">
                <h3 className="serif">{master.name}</h3>
                <p className="masters__role">{master.role[locale]}</p>
                <p className="masters__bio">{master.bio[locale]}</p>
                <div className="masters__footer">
                  <Link to={`/booking?master=${master.id}`} className="btn btn-primary">
                    {t.masters.select}
                  </Link>
                </div>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        <button type="button" className="masters__peek masters__peek--right" onClick={next} aria-label="Next master">
          <img src={nextMaster.image} alt="" />
          <span className="serif">{nextMaster.name}</span>
        </button>
      </div>

      <div className="masters__dots" role="tablist" aria-label="Masters">
        {masters.map((m, i) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`masters__dot ${i === index ? 'is-active' : ''}`}
            onClick={() => goTo(i, i > index ? 1 : -1)}
          >
            <span />
          </button>
        ))}
      </div>
    </section>
  )
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 64 : -64,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -64 : 64,
    opacity: 0,
    scale: 0.97,
  }),
}
