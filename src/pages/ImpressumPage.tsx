import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { Footer } from '../components/Footer'
import './LegalPage.css'

function Ph({ children }: { children: string }) {
  return <mark className="legal__placeholder">{children}</mark>
}

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
              ? 'Сведения согласно § 5 DDG (ранее TMG) и § 18 MStV. Поля в розовом — плейсхолдеры: подставьте свои данные.'
              : 'Angaben gemäß § 5 DDG (ehemals TMG) und § 18 Abs. 2 MStV. Rosa markierte Felder bitte durch Ihre Angaben ersetzen.'}
          </p>

          <p className="legal__note">
            {isRu
              ? 'Пока заполнены только плейсхолдеры. Пришлите данные — подставим в текст.'
              : 'Noch Platzhalter. Sobald Sie die finalen Angaben senden, ersetzen wir die Markierungen.'}
          </p>

          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            AN.Beauty
            <br />
            <Ph>[Vollständiger Name der/des Inhaber:in bzw. Firmenname]</Ph>
            <br />
            <Ph>[Rechtsform, z. B. Einzelunternehmen / GmbH / … – falls zutreffend]</Ph>
          </p>

          <h3>Anschrift</h3>
          <p>
            <Ph>[Straße und Hausnummer]</Ph>
            <br />
            <Ph>[PLZ und Ort]</Ph>
            <br />
            Deutschland
          </p>

          <h3>Kontakt</h3>
          <p>
            Telefon: <Ph>[Telefonnummer]</Ph>
            <br />
            E-Mail: <Ph>[E-Mail-Adresse]</Ph>
            <br />
            Website: an.beauty
          </p>

          <h2>Vertretung / Geschäftsführung</h2>
          <p>
            Vertretungsberechtigte Person(en):{' '}
            <Ph>[Vor- und Nachname der vertretungsberechtigten Person(en)]</Ph>
          </p>

          <h2>Registereintrag</h2>
          <p>
            {isRu
              ? 'Только если есть запись в торговом реестре (например, GmbH):'
              : 'Nur ausfüllen, falls ein Handelsregistereintrag besteht (z. B. GmbH):'}
          </p>
          <p>
            Registergericht: <Ph>[Amtsgericht …]</Ph>
            <br />
            Registernummer: <Ph>[HRB … / HRA …]</Ph>
          </p>
          <p>
            {isRu
              ? 'Если вы индивидуальный предприниматель без записи в реестре — этот блок можно удалить.'
              : 'Bei Einzelunternehmen ohne Registereintrag kann dieser Abschnitt entfallen.'}
          </p>

          <h2>Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:{' '}
            <Ph>[DE… – falls vorhanden, sonst „Nicht vorhanden“ / Kleinunternehmer]</Ph>
          </p>

          <h2>Berufsrechtliche Angaben</h2>
          <p>
            {isRu
              ? 'Если деятельность подлежит особым профессиональным правилам — укажите. Иначе можно оставить «не применяется».'
              : 'Falls für Ihre Tätigkeit besondere berufsrechtliche Regelungen gelten, bitte ergänzen. Ansonsten: „Nicht einschlägig“.'}
          </p>
          <p>
            Berufsbezeichnung: <Ph>[z. B. Kosmetiker:in – falls relevant]</Ph>
            <br />
            Zuständige Kammer / Aufsicht: <Ph>[falls vorhanden]</Ph>
            <br />
            Verliehen in: <Ph>[Land / Ort]</Ph>
          </p>

          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            <Ph>[Vor- und Nachname]</Ph>
            <br />
            <Ph>[Anschrift – in der Regel wie oben]</Ph>
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
            {/* Wenn Sie teilnehmen: Text anpassen und Stelle nennen. */}
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
