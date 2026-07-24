import type { FastifyInstance } from 'fastify'
import { BookingStatus, Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireRole } from '../plugins/auth.js'
import { getMasterLoad } from '../services/booking.js'

async function getMasterProfileId(userId: string) {
  const m = await prisma.masterProfile.findUnique({ where: { userId } })
  return m?.id ?? null
}

export async function masterRoutes(app: FastifyInstance) {
  const masterOnly = { preHandler: requireRole(Role.MASTER) }

  app.get('/master/me', masterOnly, async (request, reply) => {
    const m = await prisma.masterProfile.findUnique({
      where: { userId: request.user.id },
      include: {
        user: true,
        services: true,
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    })
    if (!m) return reply.status(404).send({ error: 'Master profile not found' })
    return {
      id: m.id,
      name: `${m.user.firstName} ${m.user.lastName}`,
      role: { ru: m.roleRu, de: m.roleDe },
      bio: { ru: m.bioRu, de: m.bioDe },
      image: m.imageUrl,
      rating: Number(m.rating),
      specialties: m.services.map((s) => s.serviceId),
      workingHours: m.workingHours,
    }
  })

  app.get('/master/bookings', masterOnly, async (request, reply) => {
    const masterId = await getMasterProfileId(request.user.id)
    if (!masterId) return reply.status(404).send({ error: 'Master profile not found' })

    const q = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .safeParse(request.query)

    const where: {
      masterId: string
      startsAt?: { gte?: Date; lte?: Date }
    } = { masterId }

    if (q.success && q.data.date) {
      where.startsAt = {
        gte: new Date(`${q.data.date}T00:00:00`),
        lte: new Date(`${q.data.date}T23:59:59.999`),
      }
    } else if (q.success && (q.data.from || q.data.to)) {
      where.startsAt = {
        gte: q.data.from ? new Date(q.data.from) : undefined,
        lte: q.data.to ? new Date(q.data.to) : undefined,
      }
    }

    const rows = await prisma.booking.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        service: true,
        client: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
    })

    return rows.map((b) => ({
      id: b.id,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      status: b.status.toLowerCase(),
      notes: b.notes,
      price: Number(b.priceSnapshot),
      service: {
        id: b.service.id,
        name: { ru: b.service.nameRu, de: b.service.nameDe },
      },
      client: {
        id: b.client.id,
        name: `${b.client.user.firstName} ${b.client.user.lastName}`,
        phone: b.client.user.phone,
        allergies: b.client.allergies,
      },
    }))
  })

  app.patch('/master/bookings/:id', masterOnly, async (request, reply) => {
    const masterId = await getMasterProfileId(request.user.id)
    if (!masterId) return reply.status(404).send({ error: 'Master profile not found' })

    const { id } = request.params as { id: string }
    const body = z
      .object({
        status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
        notes: z.string().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const booking = await prisma.booking.findFirst({ where: { id, masterId } })
    if (!booking) return reply.status(404).send({ error: 'Not found' })

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: body.data.status as BookingStatus | undefined,
        notes: body.data.notes,
        cancelledAt: body.data.status === 'CANCELLED' ? new Date() : undefined,
      },
    })

    if (body.data.status === 'COMPLETED') {
      await prisma.clientProfile.update({
        where: { id: booking.clientId },
        data: {
          totalVisits: { increment: 1 },
          totalSpent: { increment: booking.priceSnapshot },
        },
      })
    }

    return updated
  })

  app.get('/master/load', masterOnly, async (request, reply) => {
    const masterId = await getMasterProfileId(request.user.id)
    if (!masterId) return reply.status(404).send({ error: 'Master profile not found' })
    const q = z
      .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .safeParse(request.query)
    if (!q.success) return reply.status(400).send({ error: 'date required' })
    const load = await getMasterLoad(masterId, q.data.date)
    return { date: q.data.date, load }
  })

  app.get('/master/schedule', masterOnly, async (request, reply) => {
    const masterId = await getMasterProfileId(request.user.id)
    if (!masterId) return reply.status(404).send({ error: 'Master profile not found' })

    const q = z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .safeParse(request.query)

    const from = q.success && q.data.from ? new Date(q.data.from) : new Date()
    from.setHours(0, 0, 0, 0)
    const to =
      q.success && q.data.to
        ? new Date(q.data.to)
        : new Date(from.getTime() + 62 * 24 * 60 * 60 * 1000)

    const [workingHours, timeOffs] = await Promise.all([
      prisma.workingHours.findMany({ where: { masterId }, orderBy: { dayOfWeek: 'asc' } }),
      prisma.timeOff.findMany({
        where: {
          masterId,
          startsAt: { lte: to },
          endsAt: { gte: from },
        },
        orderBy: { startsAt: 'asc' },
      }),
    ])
    return { workingHours, timeOffs }
  })

  app.put('/master/schedule', masterOnly, async (request, reply) => {
    const masterId = await getMasterProfileId(request.user.id)
    if (!masterId) return reply.status(404).send({ error: 'Master profile not found' })

    const body = z
      .object({
        workingHours: z.array(
          z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: z.string(),
            endTime: z.string(),
          }),
        ),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    await prisma.$transaction([
      prisma.workingHours.deleteMany({ where: { masterId } }),
      prisma.workingHours.createMany({
        data: body.data.workingHours.map((h) => ({ ...h, masterId })),
      }),
    ])

    const workingHours = await prisma.workingHours.findMany({
      where: { masterId },
      orderBy: { dayOfWeek: 'asc' },
    })
    return { workingHours }
  })

  app.post('/master/time-off', masterOnly, async (request, reply) => {
    const masterId = await getMasterProfileId(request.user.id)
    if (!masterId) return reply.status(404).send({ error: 'Master profile not found' })

    const body = z
      .object({
        startsAt: z.string(),
        endsAt: z.string(),
        reason: z.string().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const startsAt = new Date(body.data.startsAt)
    const endsAt = new Date(body.data.endsAt)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return reply.status(400).send({ error: 'Invalid time range' })
    }

    // Avoid duplicate overlapping blocks for same master
    const existing = await prisma.timeOff.findFirst({
      where: {
        masterId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    })
    if (existing) {
      return reply.status(200).send(existing)
    }

    const row = await prisma.timeOff.create({
      data: {
        masterId,
        startsAt,
        endsAt,
        reason: body.data.reason,
      },
    })
    return reply.status(201).send(row)
  })

  // Explicit delete via POST — more reliable through some proxies than DELETE
  app.post('/master/time-off/:id/remove', masterOnly, async (request, reply) => {
    const masterId = await getMasterProfileId(request.user.id)
    if (!masterId) return reply.status(404).send({ error: 'Master profile not found' })
    const { id } = request.params as { id: string }
    const row = await prisma.timeOff.findFirst({ where: { id, masterId } })
    if (!row) return reply.status(404).send({ error: 'Not found' })
    await prisma.timeOff.delete({ where: { id } })
    return { ok: true }
  })

  app.delete('/master/time-off/:id', masterOnly, async (request, reply) => {
    const masterId = await getMasterProfileId(request.user.id)
    if (!masterId) return reply.status(404).send({ error: 'Master profile not found' })
    const { id } = request.params as { id: string }
    const row = await prisma.timeOff.findFirst({ where: { id, masterId } })
    if (!row) return reply.status(404).send({ error: 'Not found' })
    await prisma.timeOff.delete({ where: { id } })
    return { ok: true }
  })

  app.post('/clients/:id/notes', masterOnly, async (request, reply) => {
    const masterId = await getMasterProfileId(request.user.id)
    if (!masterId) return reply.status(404).send({ error: 'Master profile not found' })

    const { id: clientId } = request.params as { id: string }
    const body = z.object({ body: z.string().min(1) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const hadBooking = await prisma.booking.findFirst({
      where: { clientId, masterId },
    })
    if (!hadBooking) return reply.status(403).send({ error: 'No access to this client' })

    const note = await prisma.clientNote.create({
      data: {
        clientId,
        authorId: request.user.id,
        masterId,
        body: body.data.body,
      },
    })
    return reply.status(201).send(note)
  })
}
