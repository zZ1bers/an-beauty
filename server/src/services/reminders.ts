import { BookingStatus } from '@prisma/client'
import { config } from '../config.js'
import { prisma } from '../db.js'
import {
  buildClientReminderSms,
  formatWhen,
  serviceName,
  type BookingLocale,
  type BookingMessageContext,
} from './bookingMessages.js'
import { sendBookingClientReminderEmail } from './mail.js'
import { sendSms } from './sms.js'

const INTERVAL_MS = 15 * 60 * 1000
/** Send reminder roughly 1 day before (22–26h window). */
const WINDOW_FROM_MS = 22 * 60 * 60 * 1000
const WINDOW_TO_MS = 26 * 60 * 60 * 1000

export async function sendDueBookingReminders() {
  const now = Date.now()
  const from = new Date(now + WINDOW_FROM_MS)
  const to = new Date(now + WINDOW_TO_MS)

  const rows = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      reminderSmsSentAt: null,
      startsAt: { gte: from, lte: to },
    },
    include: {
      service: true,
      master: { include: { user: true } },
      client: { include: { user: true } },
    },
    take: 100,
  })

  for (const b of rows) {
    const phone = b.client?.user.phone || b.guestPhone
    const email = b.client?.user.email || null
    const locale = (b.client?.user.locale ?? 'ru') as BookingLocale
    const ctx: BookingMessageContext = {
      locale,
      clientFirstName: b.client?.user.firstName ?? b.guestFirstName ?? '',
      clientLastName: b.client?.user.lastName ?? b.guestLastName ?? '',
      clientPhone: phone,
      clientEmail: email,
      masterFirstName: b.master.user.firstName,
      masterLastName: b.master.user.lastName,
      serviceNameRu: b.service.nameRu,
      serviceNameDe: b.service.nameDe,
      startsAt: b.startsAt,
      price: Number(b.priceSnapshot),
      notes: b.notes,
    }

    const masterName = `${b.master.user.firstName} ${b.master.user.lastName}`.trim()
    const whenLabel = formatWhen(b.startsAt, locale).short
    const priceLabel = `${Number(b.priceSnapshot).toFixed(2)} €`

    let emailOk = !email
    let smsOk = !phone

    if (email) {
      try {
        await sendBookingClientReminderEmail({
          to: email,
          locale,
          clientFirstName: ctx.clientFirstName,
          clientLastName: ctx.clientLastName,
          masterName,
          serviceName: serviceName(ctx, locale),
          whenLabel,
          priceLabel,
          notes: b.notes,
        })
        emailOk = true
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[reminders] email booking ${b.id}:`, e)
        // Don't block forever when SMTP is off
        if (config.isDev || msg.includes('SMTP_NOT_CONFIGURED')) emailOk = true
      }
    }

    if (phone) {
      try {
        const result = await sendSms({ to: phone, body: buildClientReminderSms(ctx) })
        smsOk =
          result.ok ||
          ('reason' in result &&
            (result.reason === 'SMS_NOT_CONFIGURED' || result.reason === 'INVALID_PHONE'))
      } catch (e) {
        console.error(`[reminders] sms booking ${b.id}:`, e)
      }
    }

    // No contact channels → mark done so we don't retry forever
    if (!email && !phone) {
      emailOk = true
      smsOk = true
    }

    if (emailOk && smsOk) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { reminderSmsSentAt: new Date() },
      })
    }
  }
}

export function startReminderScheduler() {
  const tick = () => {
    void sendDueBookingReminders().catch((e) => console.error('[reminders] tick:', e))
  }
  setTimeout(tick, 20_000)
  setInterval(tick, INTERVAL_MS)
  console.log('[reminders] day-before email+SMS scheduler started (every 15 min)')
}
