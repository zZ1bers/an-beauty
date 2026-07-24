import { BookingStatus } from '@prisma/client'
import { prisma } from '../db.js'

const SLOT_STEP_MIN = 45
const DAY_START = 9 * 60
const DAY_END = 18 * 60

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function dayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00`)
  const end = new Date(`${dateStr}T23:59:59.999`)
  return { start, end }
}

export async function getAvailableSlots(masterId: string, dateStr: string, durationMin: number) {
  const day = new Date(`${dateStr}T12:00:00`)
  const dayOfWeek = day.getDay()

  const hours = await prisma.workingHours.findUnique({
    where: { masterId_dayOfWeek: { masterId, dayOfWeek } },
  })
  if (!hours) return []

  const { start: dayStart, end: dayEnd } = dayBounds(dateStr)

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
    const slotStart = new Date(`${dateStr}T${fromMinutes(t)}:00`)
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000)

    const busy =
      bookings.some((b) => b.startsAt < slotEnd && b.endsAt > slotStart) ||
      timeOffs.some((o) => o.startsAt < slotEnd && o.endsAt > slotStart)

    if (!busy) slots.push(fromMinutes(t))
  }

  return slots
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
  await assertSlotFree(input.masterId, input.startsAt, endsAt)
  return { service, endsAt }
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
  const { start, end } = dayBounds(dateStr)
  const day = new Date(`${dateStr}T12:00:00`)
  const hours = await prisma.workingHours.findUnique({
    where: { masterId_dayOfWeek: { masterId, dayOfWeek: day.getDay() } },
  })
  if (!hours) return 0

  const workMinutes = toMinutes(hours.endTime) - toMinutes(hours.startTime)
  if (workMinutes <= 0) return 0

  const bookings = await prisma.booking.findMany({
    where: {
      masterId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      startsAt: { gte: start, lte: end },
    },
  })

  const busy = bookings.reduce(
    (sum, b) => sum + (b.endsAt.getTime() - b.startsAt.getTime()) / 60_000,
    0,
  )
  return Math.min(100, Math.round((busy / workMinutes) * 100))
}
