import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeartHandshake, CalendarHeart, UserRound } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import './Experience.css'

const icons = [HeartHandshake, CalendarHeart, UserRound] as const
const accents = ['coral', 'beige', 'green'] as const

export function Atmosphere() {
  const { t } = useLang()

  return (
    <section className="experience" id="atmosphere">
      <div className="experience__head">
        <p className="eyebrow">{t.atmosphere.eyebrow}</p>
        <h2 className="experience__title display">{t.atmosphere.title}</h2>
        <p className="experience__intro">{t.atmosphere.body}</p>
      </div>

      <div className="experience__grid experience__grid--salon">
        {t.atmosphere.cards.map((card, i) => {
          const Icon = icons[i]
          return (
            <motion.article
              key={card.title}
              className={`experience__card glass experience__card--${accents[i]}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.7 }}
            >
              <div className="experience__icon">
                <Icon size={22} />
              </div>
              <h3 className="serif">{card.title}</h3>
              <p>{card.body}</p>
            </motion.article>
          )
        })}
      </div>

      <div className="experience__cta">
        <Link to="/booking" className="btn btn-primary">
          {t.atmosphere.cta}
        </Link>
      </div>
    </section>
  )
}
