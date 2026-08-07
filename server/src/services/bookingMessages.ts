import { config } from '../config.js'

export type BookingLocale = 'ru' | 'de'

export type BookingMessageContext = {
  locale: BookingLocale
  clientFirstName: string
  clientLastName: string
  clientPhone?: string | null
  clientEmail?: string | null
  masterFirstName: string
  masterLastName: string
  serviceNameRu: string
  serviceNameDe: string
  startsAt: Date
  price?: number | null
  notes?: string | null
}

const TZ = 'Europe/Berlin'

export function serviceName(ctx: BookingMessageContext, locale: BookingLocale) {
  return locale === 'de' ? ctx.serviceNameDe : ctx.serviceNameRu
}

export function formatWhen(startsAt: Date, locale: BookingLocale) {
  const date = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(startsAt)

  const time = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'ru-RU', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(startsAt)

  return { date, time, short: `${date}, ${time}` }
}

export function masterFullName(ctx: BookingMessageContext) {
  return `${ctx.masterFirstName} ${ctx.masterLastName}`.trim()
}

export function clientFullName(ctx: BookingMessageContext) {
  return `${ctx.clientFirstName} ${ctx.clientLastName}`.trim()
}

export function buildClientConfirmSms(ctx: BookingMessageContext) {
  const locale = ctx.locale
  const { date, time } = formatWhen(ctx.startsAt, locale)
  const svc = serviceName(ctx, locale)
  const master = masterFullName(ctx)
  const addr = config.salon.addressShort

  if (locale === 'de') {
    return `AN.Beauty: Termin bestätigt. ${svc}, ${date} um ${time}, Meister/in ${master}. Adresse: ${addr}`
  }
  return `AN.Beauty: запись подтверждена. ${svc}, ${date} в ${time}, мастер ${master}. Адрес: ${addr}`
}

export function buildClientReminderSms(ctx: BookingMessageContext) {
  const locale = ctx.locale
  const { time } = formatWhen(ctx.startsAt, locale)
  const svc = serviceName(ctx, locale)
  const addr = config.salon.addressShort

  if (locale === 'de') {
    return `AN.Beauty: Erinnerung — morgen haben Sie einen Termin: ${svc} um ${time}. Adresse: ${addr}. Bitte nicht vergessen — wir freuen uns auf Sie!`
  }
  return `AN.Beauty: напоминание — завтра у вас термин: ${svc} в ${time}. Адрес: ${addr}. Пожалуйста, не забудьте — ждём вас!`
}

export function clientNotifyCopy(ctx: BookingMessageContext) {
  const locale = ctx.locale
  const { short } = formatWhen(ctx.startsAt, locale)
  const svc = serviceName(ctx, locale)
  if (locale === 'de') {
    return {
      title: 'Termin bestätigt',
      body: `${svc} — ${short}`,
    }
  }
  return {
    title: 'Запись подтверждена',
    body: `${svc} — ${short}`,
  }
}

export function masterNotifyCopy(ctx: BookingMessageContext, masterLocale: BookingLocale) {
  const { short } = formatWhen(ctx.startsAt, masterLocale)
  const svc = serviceName(ctx, masterLocale)
  const client = clientFullName(ctx)
  if (masterLocale === 'de') {
    return {
      title: 'Neuer Termin',
      body: `${client}: ${svc} — ${short}`,
    }
  }
  return {
    title: 'Новая запись',
    body: `${client}: ${svc} — ${short}`,
  }
}
