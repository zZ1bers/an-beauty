import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import { NeonHeart } from './NeonHeart'
import './Experience.css'

export function Atmosphere() {
  const { t } = useLang()

  return (
    <section className="experience" id="atmosphere">
      <NeonHeart side="left" top="18%" size={20} delay={0.8} opacity={0.55} tilt={-14} depth="edge" />
      <NeonHeart side="right" top="42%" size={28} delay={0.4} opacity={0.68} tilt={19} depth="near" />
      <NeonHeart side="left" top="68%" size={16} delay={1.5} opacity={0.48} tilt={-22} depth="mid" />
      <NeonHeart side="right" top="90%" size={22} delay={1.0} opacity={0.58} tilt={8} depth="edge" />

      <div className="experience__inner layout-container">
        <header className="experience__head section-heading section-heading--end">
          <span className="lux-line lux-line--vertical" aria-hidden />
          <div className="section-heading__text">
            <p className="eyebrow">{t.atmosphere.eyebrow}</p>
            <h2 className="experience__title display">{t.atmosphere.title}</h2>
            <p className="experience__intro">{t.atmosphere.body}</p>
          </div>
        </header>

        <ol className="experience__list">
          {t.atmosphere.cards.map((card, i) => (
            <motion.li
              key={card.title}
              className="experience__item"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-8%' }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="experience__num">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="serif">{card.title}</h3>
              <p>{card.body}</p>
            </motion.li>
          ))}
        </ol>

        <div className="experience__cta">
          <Link to="/booking" className="btn btn-primary">
            {t.atmosphere.cta}
          </Link>
        </div>
      </div>
    </section>
  )
}
