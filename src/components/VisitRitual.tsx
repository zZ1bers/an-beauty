import { motion } from 'framer-motion'
import { useLang } from '../i18n/LanguageContext'
import { NeonHeart } from './NeonHeart'
import './VisitRitual.css'

export function VisitRitual() {
  const { t } = useLang()

  return (
    <section className="ritual" id="ritual">
      <NeonHeart side="left" top="16%" size={18} delay={0.3} opacity={0.52} tilt={-24} depth="edge" />
      <NeonHeart side="right" top="40%" size={26} delay={0.9} opacity={0.68} tilt={12} depth="mid" />
      <NeonHeart side="left" top="68%" size={20} delay={1.6} opacity={0.48} tilt={18} depth="near" />
      <NeonHeart side="right" top="90%" size={16} delay={0.55} opacity={0.55} tilt={-8} depth="edge" />
      <div className="ritual__inner">
        <header className="ritual__head section-heading section-heading--end">
          <span className="lux-line lux-line--vertical" aria-hidden />
          <div className="section-heading__text">
            <p className="eyebrow">{t.ritual.eyebrow}</p>
            <h2 className="ritual__title display">{t.ritual.title}</h2>
            <p className="ritual__sub">{t.ritual.subtitle}</p>
          </div>
        </header>

        <div className="ritual__body">
          <aside className="ritual__visual" aria-hidden>
            <img
              className="ritual__photo"
              src="https://images.unsplash.com/photo-1709153800095-924201e7b212?w=900&q=85"
              alt=""
            />
          </aside>

          <ol className="ritual__steps">
            {t.ritual.steps.map((step, i) => (
              <motion.li
                key={step.title}
                className="ritual__step"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-8%' }}
                transition={{ delay: i * 0.07, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="ritual__copy">
                  <h3 className="serif">{step.title}</h3>
                  <p>{step.body}</p>
                </div>
                <span className="ritual__num">{String(i + 1).padStart(2, '0')}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
