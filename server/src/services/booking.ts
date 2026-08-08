import { BookingStatus } from '@prisma/client'
import { prisma } from '../db.js'
import {
  salonDateStr,
  salonDateTime,
  salonDayBounds,
  salonDayOfWeek,
} from '../lib/salonTime.js'

/** Start times every 30 minutes; a longer service blocks consecutive slots via duration overlap */
const SLOT_STEP_MIN = 30
const DAY_START = 8 * 60 // 08:00
const DAY_END = 20 * 60 // 20:00 — last 30‑min start at 19:30

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export async function getAvailableSlots(masterId: string, dateStr: string, durationMin: number) {
  const dayOfWeek = salonDayOfWeek(dateStr)

  const hours = await prisma.workingHours.findUnique({
    where: { masterId_dayOfWeek: { masterId, dayOfWeek } },
  })
  if (!hours) return { slots: [] as string[], dayOff: true }

  const { start: dayStart, end: dayEnd } = salonDayBounds(dateStr)
  const now = new Date()

  const [bookings, timeOffs] = await Promise.all([
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
  ])

  const workStart = Math.max(DAY_START, toMinutes(hours.startTime))
  const workEnd = Math.min(DAY_END, toMinutes(hours.endTime))
  const slots: string[] = []

  for (let t = workStart; t + durationMin <= workEnd; t += SLOT_STEP_MIN) {
    const label = fromMinutes(t)
    const slotStart = salonDateTime(dateStr, label)
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000)
    if (slotStart <= now) continue

    const busy =
      bookings.some((b) => b.startsAt < slotEnd && b.endsAt > slotStart) ||
      timeOffs.some((o) => o.startsAt < slotEnd && o.endsAt > slotStart)

    if (!busy) slots.push(label)
  }

  return { slots, dayOff: false }
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

  const workStart = salonDateTime(dateStr, fromMinutes(toMinutes(hours.startTime)))
  const workEnd = salonDateTime(dateStr, fromMinutes(toMinutes(hours.endTime)))
  if (startsAt < workStart || endsAt > workEnd) {
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
}

export async function getAdminStats() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

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
