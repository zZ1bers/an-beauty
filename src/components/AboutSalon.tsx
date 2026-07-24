import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import { NeonHeart } from './NeonHeart'
import './Manifesto.css'

export function AboutSalon() {
  const { t } = useLang()

  return (
    <section className="manifesto" id="about">
      <NeonHeart side="right" top="28%" size={20} delay={0.2} opacity={0.55} tilt={14} depth="edge" />
      <NeonHeart side="left" top="78%" size={26} delay={1.1} opacity={0.7} tilt={-16} depth="near" />
      <div className="manifesto__grid">
        <motion.div
          className="manifesto__left"
          initial={{ opacity: 0, x: -36 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-heading">
            <span className="lux-line lux-line--vertical" aria-hidden />
            <div className="section-heading__text">
              <p className="eyebrow">{t.about.eyebrow}</p>
              <h2 className="manifesto__title display">{t.about.title}</h2>
              <p className="manifesto__body serif">{t.about.body}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="manifesto__visual"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            className="manifesto__photo"
            src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1400&q=85"
            alt=""
          />
          <img
            className="manifesto__accent manifesto__accent--tl"
            src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80"
            alt=""
          />
          <img
            className="manifesto__accent manifesto__accent--br"
            src="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&q=80"
            alt=""
          />
        </motion.div>
      </div>

      <div className="manifesto__marquee" aria-hidden>
        <div className="manifesto__track">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>{t.about.marquee}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
