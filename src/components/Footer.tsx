import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import './Footer.css'

export function Footer() {
  const { t, locale, setLocale } = useLang()

  return (
    <footer className="footer">
      <div className="footer__top">
        <Link to="/" className="footer__brand display">
          AN<span>.</span>Beauty
        </Link>
        <div className="footer__links">
          <a href="/#services">{t.nav.services}</a>
          <a href="/#masters">{t.nav.masters}</a>
          <a href="/#about">{t.nav.about}</a>
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
    </footer>
  )
}
