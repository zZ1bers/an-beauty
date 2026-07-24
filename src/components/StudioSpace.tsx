import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import './StudioSpace.css'

export function StudioSpace() {
  const { t } = useLang()

  return (
    <section className="studio" id="studio">
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
