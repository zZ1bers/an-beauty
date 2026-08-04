import nodemailer from 'nodemailer'
import { config } from '../config.js'
import { buildPasswordResetEmail } from './emailTemplates.js'

function mailConfigured() {
  return Boolean(config.mail.host && config.mail.user && config.mail.pass)
}

function createTransport() {
  return nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass,
    },
  })
}

export async function sendPasswordResetCode(opts: {
  to: string
  code: string
  firstName: string
  locale: 'ru' | 'de'
}) {
  const { subject, html, text } = buildPasswordResetEmail({
    code: opts.code,
    firstName: opts.firstName,
    locale: opts.locale,
    siteUrl: config.frontendUrl,
  })

  if (!mailConfigured()) {
    console.warn(
      `[mail] SMTP not configured — password reset code for ${opts.to}: ${opts.code}`,
    )
    if (config.isDev) return { ok: true as const, logged: true as const }
    throw new Error('SMTP_NOT_CONFIGURED')
  }

  const transport = createTransport()
  await transport.sendMail({
    from: config.mail.from,
    to: opts.to,
    subject,
    html,
    text,
  })
  return { ok: true as const, logged: false as const }
}
