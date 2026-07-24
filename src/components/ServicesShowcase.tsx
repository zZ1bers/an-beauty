import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { api } from '../lib/api'
import { NeonHeart } from './NeonHeart'
import './ServicesShowcase.css'

type Service = {
  id: string
  name: { ru: string; de: string }
  description: { ru: string; de: string }
  price: number
  duration: number
  image: string
  featured: boolean
}

export function ServicesShowcase() {
  const { t, locale } = useLang()
  const [featured, setFeatured] = useState<Service[]>([])

  useEffect(() => {
    void api<Service[]>('/services?featured=true', { auth: false }).then(setFeatured)
  }, [])

  return (
    <section className="services" id="services">
      <NeonHeart side="right" top="14%" size={18} delay={0.4} opacity={0.55} tilt={-22} depth="edge" />
      <NeonHeart side="left" top="36%" size={26} delay={1.2} opacity={0.62} tilt={15} depth="mid" />
      <NeonHeart side="right" top="58%" size={20} delay={0.7} opacity={0.48} tilt={8} depth="near" />
      <NeonHeart side="left" top="82%" size={22} delay={1.5} opacity={0.58} tilt={-11} depth="edge" />
      <div className="services__inner layout-container">
        <div className="services__head section-heading">
          <span className="lux-line lux-line--vertical" aria-hidden />
          <div className="section-heading__text">
            <div>
              <p className="eyebrow">{t.services.eyebrow}</p>
              <h2 className="services__title display">{t.services.title}</h2>
            </div>
            <p className="services__sub">{t.services.subtitle}</p>
          </div>
        </div>

        <div className="services__stage">
          {featured.map((service, i) => (
            <motion.article
              key={service.id}
              className={`services__card services__card--${i % 2 === 0 ? 'left' : 'right'}`}
              style={{ zIndex: i + 1 }}
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-8%' }}
              transition={{ duration: 0.75, delay: Math.min(i * 0.06, 0.3), ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="services__card-lift">
                <div className="services__media">
                  <img src={service.image} alt={service.name[locale]} loading="lazy" />
                  <div className="services__media-scrim" aria-hidden />
                </div>
                <div className="services__info">
                  <div className="services__meta">
                    <span>{service.duration} min</span>
                    <span>
                      {t.services.from} €{service.price}
                    </span>
                  </div>
                  <h3 className="serif">{service.name[locale]}</h3>
                  <p>{service.description[locale]}</p>
                  <Link to={`/booking?service=${service.id}`} className="services__link">
                    {t.services.book}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="services__all">
          <Link to="/booking" className="btn btn-primary">
            {t.services.all}
          </Link>
        </div>
      </div>
    </section>
  )
}
