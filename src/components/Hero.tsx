import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDownRight, Sparkles } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import './Hero.css'

export function Hero() {
  const { t } = useLang()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [0, 180])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12])

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero__media" style={{ scale }}>
        <div className="hero__video-fallback" />
        <div className="hero__grain" />
        <div className="hero__vignette" />
        <div className="orb hero__orb-1" />
        <div className="orb hero__orb-2" />
      </motion.div>

      <motion.div className="hero__content" style={{ y, opacity }}>
        <motion.p
          className="eyebrow hero__tag"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Sparkles size={12} />
          {t.hero.tagline}
        </motion.p>

        <motion.h1
          className="hero__brand display"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {t.hero.brand}
        </motion.h1>

        <motion.p
          className="hero__title serif"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55 }}
        >
          {t.hero.title}
        </motion.p>

        <motion.div
          className="hero__cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85 }}
        >
          <Link to="/booking" className="btn btn-primary">
            {t.hero.cta}
          </Link>
          <a href="#about" className="btn btn-ghost hero__cta-explore">
            {t.hero.explore}
            <ArrowDownRight size={16} className="hero__cta-arrow" aria-hidden />
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        className="hero__scroll"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <span>{t.hero.scroll}</span>
        <div className="hero__scroll-line" />
      </motion.div>

      <div className="hero__float glass">
        <span className="hero__float-label">{t.hero.floatLabel}</span>
        <strong>{t.hero.floatValue}</strong>
        <span className="hero__float-meta">{t.hero.floatMeta}</span>
      </div>
    </section>
  )
}
