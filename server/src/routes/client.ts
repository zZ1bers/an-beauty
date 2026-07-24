import type { FastifyInstance } from 'fastify'
import { BookingStatus, Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireRole } from '../plugins/auth.js'
import { resolveBookableSlot } from '../services/booking.js'

function mapBooking(b: {
  id: string
  startsAt: Date
  endsAt: Date
  status: BookingStatus
  notes: string | null
  priceSnapshot: { toString(): string } | number
  service: {
    id: string
    nameRu: string
    nameDe: string
    imageUrl: string
    durationMin: number
  }
  master: {
    id: string
    user: { firstName: string; lastName: string }
  }
}) {
  return {
    id: b.id,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    date: b.startsAt.toISOString().slice(0, 10),
    time: b.startsAt.toISOString().slice(11, 16),
    status: b.status.toLowerCase(),
    notes: b.notes,
    price: Number(b.priceSnapshot),
    service: {
      id: b.service.id,
      name: { ru: b.service.nameRu, de: b.service.nameDe },
      image: b.service.imageUrl,
      duration: b.service.durationMin,
    },
    master: {
      id: b.master.id,
      name: `${b.master.user.firstName} ${b.master.user.lastName}`,
    },
  }
}

export async function clientRoutes(app: FastifyInstance) {
  const clientOnly = { preHandler: requireRole(Role.CLIENT) }

  app.get('/me', clientOnly, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { clientProfile: true },
    })
    if (!user?.clientProfile) return reply.status(404).send({ error: 'Profile not found' })
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      locale: user.locale,
      profile: {
        id: user.clientProfile.id,
        allergies: user.clientProfile.allergies,
        preferences: user.clientProfile.preferences,
        totalVisits: user.clientProfile.totalVisits,
        totalSpent: Number(user.clientProfile.totalSpent),
      },
    }
  })

  app.patch('/me', clientOnly, async (request, reply) => {
    const body = z
      .object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional(),
        locale: z.enum(['ru', 'de']).optional(),
        allergies: z.string().optional(),
        preferences: z.string().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const user = await prisma.user.update({
      where: { id: request.user.id },
      data: {
        firstName: body.data.firstName,
        lastName: body.data.lastName,
        phone: body.data.phone,
        locale: body.data.locale,
        clientProfile: {
          update: {
            allergies: body.data.allergies,
            preferences: body.data.preferences,
          },
        },
      },
      include: { clientProfile: true },
    })
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      locale: user.locale,
    }
  })

  app.get('/me/bookings', clientOnly, async (request, reply) => {
    const profile = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
    if (!profile) return reply.status(404).send({ error: 'Profile not found' })

    const rows = await prisma.booking.findMany({
      where: { clientId: profile.id },
      orderBy: { startsAt: 'desc' },
      include: {
        service: true,
        master: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    })
    return rows.map(mapBooking)
  })

  app.post('/bookings', clientOnly, async (request, reply) => {
    const body = z
      .object({
        serviceId: z.string(),
        masterId: z.string(),
        startsAt: z.string().min(10),
        notes: z.string().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const profile = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
    if (!profile) return reply.status(404).send({ error: 'Profile not found' })

    const startsAt = new Date(body.data.startsAt)
    let service
    let endsAt: Date
    try {
      ;({ service, endsAt } = await resolveBookableSlot({
        serviceId: body.data.serviceId,
        masterId: body.data.masterId,
        startsAt,
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'SLOT_TAKEN'
      if (msg === 'SERVICE_NOT_FOUND') return reply.status(404).send({ error: 'Service not found' })
      if (msg === 'MASTER_SERVICE_MISMATCH') {
        return reply.status(400).send({ error: 'Master does not offer this service' })
      }
      if (msg === 'INVALID_STARTS_AT') return reply.status(400).send({ error: 'Invalid startsAt' })
      return reply.status(409).send({ error: msg })
    }

    const booking = await prisma.booking.create({
      data: {
        clientId: profile.id,
        masterId: body.data.masterId,
        serviceId: service.id,
        startsAt,
        endsAt,
        status: BookingStatus.CONFIRMED,
        priceSnapshot: service.price,
        notes: body.data.notes,
        createdBy: request.user.id,
      },
      include: {
        service: true,
        master: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    })

    await prisma.notification.create({
      data: {
        userId: request.user.id,
        type: 'BOOKING',
        title: 'Запись подтверждена',
        body: `${service.nameRu} — ${startsAt.toISOString().slice(0, 16).replace('T', ' ')}`,
      },
    })

    return reply.status(201).send(mapBooking(booking))
  })

  app.post('/bookings/:id/cancel', clientOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const profile = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
    if (!profile) return reply.status(404).send({ error: 'Profile not found' })

    const booking = await prisma.booking.findFirst({
      where: { id, clientId: profile.id },
    })
    if (!booking) return reply.status(404).send({ error: 'Not found' })
    if (booking.status === BookingStatus.CANCELLED) {
      return reply.status(400).send({ error: 'Already cancelled' })
    }
    if (booking.status === BookingStatus.COMPLETED) {
      return reply.status(400).send({ error: 'Cannot cancel completed booking' })
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
      include: {
        service: true,
        master: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    })
    return mapBooking(updated)
  })

  app.patch('/bookings/:id/notes', clientOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ notes: z.string().max(1000) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const profile = await prisma.clientProfile.findUnique({ where: { userId: request.user.id } })
    if (!profile) return reply.status(404).send({ error: 'Profile not found' })

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        clientId: profile.id,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    })
    if (!booking) return reply.status(404).send({ error: 'Not found' })

    const updated = await prisma.booking.update({
      where: { id },
      data: { notes: body.data.notes.trim() || null },
      include: {
        service: true,
        master: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    })
    return mapBooking(updated)
  })

  app.get('/me/notifications', clientOnly, async (request) => {
    const rows = await prisma.notification.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }))
  })

  app.post('/me/notifications/:id/read', clientOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const n = await prisma.notification.findFirst({
      where: { id, userId: request.user.id },
    })
    if (!n) return reply.status(404).send({ error: 'Not found' })
    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })
    return updated
  })
}
