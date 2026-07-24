import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import './Manifesto.css'

export function AboutSalon() {
  const { t } = useLang()

  return (
    <section className="manifesto" id="about">
      <div className="manifesto__grid">
        <motion.div
          className="manifesto__left"
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="eyebrow">{t.about.eyebrow}</p>
          <h2 className="manifesto__title display">{t.about.title}</h2>
        </motion.div>

        <motion.div
          className="manifesto__right"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.9, delay: 0.15 }}
        >
          <p className="manifesto__body serif">{t.about.body}</p>
          <div className="manifesto__pillars">
            {t.about.pillars.map((item, i) => (
              <div key={item} className="manifesto__pillar glass" style={{ '--i': i } as CSSProperties}>
                <span>0{i + 1}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="manifesto__marquee" aria-hidden>
        <div className="manifesto__track">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>
              AN.Beauty — HydraFacial — SPA — Brows — Body Ritual — Manicure — Skin Care — Wellness —
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
