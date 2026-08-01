import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { Footer } from '../components/Footer'
import './LegalPage.css'

export function ImpressumPage() {
  const { locale } = useLang()
  const isRu = locale === 'ru'

  return (
    <main className="page-enter page-shell">
      <div className="page-shell__main page-shell__main--top">
        <article className="legal layout-container">
          <p className="eyebrow legal__eyebrow">AN.Beauty</p>
          <h1 className="legal__title display">Impressum</h1>
          <p className="legal__lead">
            {isRu
              ? 'Сведения согласно § 5 DDG (ранее TMG) и § 18 Abs. 2 MStV.'
              : 'Angaben gemäß § 5 DDG (ehemals TMG) und § 18 Abs. 2 MStV.'}
          </p>

          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            AN.Beauty
            <br />
            Anait Havalian
            <br />
            Einzelunternehmen
          </p>

          <h3>Anschrift</h3>
          <p>
            Rückerstr. 4
            <br />
            90419 Nürnberg
            <br />
            Deutschland
          </p>

          <h3>Kontakt</h3>
          <p>
            Telefon: +49 173 2519021
            <br />
            E-Mail:{' '}
            <a href="mailto:an.beauty0990@gmail.com">an.beauty0990@gmail.com</a>
            <br />
            Website:{' '}
            <a href="https://an-beauty.com" target="_blank" rel="noreferrer">
              an-beauty.com
            </a>
          </p>

          <h2>Vertretung</h2>
          <p>Vertretungsberechtigte Person: Anait Havalian</p>

          <h2>Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: Nicht vorhanden
            (Kleinunternehmerregelung gemäß § 19 UStG).
          </p>

          <h2>Berufsrechtliche Angaben</h2>
          <p>
            Berufsbezeichnung: Master-Maniküre
            <br />
            Verliehen in: Ukraine
          </p>

          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            Anait Havalian
            <br />
            Rückerstr. 4
            <br />
            90419 Nürnberg
            <br />
            Deutschland
          </p>

          <h2>EU-Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">
              https://ec.europa.eu/consumers/odr/
            </a>
            . Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>

          <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
          <p>
            Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>

          <h2>Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den
            allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
            forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der
            Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
          </p>

          <h2>Haftung für Links</h2>
          <p>
            Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
            Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>

          <h2>Urheberrecht</h2>
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
            Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
            Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>

          <Link to="/" className="legal__back">
            ← {isRu ? 'На главную' : 'Zur Startseite'}
          </Link>
        </article>
      </div>
      <Footer />
    </main>
  )
}
