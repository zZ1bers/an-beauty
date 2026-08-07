import nodemailer from 'nodemailer'
import { config } from '../config.js'
import {
  buildBookingClientConfirmEmail,
  buildBookingMasterNotifyEmail,
  buildPasswordResetEmail,
} from './emailTemplates.js'

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

async function sendMail(opts: { to: string; subject: string; html: string; text: string }) {
  if (!mailConfigured()) {
    console.warn(`[mail] SMTP not configured — to ${opts.to}: ${opts.subject}`)
    if (config.isDev) return { ok: true as const, logged: true as const }
    throw new Error('SMTP_NOT_CONFIGURED')
  }

  const transport = createTransport()
  await transport.sendMail({
    from: config.mail.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
  return { ok: true as const, logged: false as const }
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
  return sendMail({ to: opts.to, subject, html, text })
}

export async function sendBookingClientConfirmEmail(opts: {
  to: string
  locale: 'ru' | 'de'
  clientFirstName: string
  clientLastName: string
  masterName: string
  serviceName: string
  whenLabel: string
  priceLabel?: string | null
  notes?: string | null
}) {
  const { subject, html, text } = buildBookingClientConfirmEmail({
    ...opts,
    siteUrl: config.frontendUrl,
    address: config.salon.addressShort,
  })
  return sendMail({ to: opts.to, subject, html, text })
}

export async function sendBookingMasterNotifyEmail(opts: {
  to: string
  masterLocale: 'ru' | 'de'
  clientFirstName: string
  clientLastName: string
  clientPhone?: string | null
  clientEmail?: string | null
  masterName: string
  serviceName: string
  whenLabel: string
  notes?: string | null
}) {
  const { subject, html, text } = buildBookingMasterNotifyEmail({
    locale: opts.masterLocale,
    masterLocale: opts.masterLocale,
    siteUrl: config.frontendUrl,
    staffPath: config.staffPortalPath,
    clientFirstName: opts.clientFirstName,
    clientLastName: opts.clientLastName,
    clientPhone: opts.clientPhone,
    clientEmail: opts.clientEmail,
    masterName: opts.masterName,
    serviceName: opts.serviceName,
    whenLabel: opts.whenLabel,
    address: config.salon.addressShort,
    notes: opts.notes,
  })
  return sendMail({ to: opts.to, subject, html, text })
}
