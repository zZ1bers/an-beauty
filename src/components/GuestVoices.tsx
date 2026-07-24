import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import { NeonHeart } from './NeonHeart'
import './GuestVoices.css'

export function GuestVoices() {
  const { t } = useLang()

  return (
    <section className="voices" id="voices">
      <NeonHeart side="right" top="25%" size={22} delay={0.6} opacity={0.58} tilt={-19} depth="edge" />
      <NeonHeart side="left" top="58%" size={32} delay={1.4} opacity={0.7} tilt={7} depth="mid" />
      <NeonHeart side="right" top="85%" size={18} delay={0.2} opacity={0.48} tilt={15} depth="near" />
      <div className="voices__inner layout-container">
        <header className="voices__head section-heading">
          <span className="lux-line lux-line--vertical" aria-hidden />
          <div className="section-heading__text">
            <p className="eyebrow">{t.voices.eyebrow}</p>
            <h2 className="voices__title display">{t.voices.title}</h2>
          </div>
        </header>

        <div className="voices__list">
          {t.voices.items.map((item, i) => (
            <motion.blockquote
              key={item.name}
              className="voices__item"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-8%' }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="serif">“{item.quote}”</p>
              <footer>
                <strong>{item.name}</strong>
                <span>{item.meta}</span>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}
