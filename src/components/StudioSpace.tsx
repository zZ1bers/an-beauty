import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import { NeonHeart } from './NeonHeart'
import './StudioSpace.css'

export function StudioSpace() {
  const { t } = useLang()

  return (
    <section className="studio" id="studio">
      <NeonHeart side="left" top="22%" size={20} delay={0.4} opacity={0.55} tilt={-18} depth="edge" />
      <NeonHeart side="right" top="48%" size={28} delay={1.1} opacity={0.68} tilt={14} depth="mid" />
      <NeonHeart side="left" top="78%" size={16} delay={0.7} opacity={0.45} tilt={22} depth="near" />

      <div className="studio__media">
        <img
          src="https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=1800&q=85"
          alt=""
        />
        <div className="studio__scrim" />
      </div>

      <motion.div
        className="studio__copy"
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="section-heading section-heading--center">
          <span className="lux-line lux-line--vertical" aria-hidden />
          <div className="section-heading__text">
            <p className="eyebrow">{t.studio.eyebrow}</p>
            <h2 className="studio__title display">{t.studio.title}</h2>
            <p className="studio__body serif">{t.studio.body}</p>
            <p className="studio__note">{t.studio.note}</p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
