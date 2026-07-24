import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type MouseEvent } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { scrollToHash } from './HashScroll'
import './Footer.css'

export function Footer() {
  const { t, locale, setLocale } = useLang()
  const location = useLocation()
  const navigate = useNavigate()

  const onHashNav = (e: MouseEvent<HTMLAnchorElement>, to: string) => {
    const hashIndex = to.indexOf('#')
    if (hashIndex === -1) return
    const path = to.slice(0, hashIndex) || '/'
    const hash = to.slice(hashIndex)

    e.preventDefault()
    if (location.pathname === path) {
      window.history.pushState(null, '', hash)
      scrollToHash(hash)
      return
    }
    navigate(to)
  }

  return (
    <footer className="footer">
      <div className="lux-line footer__rule" aria-hidden />
      <div className="footer__top">
        <Link to="/" className="footer__brand display">
          AN<span>.</span>Beauty
        </Link>
        <div className="footer__links">
          <a href="/#about" onClick={(e) => onHashNav(e, '/#about')}>
            {t.nav.about}
          </a>
          <a href="/#services" onClick={(e) => onHashNav(e, '/#services')}>
            {t.nav.services}
          </a>
          <a href="/#masters" onClick={(e) => onHashNav(e, '/#masters')}>
            {t.nav.masters}
          </a>
          <Link to="/booking">{t.nav.book}</Link>
          <Link to="/cabinet">{t.nav.cabinet}</Link>
        </div>
        <div className="footer__lang">
          <span>{t.footer.lang}</span>
          <button className={locale === 'ru' ? 'is-active' : ''} onClick={() => setLocale('ru')}>
            RU
          </button>
          <button className={locale === 'de' ? 'is-active' : ''} onClick={() => setLocale('de')}>
            DE
          </button>
        </div>
      </div>
      <p className="footer__copy">{t.footer.rights}</p>
      <div className="footer__legal">
        <Link to="/impressum">{t.footer.impressum}</Link>
        <Link to="/datenschutz">{t.footer.datenschutz}</Link>
      </div>
      <div className="lux-line footer__rule footer__rule--credit" aria-hidden />
      <p className="footer__credit">project by zziberss</p>
    </footer>
  )
}
