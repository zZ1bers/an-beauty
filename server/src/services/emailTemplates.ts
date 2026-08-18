type ResetEmailInput = {
  code: string
  firstName: string
  locale: 'ru' | 'de'
  siteUrl: string
}

export function buildPasswordResetEmail(input: ResetEmailInput) {
  const { code, firstName, locale, siteUrl } = input
  const name = firstName?.trim() || (locale === 'ru' ? 'гость' : 'Gast')
  const impressum = `${siteUrl}/impressum`
  const datenschutz = `${siteUrl}/datenschutz`
  const login = `${siteUrl}/login`
  const home = siteUrl

  const copy =
    locale === 'ru'
      ? {
          subject: 'Код восстановления пароля · AN.Beauty',
          preheader: 'Ваш код для сброса пароля действует 15 минут.',
          greeting: `Здравствуйте, ${name}`,
          lead: 'Мы получили запрос на восстановление доступа к вашему аккаунту AN.Beauty.',
          codeLabel: 'Ваш код подтверждения',
          expires: 'Код действителен 15 минут. Если вы не запрашивали сброс — просто проигнорируйте это письмо.',
          ctaLogin: 'Перейти ко входу',
          ctaSite: 'Открыть сайт',
          help: 'Нужна помощь? Напишите нам — мы ответим лично.',
          team: 'С уважением,\nкоманда AN.Beauty',
          footerLegal: 'Private beauty atelier · Nürnberg',
          address: 'Anait Havalian · 90419 Nürnberg · Deutschland',
          contact: 'an.beauty0990@gmail.com',
        }
      : {
          subject: 'Passwort-Wiederherstellungscode · AN.Beauty',
          preheader: 'Ihr Code zum Zurücksetzen des Passworts ist 15 Minuten gültig.',
          greeting: `Guten Tag, ${name}`,
          lead: 'Wir haben eine Anfrage zum Zurücksetzen Ihres AN.Beauty-Zugangs erhalten.',
          codeLabel: 'Ihr Bestätigungscode',
          expires:
            'Der Code ist 15 Minuten gültig. Wenn Sie keine Zurücksetzung angefordert haben, ignorieren Sie diese E-Mail bitte.',
          ctaLogin: 'Zum Login',
          ctaSite: 'Website öffnen',
          help: 'Fragen? Schreiben Sie uns — wir antworten persönlich.',
          team: 'Mit freundlichen Grüßen\nIhr AN.Beauty Team',
          footerLegal: 'Private beauty atelier · Nürnberg',
          address: 'Anait Havalian · 90419 Nürnberg · Deutschland',
          contact: 'an.beauty0990@gmail.com',
        }

  const digits = code.split('').map(
    (d) =>
      `<td style="width:42px;height:52px;border:1px solid #e8dfd6;border-radius:10px;background:#fff;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#2c241f;letter-spacing:0;">${d}</td>`,
  ).join('<td style="width:8px;"></td>')

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${copy.subject}</title>
  <!--[if mso]><style>table,td{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f3eee8;color:#2c241f;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee8;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffaf6;border:1px solid #e8dfd6;border-radius:20px;overflow:hidden;box-shadow:0 18px 48px rgba(58,42,32,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#E7717D 0%,#d45a67 55%,#c24d5a 100%);padding:28px 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:-0.03em;color:#ffffff;">
                    AN<span style="color:#F4EFE9;">.</span>Beauty
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.85);">
                    ${copy.footerLegal}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 12px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#E7717D;font-weight:700;">Security notice</p>
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:700;color:#2c241f;">${copy.greeting}</h1>
              <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#5c5148;">${copy.lead}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1ea;border:1px solid #eadfd4;border-radius:16px;margin:0 0 18px;">
                <tr>
                  <td style="padding:22px 20px;text-align:center;">
                    <p style="margin:0 0 14px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8a7b70;font-weight:700;">${copy.codeLabel}</p>
                    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 6px;">
                      <tr>${digits}</tr>
                    </table>
                    <p style="margin:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;letter-spacing:0.28em;color:#2c241f;font-weight:700;">${code}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:14px;line-height:1.55;color:#7a6c61;">${copy.expires}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:999px;background:#E7717D;">
                    <a href="${login}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;color:#ffffff;text-decoration:none;">${copy.ctaLogin}</a>
                  </td>
                  <td style="width:10px;"></td>
                  <td style="border-radius:999px;border:1px solid #d8cdc3;background:#ffffff;">
                    <a href="${home}" style="display:inline-block;padding:13px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#2c241f;text-decoration:none;">${copy.ctaSite}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:14px;line-height:1.55;color:#5c5148;">${copy.help}</p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#2c241f;white-space:pre-line;">${copy.team}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px;">
              <div style="height:1px;background:#eadfd4;margin:8px 0 22px;"></div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#8a7b70;">
                    <strong style="color:#2c241f;font-size:13px;">AN.Beauty</strong><br />
                    ${copy.address}<br />
                    <a href="mailto:${copy.contact}" style="color:#E7717D;text-decoration:none;">${copy.contact}</a>
                    ·
                    <a href="${home}" style="color:#E7717D;text-decoration:none;">an-beauty.com</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                <tr>
                  <td style="padding-right:10px;">
                    <a href="${impressum}" style="display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid #d8cdc3;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#2c241f;text-decoration:none;">Impressum</a>
                  </td>
                  <td style="padding-right:10px;">
                    <a href="${datenschutz}" style="display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid #d8cdc3;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#2c241f;text-decoration:none;">Datenschutz</a>
                  </td>
                  <td>
                    <a href="${login}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#2c241f;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#F4EFE9;text-decoration:none;">Login</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#a4988d;">
                © ${new Date().getFullYear()} AN.Beauty · Private beauty atelier. Dieses Schreiben ist vertraulich und nur für den Empfänger bestimmt.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    copy.greeting,
    '',
    copy.lead,
    '',
    `${copy.codeLabel}: ${code}`,
    copy.expires,
    '',
    `${copy.ctaLogin}: ${login}`,
    `${copy.ctaSite}: ${home}`,
    '',
    `Impressum: ${impressum}`,
    `Datenschutz: ${datenschutz}`,
    '',
    copy.team,
    copy.address,
    copy.contact,
  ].join('\n')

  return { subject: copy.subject, html, text }
}

type BookingEmailShared = {
  locale: 'ru' | 'de'
  siteUrl: string
  clientFirstName: string
  clientLastName: string
  masterName: string
  serviceName: string
  whenLabel: string
  address: string
  priceLabel?: string | null
  notes?: string | null
  clientPhone?: string | null
  clientEmail?: string | null
}

function emailShell(opts: {
  locale: 'ru' | 'de'
  siteUrl: string
  subject: string
  preheader: string
  eyebrow: string
  greeting: string
  lead: string
  rows: { label: string; value: string }[]
  note?: string
  ctaLabel: string
  ctaHref: string
  help: string
  team: string
}) {
  const impressum = `${opts.siteUrl}/impressum`
  const datenschutz = `${opts.siteUrl}/datenschutz`
  const home = opts.siteUrl
  const contact = 'info@an-beauty.com'
  const address = 'Anait Havalian · Rückerstr. 4 · 90419 Nürnberg · Deutschland'
  const footerLegal = 'Private beauty atelier · Nürnberg'

  const detailRows = opts.rows
    .map(
      (r) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #eadfd4;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a7b70;width:38%;">${r.label}</td>
                  <td style="padding:10px 0;border-bottom:1px solid #eadfd4;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2c241f;text-align:right;">${r.value}</td>
                </tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="${opts.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${opts.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3eee8;color:#2c241f;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee8;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffaf6;border:1px solid #e8dfd6;border-radius:20px;overflow:hidden;box-shadow:0 18px 48px rgba(58,42,32,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#E7717D 0%,#d45a67 55%,#c24d5a 100%);padding:28px 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:-0.03em;color:#ffffff;">
                    AN<span style="color:#F4EFE9;">.</span>Beauty
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.85);">
                    ${footerLegal}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 12px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#E7717D;font-weight:700;">${opts.eyebrow}</p>
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:700;color:#2c241f;">${opts.greeting}</h1>
              <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#5c5148;">${opts.lead}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1ea;border:1px solid #eadfd4;border-radius:16px;margin:0 0 18px;">
                <tr>
                  <td style="padding:8px 22px 14px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${detailRows}
                    </table>
                  </td>
                </tr>
              </table>
              ${opts.note ? `<p style="margin:0 0 28px;font-size:14px;line-height:1.55;color:#7a6c61;">${opts.note}</p>` : '<div style="height:10px;"></div>'}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:999px;background:#E7717D;">
                    <a href="${opts.ctaHref}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;color:#ffffff;text-decoration:none;">${opts.ctaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.55;color:#5c5148;">${opts.help}</p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#2c241f;white-space:pre-line;">${opts.team}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <div style="height:1px;background:#eadfd4;margin:8px 0 22px;"></div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#8a7b70;">
                    <strong style="color:#2c241f;font-size:13px;">AN.Beauty</strong><br />
                    ${address}<br />
                    <a href="mailto:${contact}" style="color:#E7717D;text-decoration:none;">${contact}</a>
                    ·
                    <a href="${home}" style="color:#E7717D;text-decoration:none;">an-beauty.com</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                <tr>
                  <td style="padding-right:10px;">
                    <a href="${impressum}" style="display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid #d8cdc3;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#2c241f;text-decoration:none;">Impressum</a>
                  </td>
                  <td>
                    <a href="${datenschutz}" style="display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid #d8cdc3;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#2c241f;text-decoration:none;">Datenschutz</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#a4988d;">
                © ${new Date().getFullYear()} AN.Beauty · Private beauty atelier.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    opts.greeting,
    '',
    opts.lead,
    '',
    ...opts.rows.map((r) => `${r.label}: ${r.value}`),
    opts.note ? `\n${opts.note}` : '',
    '',
    `${opts.ctaLabel}: ${opts.ctaHref}`,
    '',
    opts.team,
    address,
    contact,
  ]
    .filter(Boolean)
    .join('\n')

  return { subject: opts.subject, html, text }
}

export function buildBookingClientConfirmEmail(input: BookingEmailShared) {
  const { locale, siteUrl } = input
  const name = input.clientFirstName?.trim() || (locale === 'ru' ? 'гость' : 'Gast')
  const copy =
    locale === 'ru'
      ? {
          subject: 'Ваша запись подтверждена · AN.Beauty',
          preheader: `Термин: ${input.serviceName}, ${input.whenLabel}`,
          eyebrow: 'Подтверждение записи',
          greeting: `Здравствуйте, ${name}`,
          lead: 'Спасибо! Ваша запись в AN.Beauty подтверждена. Мы ждём вас в ателье.',
          service: 'Услуга',
          when: 'Дата и время',
          master: 'Мастер',
          address: 'Адрес',
          price: 'Стоимость',
          notes: 'Комментарий',
          note: 'Если нужно перенести или отменить запись — напишите нам или зайдите в личный кабинет.',
          cta: 'Личный кабинет',
          help: 'До встречи в студии. Если возникнут вопросы — просто ответьте на это письмо.',
          team: 'С уважением,\nкоманда AN.Beauty',
        }
      : {
          subject: 'Ihr Termin ist bestätigt · AN.Beauty',
          preheader: `Termin: ${input.serviceName}, ${input.whenLabel}`,
          eyebrow: 'Terminbestätigung',
          greeting: `Guten Tag, ${name}`,
          lead: 'Vielen Dank! Ihr Termin bei AN.Beauty ist bestätigt. Wir freuen uns auf Sie.',
          service: 'Leistung',
          when: 'Datum & Uhrzeit',
          master: 'Meister/in',
          address: 'Adresse',
          price: 'Preis',
          notes: 'Hinweis',
          note: 'Wenn Sie den Termin verschieben oder absagen möchten, schreiben Sie uns oder nutzen Sie Ihr Konto.',
          cta: 'Zum Konto',
          help: 'Bis bald im Atelier. Bei Fragen antworten Sie einfach auf diese E-Mail.',
          team: 'Mit freundlichen Grüßen\nIhr AN.Beauty Team',
        }

  const rows = [
    { label: copy.service, value: input.serviceName },
    { label: copy.when, value: input.whenLabel },
    { label: copy.master, value: input.masterName },
    { label: copy.address, value: input.address },
  ]
  if (input.priceLabel) rows.push({ label: copy.price, value: input.priceLabel })
  if (input.notes?.trim()) rows.push({ label: copy.notes, value: input.notes.trim() })

  return emailShell({
    locale,
    siteUrl,
    subject: copy.subject,
    preheader: copy.preheader,
    eyebrow: copy.eyebrow,
    greeting: copy.greeting,
    lead: copy.lead,
    rows,
    note: copy.note,
    ctaLabel: copy.cta,
    ctaHref: `${siteUrl}/cabinet`,
    help: copy.help,
    team: copy.team,
  })
}

export function buildBookingClientReminderEmail(input: BookingEmailShared) {
  const { locale, siteUrl } = input
  const name = input.clientFirstName?.trim() || (locale === 'ru' ? 'гость' : 'Gast')
  const copy =
    locale === 'ru'
      ? {
          subject: 'Напоминание: завтра у вас термин · AN.Beauty',
          preheader: `Завтра: ${input.serviceName}, ${input.whenLabel}`,
          eyebrow: 'Напоминание о записи',
          greeting: `Здравствуйте, ${name}`,
          lead: 'Напоминаем: завтра у вас термин в AN.Beauty. Пожалуйста, не забудьте — мы вас ждём.',
          service: 'Услуга',
          when: 'Дата и время',
          master: 'Мастер',
          address: 'Адрес',
          price: 'Стоимость',
          notes: 'Комментарий',
          note: 'Если нужно перенести или отменить — напишите нам или зайдите в личный кабинет.',
          cta: 'Личный кабинет',
          help: 'До завтра в студии. Вопросы — просто ответьте на это письмо.',
          team: 'С уважением,\nкоманда AN.Beauty',
        }
      : {
          subject: 'Erinnerung: morgen haben Sie einen Termin · AN.Beauty',
          preheader: `Morgen: ${input.serviceName}, ${input.whenLabel}`,
          eyebrow: 'Terminerinnerung',
          greeting: `Guten Tag, ${name}`,
          lead: 'Erinnerung: morgen haben Sie einen Termin bei AN.Beauty. Bitte nicht vergessen — wir freuen uns auf Sie.',
          service: 'Leistung',
          when: 'Datum & Uhrzeit',
          master: 'Meister/in',
          address: 'Adresse',
          price: 'Preis',
          notes: 'Hinweis',
          note: 'Zum Verschieben oder Absagen schreiben Sie uns oder nutzen Sie Ihr Konto.',
          cta: 'Zum Konto',
          help: 'Bis morgen im Atelier. Bei Fragen antworten Sie einfach auf diese E-Mail.',
          team: 'Mit freundlichen Grüßen\nIhr AN.Beauty Team',
        }

  const rows = [
    { label: copy.service, value: input.serviceName },
    { label: copy.when, value: input.whenLabel },
    { label: copy.master, value: input.masterName },
    { label: copy.address, value: input.address },
  ]
  if (input.priceLabel) rows.push({ label: copy.price, value: input.priceLabel })
  if (input.notes?.trim()) rows.push({ label: copy.notes, value: input.notes.trim() })

  return emailShell({
    locale,
    siteUrl,
    subject: copy.subject,
    preheader: copy.preheader,
    eyebrow: copy.eyebrow,
    greeting: copy.greeting,
    lead: copy.lead,
    rows,
    note: copy.note,
    ctaLabel: copy.cta,
    ctaHref: `${siteUrl}/cabinet`,
    help: copy.help,
    team: copy.team,
  })
}

export function buildBookingMasterNotifyEmail(
  input: BookingEmailShared & { masterLocale: 'ru' | 'de'; staffPath?: string },
) {
  const locale = input.masterLocale
  const { siteUrl } = input
  const staffHref = `${siteUrl}${input.staffPath || '/b3Fh6tY1cJ9sD5uA'}`
  const name = input.masterName.split(' ')[0] || (locale === 'ru' ? 'коллега' : 'Kollegin')
  const clientName = `${input.clientFirstName} ${input.clientLastName}`.trim()
  const copy =
    locale === 'ru'
      ? {
          subject: 'Новая запись клиента · AN.Beauty',
          preheader: `${clientName}: ${input.serviceName}, ${input.whenLabel}`,
          eyebrow: 'Новый клиент',
          greeting: `Здравствуйте, ${name}`,
          lead: 'На сайте появилась новая запись на ваше имя. Детали ниже.',
          client: 'Клиент',
          phone: 'Телефон',
          email: 'Email',
          service: 'Услуга',
          when: 'Дата и время',
          notes: 'Комментарий',
          cta: 'Открыть расписание',
          help: 'Проверьте детали в кабинете мастера.',
          team: 'AN.Beauty',
        }
      : {
          subject: 'Neuer Kundentermin · AN.Beauty',
          preheader: `${clientName}: ${input.serviceName}, ${input.whenLabel}`,
          eyebrow: 'Neuer Termin',
          greeting: `Guten Tag, ${name}`,
          lead: 'Über die Website wurde ein neuer Termin für Sie gebucht. Details unten.',
          client: 'Kundin / Kunde',
          phone: 'Telefon',
          email: 'E-Mail',
          service: 'Leistung',
          when: 'Datum & Uhrzeit',
          notes: 'Hinweis',
          cta: 'Zum Terminplan',
          help: 'Details finden Sie in Ihrem Mitarbeiter-Bereich.',
          team: 'AN.Beauty',
        }

  const rows = [
    { label: copy.client, value: clientName },
    { label: copy.service, value: input.serviceName },
    { label: copy.when, value: input.whenLabel },
  ]
  if (input.clientPhone) rows.push({ label: copy.phone, value: input.clientPhone })
  if (input.clientEmail) rows.push({ label: copy.email, value: input.clientEmail })
  if (input.notes?.trim()) rows.push({ label: copy.notes, value: input.notes.trim() })

  return emailShell({
    locale,
    siteUrl,
    subject: copy.subject,
    preheader: copy.preheader,
    eyebrow: copy.eyebrow,
    greeting: copy.greeting,
    lead: copy.lead,
    rows,
    ctaLabel: copy.cta,
    ctaHref: staffHref,
    help: copy.help,
    team: copy.team,
  })
}
