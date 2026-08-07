import { BookingStatus } from '@prisma/client'
import { prisma } from '../db.js'
import {
  buildClientReminderSms,
  type BookingLocale,
  type BookingMessageContext,
} from './bookingMessages.js'
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
    if (!phone) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { reminderSmsSentAt: new Date() },
      })
      continue
    }

    const locale = (b.client?.user.locale ?? 'ru') as BookingLocale
    const ctx: BookingMessageContext = {
      locale,
      clientFirstName: b.client?.user.firstName ?? b.guestFirstName ?? '',
      clientLastName: b.client?.user.lastName ?? b.guestLastName ?? '',
      clientPhone: phone,
      masterFirstName: b.master.user.firstName,
      masterLastName: b.master.user.lastName,
      serviceNameRu: b.service.nameRu,
      serviceNameDe: b.service.nameDe,
      startsAt: b.startsAt,
    }

    try {
      const result = await sendSms({ to: phone, body: buildClientReminderSms(ctx) })
      // Mark done on success, missing config, or bad number — retry only on provider failures
      const done =
        result.ok ||
        ('reason' in result &&
          (result.reason === 'SMS_NOT_CONFIGURED' || result.reason === 'INVALID_PHONE'))
      if (done) {
        await prisma.booking.update({
          where: { id: b.id },
          data: { reminderSmsSentAt: new Date() },
        })
      }
    } catch (e) {
      console.error(`[reminders] booking ${b.id}:`, e)
    }
  }
}

export function startReminderScheduler() {
  const tick = () => {
    void sendDueBookingReminders().catch((e) => console.error('[reminders] tick:', e))
  }
  // First run shortly after boot, then every 15 minutes
  setTimeout(tick, 20_000)
  setInterval(tick, INTERVAL_MS)
  console.log('[reminders] day-before SMS scheduler started (every 15 min)')
}
