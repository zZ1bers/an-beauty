import { prisma } from '../db.js'
import {
  buildClientConfirmSms,
  clientNotifyCopy,
  formatWhen,
  masterNotifyCopy,
  serviceName,
  type BookingLocale,
  type BookingMessageContext,
} from './bookingMessages.js'
import { sendBookingClientConfirmEmail, sendBookingMasterNotifyEmail } from './mail.js'
import { sendSms } from './sms.js'

async function safe(label: string, fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (e) {
    console.error(`[bookingNotify] ${label}:`, e)
  }
}

export async function notifyBookingCreated(opts: {
  bookingId: string
  locale: BookingLocale
  clientUserId: string | null
  clientEmail: string | null
  clientPhone: string | null
  clientFirstName: string
  clientLastName: string
  masterUserId: string
  masterEmail: string
  masterLocale: BookingLocale
  masterFirstName: string
  masterLastName: string
  serviceNameRu: string
  serviceNameDe: string
  startsAt: Date
  price: number
  notes?: string | null
}) {
  const ctx: BookingMessageContext = {
    locale: opts.locale,
    clientFirstName: opts.clientFirstName,
    clientLastName: opts.clientLastName,
    clientPhone: opts.clientPhone,
    clientEmail: opts.clientEmail,
    masterFirstName: opts.masterFirstName,
    masterLastName: opts.masterLastName,
    serviceNameRu: opts.serviceNameRu,
    serviceNameDe: opts.serviceNameDe,
    startsAt: opts.startsAt,
    price: opts.price,
    notes: opts.notes,
  }

  const clientCopy = clientNotifyCopy(ctx)
  const masterCopy = masterNotifyCopy(ctx, opts.masterLocale)
  const whenClient = formatWhen(opts.startsAt, opts.locale).short
  const whenMaster = formatWhen(opts.startsAt, opts.masterLocale).short
  const masterName = `${opts.masterFirstName} ${opts.masterLastName}`.trim()
  const priceLabel =
    opts.locale === 'de' ? `${opts.price.toFixed(2)} €` : `${opts.price.toFixed(2)} €`

  if (opts.clientUserId) {
    await safe('client in-app', () =>
      prisma.notification.create({
        data: {
          userId: opts.clientUserId!,
          type: 'BOOKING',
          title: clientCopy.title,
          body: clientCopy.body,
        },
      }),
    )
  }

  await safe('master in-app', () =>
    prisma.notification.create({
      data: {
        userId: opts.masterUserId,
        type: 'BOOKING',
        title: masterCopy.title,
        body: masterCopy.body,
      },
    }),
  )

  if (opts.clientEmail) {
    await safe('client email', () =>
      sendBookingClientConfirmEmail({
        to: opts.clientEmail!,
        locale: opts.locale,
        clientFirstName: opts.clientFirstName,
        clientLastName: opts.clientLastName,
        masterName,
        serviceName: serviceName(ctx, opts.locale),
        whenLabel: whenClient,
        priceLabel,
        notes: opts.notes,
      }),
    )
  }

  await safe('master email', () =>
    sendBookingMasterNotifyEmail({
      to: opts.masterEmail,
      masterLocale: opts.masterLocale,
      clientFirstName: opts.clientFirstName,
      clientLastName: opts.clientLastName,
      clientPhone: opts.clientPhone,
      clientEmail: opts.clientEmail,
      masterName,
      serviceName: serviceName(ctx, opts.masterLocale),
      whenLabel: whenMaster,
      notes: opts.notes,
    }),
  )

  if (opts.clientPhone) {
    await safe('client sms confirm', () =>
      sendSms({
        to: opts.clientPhone!,
        body: buildClientConfirmSms(ctx),
      }),
    )
  }
}
