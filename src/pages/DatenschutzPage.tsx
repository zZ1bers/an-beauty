import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { Footer } from '../components/Footer'
import './LegalPage.css'

function Ph({ children }: { children: string }) {
  return <mark className="legal__placeholder">{children}</mark>
}

export function DatenschutzPage() {
  const { locale } = useLang()
  const isRu = locale === 'ru'

  return (
    <main className="page-enter page-shell">
      <div className="page-shell__main page-shell__main--top">
        <article className="legal layout-container">
          <p className="eyebrow legal__eyebrow">AN.Beauty</p>
          <h1 className="legal__title display">
            {isRu ? 'Политика конфиденциальности' : 'Datenschutzerklärung'}
          </h1>
          <p className="legal__lead">
            {isRu
              ? 'Ниже — политика конфиденциальности в соответствии с GDPR (DSGVO) и законодательством Германии. Юридически значима немецкая версия; при расхождениях действует немецкий текст.'
              : 'Informationen zur Verarbeitung personenbezogener Daten gemäß der Datenschutz-Grundverordnung (DSGVO) und dem Bundesdatenschutzgesetz (BDSG).'}
          </p>

          {isRu && (
            <p className="legal__note">
              Полный юридический текст приведён на немецком языке ниже (как требуется для Германии). Русский заголовок — для удобства.
            </p>
          )}

          <h2>1. Verantwortlicher</h2>
          <p>
            Verantwortlicher im Sinne der DSGVO ist:
          </p>
          <p>
            AN.Beauty
            <br />
            <Ph>[Vollständiger Name / Firmenname]</Ph>
            <br />
            <Ph>[Straße und Hausnummer]</Ph>
            <br />
            <Ph>[PLZ und Ort]</Ph>
            <br />
            Deutschland
            <br />
            E-Mail: <Ph>[E-Mail-Adresse]</Ph>
            <br />
            Telefon: <Ph>[Telefonnummer]</Ph>
          </p>
          <p>
            Sofern ein Datenschutzbeauftragter bestellt ist:{' '}
            <Ph>[Name und Kontaktdaten des Datenschutzbeauftragten – falls vorhanden, sonst diesen Absatz entfernen]</Ph>
          </p>

          <h2>2. Allgemeines zur Datenverarbeitung</h2>
          <p>
            Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung einer funktionsfähigen Website,
            zur Durchführung unserer Leistungen (insbesondere Terminbuchungen) sowie zur Erfüllung vertraglicher und
            vorvertraglicher Pflichten erforderlich ist oder eine Einwilligung vorliegt.
          </p>
          <p>Rechtsgrundlagen der Verarbeitung sind insbesondere:</p>
          <ul>
            <li>Art. 6 Abs. 1 lit. a DSGVO – Einwilligung</li>
            <li>Art. 6 Abs. 1 lit. b DSGVO – Vertrag / vorvertragliche Maßnahmen</li>
            <li>Art. 6 Abs. 1 lit. c DSGVO – rechtliche Verpflichtung</li>
            <li>Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse</li>
          </ul>

          <h2>3. Hosting und Bereitstellung der Website</h2>
          <p>
            Diese Website wird bei einem Hosting-Anbieter betrieben. Dabei können Verbindungsdaten (z. B. IP-Adresse,
            Datum und Uhrzeit des Zugriffs, aufgerufene Seite, Browser-/Geräteinformationen) in Server-Logfiles
            verarbeitet werden. Die Verarbeitung erfolgt zur technischen Bereitstellung und Absicherung der Website
            (Art. 6 Abs. 1 lit. f DSGVO).
          </p>
          <p>
            Hosting-Anbieter: <Ph>[Name des Hosters, z. B. Vercel / Hetzner / …]</Ph>
            <br />
            Weitere Informationen:{' '}
            <Ph>[Link zur Datenschutzerklärung des Hosters]</Ph>
          </p>

          <h2>4. Registrierung und Kundenkonto</h2>
          <p>
            Für die Nutzung des Kundenbereichs können Sie ein Konto anlegen. Dabei verarbeiten wir insbesondere:
          </p>
          <ul>
            <li>Vor- und Nachname</li>
            <li>E-Mail-Adresse</li>
            <li>Telefonnummer (soweit angegeben)</li>
            <li>Passwort (nur in gehashter Form gespeichert)</li>
            <li>Kontodaten und Rolleninformationen (z. B. Kunde, Mitarbeiter, Admin)</li>
          </ul>
          <p>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag / vorvertragliche Maßnahmen) sowie – soweit
            erforderlich – Art. 6 Abs. 1 lit. f DSGVO (sichere Authentifizierung und Betrieb des Portals).
          </p>

          <h2>5. Terminbuchung und Leistungsdurchführung</h2>
          <p>
            Bei einer Buchung verarbeiten wir die für die Terminvereinbarung erforderlichen Daten, insbesondere Name,
            Kontaktdaten, gewählte Leistung, gewünschter Termin, zugewiesene Fachkraft sowie statusbezogene Angaben zur
            Buchung.
          </p>
          <p>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Soweit gesetzliche Aufbewahrungspflichten bestehen (z. B.
            handels- oder steuerrechtlich), zusätzlich Art. 6 Abs. 1 lit. c DSGVO.
          </p>

          <h2>6. Kommunikation</h2>
          <p>
            Wenn Sie uns per E-Mail oder über Kontaktformulare erreichen, verarbeiten wir die von Ihnen mitgeteilten
            Daten zur Bearbeitung der Anfrage (Art. 6 Abs. 1 lit. b oder lit. f DSGVO).
          </p>

          <h2>7. Cookies, Local Storage und Session-Daten</h2>
          <p>
            Wir setzen technisch notwendige Speichertechnologien ein, um die Website und den Login-Bereich
            funktionsfähig zu halten (z. B. Speicherung von Authentifizierungs-/Session-Informationen im Local Storage
            oder vergleichbaren Speicherorten des Browsers). Diese Speicherung ist für die sichere Nutzung des Portals
            erforderlich (Art. 6 Abs. 1 lit. b und/oder lit. f DSGVO).
          </p>
          <p>
            Soweit wir künftig nicht notwendige Cookies oder Analyse-/Marketing-Tools einsetzen, holen wir zuvor eine
            Einwilligung ein (Art. 6 Abs. 1 lit. a DSGVO) und informieren gesondert darüber.
          </p>

          <h2>8. Empfänger von Daten</h2>
          <p>Personenbezogene Daten können – soweit erforderlich – an folgende Kategorien von Empfängern übermittelt werden:</p>
          <ul>
            <li>IT- und Hosting-Dienstleister (Auftragsverarbeitung gemäß Art. 28 DSGVO)</li>
            <li>Mitarbeiterinnen und Mitarbeiter, die mit der Termin- und Kundenbetreuung betraut sind</li>
            <li>Behörden, soweit eine gesetzliche Verpflichtung besteht</li>
          </ul>
          <p>
            Eine Übermittlung in Drittländer außerhalb der EU/EWR erfolgt nur, wenn dies rechtlich zulässig ist
            (z. B. Angemessenheitsbeschluss oder geeignete Garantien nach Art. 44 ff. DSGVO). Details:{' '}
            <Ph>[Angaben zu etwaigen Drittlandtransfers – sonst: „Derzeit keine Übermittlung in unsichere Drittländer.“]</Ph>
          </p>

          <h2>9. Speicherdauer</h2>
          <p>
            Wir speichern personenbezogene Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist oder
            gesetzliche Aufbewahrungsfristen bestehen. Buchungs- und Vertragsdaten werden in der Regel für die Dauer
            der Geschäftsbeziehung und anschließend gemäß handels- und steuerrechtlichen Fristen (häufig bis zu 10 Jahre)
            aufbewahrt. Kontodaten werden gelöscht oder anonymisiert, sobald das Konto gelöscht wird und keine
            Aufbewahrungspflichten entgegenstehen. Server-Logs werden typischerweise nach kurzer Zeit gelöscht, soweit
            keine Sicherheitsgründe eine längere Speicherung erfordern.
          </p>

          <h2>10. Ihre Rechte als betroffene Person</h2>
          <p>Sie haben nach Maßgabe der DSGVO insbesondere folgende Rechte:</p>
          <ul>
            <li>Auskunft (Art. 15 DSGVO)</li>
            <li>Berichtigung (Art. 16 DSGVO)</li>
            <li>Löschung (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO)</li>
            <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>
          </ul>
          <p>
            Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an:{' '}
            <Ph>[E-Mail-Adresse für Datenschutzanfragen]</Ph>
          </p>

          <h2>11. Beschwerderecht bei einer Aufsichtsbehörde</h2>
          <p>
            Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere in dem
            Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes
            (Art. 77 DSGVO). Für Deutschland zuständig ist in der Regel die Aufsichtsbehörde des Bundeslandes, in dem
            der Verantwortliche seinen Sitz hat:{' '}
            <Ph>[Zuständige Aufsichtsbehörde, z. B. Landesbeauftragte/r für Datenschutz …]</Ph>
          </p>

          <h2>12. Pflicht zur Bereitstellung von Daten</h2>
          <p>
            Die Bereitstellung bestimmter Daten ist für Vertragsschluss und Buchung erforderlich (z. B. Name,
            Kontaktdaten, Terminwunsch). Ohne diese Angaben ist eine Terminvereinbarung bzw. Kontoerstellung nicht
            möglich.
          </p>

          <h2>13. Keine automatisierte Entscheidungsfindung</h2>
          <p>
            Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von Art. 22 DSGVO findet nicht
            statt.
          </p>

          <h2>14. Aktualität dieser Erklärung</h2>
          <p>
            Stand: Juli 2026. Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den
            aktuellen rechtlichen Anforderungen sowie unseren Leistungen entspricht.
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
