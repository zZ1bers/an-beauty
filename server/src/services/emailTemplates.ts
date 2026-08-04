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
