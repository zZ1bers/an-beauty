import { BookingStatus } from '@prisma/client'
import { prisma } from '../db.js'
import { isDefaultClosedDate, DEFAULT_CLOSED_FROM } from '../lib/availabilityPolicy.js'
import {
  addCalendarDays,
  salonDateStr,
  salonDateTime,
  salonDayBounds,
  salonDayOfWeek,
} from '../lib/salonTime.js'

function salonMonthStart(instant = new Date()) {
  const day = salonDateStr(instant)
  return salonDateTime(`${day.slice(0, 7)}-01`, '00:00')
}

/** Start times every 30 minutes; a longer service blocks consecutive slots via duration overlap */
const SLOT_STEP_MIN = 30
const DAY_START = 10 * 60 // 10:00
const DAY_END = 20 * 60 // 20:00 — last 30‑min start at 19:30

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

function fromMinutes(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Normalize "9:00", "09:00:00" → "09:00" */
export function normalizeHm(raw: string) {
  const [h = '0', m = '0'] = raw.trim().split(':')
  const hh = Math.min(23, Math.max(0, Number(h) || 0))
  const mm = Math.min(59, Math.max(0, Number(m) || 0))
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function isFullyCoveredByOpen(
  opens: { startsAt: Date; endsAt: Date }[],
  slotStart: Date,
  slotEnd: Date,
) {
  return opens.some((o) => o.startsAt <= slotStart && o.endsAt >= slotEnd)
}

export async function getAvailableSlots(masterId: string, dateStr: string, durationMin: number) {
  const dayOfWeek = salonDayOfWeek(dateStr)

  const hours = await prisma.workingHours.findUnique({
    where: { masterId_dayOfWeek: { masterId, dayOfWeek } },
  })
  if (!hours) return { slots: [] as string[], dayOff: true }

  const { start: dayStart, end: dayEnd } = salonDayBounds(dateStr)
  const now = new Date()
  const closedByDefault = isDefaultClosedDate(dateStr)

  const [bookings, timeOffs, opens] = await Promise.all([
    prisma.booking.findMany({
      where: {
        masterId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
    }),
    prisma.timeOff.findMany({
      where: {
        masterId,
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
    }),
    closedByDefault
      ? prisma.masterOpen.findMany({
          where: {
            masterId,
            startsAt: { lt: dayEnd },
            endsAt: { gt: dayStart },
          },
        })
      : Promise.resolve([] as { startsAt: Date; endsAt: Date }[]),
  ])

  // From DEFAULT_CLOSED_FROM: no explicit open → whole day closed for clients
  if (closedByDefault && opens.length === 0) {
    return { slots: [] as string[], dayOff: true }
  }

  // Master's own hours, clipped to salon open window 10:00–20:00
  const masterStart = toMinutes(normalizeHm(hours.startTime))
  const masterEnd = toMinutes(normalizeHm(hours.endTime))
  const workStart = Math.max(DAY_START, masterStart)
  const workEnd = Math.min(DAY_END, masterEnd)
  if (workEnd - workStart < durationMin) return { slots: [] as string[], dayOff: false }

  const slots: string[] = []

  for (let t = workStart; t + durationMin <= workEnd; t += SLOT_STEP_MIN) {
    const label = fromMinutes(t)
    const slotStart = salonDateTime(dateStr, label)
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000)
    if (slotStart <= now) continue

    if (closedByDefault && !isFullyCoveredByOpen(opens, slotStart, slotEnd)) continue

    const busy =
      bookings.some((b) => b.startsAt < slotEnd && b.endsAt > slotStart) ||
      timeOffs.some((o) => o.startsAt < slotEnd && o.endsAt > slotStart)

    if (!busy) slots.push(label)
  }

  return { slots, dayOff: false }
}

/**
 * Which days in [from, to] have at least one free slot for this master/duration.
 * Loads bookings + time-offs (+ opens when needed) once for the whole range.
 */
export async function getAvailabilityRange(
  masterId: string,
  fromStr: string,
  toStr: string,
  durationMin: number,
) {
  const hoursRows = await prisma.workingHours.findMany({ where: { masterId } })
  const hoursByDow = new Map(hoursRows.map((h) => [h.dayOfWeek, h]))

  const rangeStart = salonDateTime(fromStr, '00:00')
  const rangeEnd = salonDateTime(addCalendarDays(toStr, 1), '00:00')

  const needsOpens = toStr >= DEFAULT_CLOSED_FROM
  const [bookings, timeOffs, opens] = await Promise.all([
    prisma.booking.findMany({
      where: {
        masterId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
    }),
    prisma.timeOff.findMany({
      where: {
        masterId,
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
    }),
    needsOpens
      ? prisma.masterOpen.findMany({
          where: {
            masterId,
            startsAt: { lt: rangeEnd },
            endsAt: { gt: rangeStart },
          },
        })
      : Promise.resolve([] as { startsAt: Date; endsAt: Date }[]),
  ])

  const now = new Date()
  const unavailable: string[] = []
  let cur = fromStr
  while (cur <= toStr) {
    const dow = salonDayOfWeek(cur)
    const hours = hoursByDow.get(dow)
    const closedByDefault = isDefaultClosedDate(cur)
    if (!hours) {
      unavailable.push(cur)
    } else {
      const masterStart = toMinutes(normalizeHm(hours.startTime))
      const masterEnd = toMinutes(normalizeHm(hours.endTime))
      const workStart = Math.max(DAY_START, masterStart)
      const workEnd = Math.min(DAY_END, masterEnd)
      let hasSlot = false
      if (workEnd - workStart >= durationMin) {
        for (let t = workStart; t + durationMin <= workEnd; t += SLOT_STEP_MIN) {
          const label = fromMinutes(t)
          const slotStart = salonDateTime(cur, label)
          const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000)
          if (slotStart <= now) continue
          if (closedByDefault && !isFullyCoveredByOpen(opens, slotStart, slotEnd)) continue
          const busy =
            bookings.some((b) => b.startsAt < slotEnd && b.endsAt > slotStart) ||
            timeOffs.some((o) => o.startsAt < slotEnd && o.endsAt > slotStart)
          if (!busy) {
            hasSlot = true
            break
          }
        }
      }
      if (!hasSlot) unavailable.push(cur)
    }
    cur = addCalendarDays(cur, 1)
  }

  return { from: fromStr, to: toStr, unavailable }
}

export async function resolveBookableSlot(input: {
  serviceId: string
  masterId: string
  startsAt: Date
}) {
  const [service, masterLink] = await Promise.all([
    prisma.service.findFirst({ where: { id: input.serviceId, isActive: true } }),
    prisma.masterService.findUnique({
      where: {
        masterId_serviceId: {
          masterId: input.masterId,
          serviceId: input.serviceId,
        },
      },
    }),
  ])
  if (!service) {
    const err = new Error('SERVICE_NOT_FOUND')
    throw err
  }
  if (!masterLink) {
    const err = new Error('MASTER_SERVICE_MISMATCH')
    throw err
  }
  if (Number.isNaN(input.startsAt.getTime())) {
    const err = new Error('INVALID_STARTS_AT')
    throw err
  }
  const endsAt = new Date(input.startsAt.getTime() + service.durationMin * 60_000)
  await assertWithinWorkingHours(input.masterId, input.startsAt, endsAt)
  await assertSlotFree(input.masterId, input.startsAt, endsAt)
  return { service, endsAt }
}

export async function assertWithinWorkingHours(masterId: string, startsAt: Date, endsAt: Date) {
  const dateStr = salonDateStr(startsAt)
  const dayOfWeek = salonDayOfWeek(dateStr)
  const hours = await prisma.workingHours.findUnique({
    where: { masterId_dayOfWeek: { masterId, dayOfWeek } },
  })
  if (!hours) {
    throw new Error('DAY_OFF')
  }

  const workStart = salonDateTime(dateStr, normalizeHm(hours.startTime))
  const workEnd = salonDateTime(dateStr, normalizeHm(hours.endTime))
  // Also respect salon hard window 10:00–20:00
  const salonStart = salonDateTime(dateStr, fromMinutes(DAY_START))
  const salonEnd = salonDateTime(dateStr, fromMinutes(DAY_END))
  const windowStart = workStart > salonStart ? workStart : salonStart
  const windowEnd = workEnd < salonEnd ? workEnd : salonEnd
  if (startsAt < windowStart || endsAt > windowEnd) {
    throw new Error('OUTSIDE_HOURS')
  }
}

export async function assertSlotFree(
  masterId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
) {
  const conflict = await prisma.booking.findFirst({
    where: {
      masterId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  })
  if (conflict) {
    const err = new Error('SLOT_TAKEN')
    throw err
  }

  const blocked = await prisma.timeOff.findFirst({
    where: {
      masterId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  })
  if (blocked) {
    throw new Error('SLOT_BLOCKED')
  }

  // From Oct 2026: booking only on explicitly opened windows
  if (isDefaultClosedDate(salonDateStr(startsAt))) {
    const open = await prisma.masterOpen.findFirst({
      where: {
        masterId,
        startsAt: { lte: startsAt },
        endsAt: { gte: endsAt },
      },
    })
    if (!open) {
      throw new Error('SLOT_BLOCKED')
    }
  }
}

export async function getAdminStats() {
  const now = new Date()
  const monthStart = salonMonthStart(now)

  const [clients, masters, services, bookingsMonth, revenueAgg, upcoming] = await Promise.all([
    prisma.clientProfile.count(),
    prisma.masterProfile.count({ where: { isActive: true } }),
    prisma.service.count({ where: { isActive: true } }),
    prisma.booking.count({
      where: {
        createdAt: { gte: monthStart },
        status: { not: BookingStatus.CANCELLED },
      },
    }),
    prisma.booking.aggregate({
      where: {
        status: BookingStatus.COMPLETED,
        startsAt: { gte: monthStart },
      },
      _sum: { priceSnapshot: true },
    }),
    prisma.booking.count({
      where: {
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startsAt: { gte: now },
      },
    }),
  ])

  return {
    clients,
    masters,
    services,
    bookingsThisMonth: bookingsMonth,
    revenueThisMonth: Number(revenueAgg._sum.priceSnapshot ?? 0),
    upcomingBookings: upcoming,
  }
}

export async function getMasterLoad(masterId: string, dateStr: string) {
  const { start, end } = salonDayBounds(dateStr)
  const hours = await prisma.workingHours.findUnique({
    where: { masterId_dayOfWeek: { masterId, dayOfWeek: salonDayOfWeek(dateStr) } },
  })
  if (!hours) return 0

  const workMinutes = toMinutes(hours.endTime) - toMinutes(hours.startTime)
  if (workMinutes <= 0) return 0

  const bookings = await prisma.booking.findMany({
    where: {
      masterId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      startsAt: { gte: start, lt: end },
    },
  })

  const busy = bookings.reduce(
    (sum, b) => sum + (b.endsAt.getTime() - b.startsAt.getTime()) / 60_000,
    0,
  )
  return Math.min(100, Math.round((busy / workMinutes) * 100))
}
