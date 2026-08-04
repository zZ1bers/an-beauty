import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { BookingStatus, Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { getAvailableSlots, resolveBookableSlot } from '../services/booking.js'
import { resolvePromoPrice } from '../services/promo.js'

function mapService(s: {
  id: string
  slug: string
  categoryId: string
  nameRu: string
  nameDe: string
  descriptionRu: string
  descriptionDe: string
  price: { toString(): string } | number
  durationMin: number
  imageUrl: string
  featured: boolean
}) {
  return {
    id: s.id,
    slug: s.slug,
    categoryId: s.categoryId,
    name: { ru: s.nameRu, de: s.nameDe },
    description: { ru: s.descriptionRu, de: s.descriptionDe },
    price: Number(s.price),
    duration: s.durationMin,
    image: s.imageUrl,
    featured: s.featured,
  }
}

function mapMaster(m: {
  id: string
  roleRu: string
  roleDe: string
  bioRu: string
  bioDe: string
  imageUrl: string
  rating: { toString(): string } | number
  user: { firstName: string; lastName: string }
  services: { serviceId: string }[]
}) {
  return {
    id: m.id,
    name: `${m.user.firstName} ${m.user.lastName}`.trim(),
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    role: { ru: m.roleRu, de: m.roleDe },
    bio: { ru: m.bioRu, de: m.bioDe },
    image: m.imageUrl,
    rating: Number(m.rating),
    specialties: m.services.map((s) => s.serviceId),
  }
}

export async function publicRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }))

  app.get('/categories', async () => {
    const rows = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      icon: c.icon,
      name: { ru: c.nameRu, de: c.nameDe },
    }))
  })

  app.get('/services', async (request) => {
    const q = z
      .object({ featured: z.enum(['true', 'false']).optional() })
      .safeParse(request.query)
    const featured = q.success && q.data.featured === 'true' ? true : undefined

    const rows = await prisma.service.findMany({
      where: {
        isActive: true,
        category: { isActive: true },
        ...(featured ? { featured: true } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    })
    return rows.map(mapService)
  })

  app.get('/masters', async (request) => {
    const q = z
      .object({
        home: z
          .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
          .optional(),
      })
      .safeParse(request.query)
    const homeOnly =
      q.success && (q.data.home === '1' || q.data.home === 'true')

    const rows = await prisma.masterProfile.findMany({
      where: {
        isActive: true,
        ...(homeOnly ? { showOnHome: true } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
        services: true,
      },
    })
    return rows.map(mapMaster)
  })

  app.get('/masters/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const m = await prisma.masterProfile.findFirst({
      where: { id, isActive: true },
      include: {
        user: { select: { firstName: true, lastName: true } },
        services: true,
        workingHours: { select: { dayOfWeek: true } },
      },
    })
    if (!m) return reply.status(404).send({ error: 'Not found' })
    return {
      ...mapMaster(m),
      workingDays: m.workingHours.map((h) => h.dayOfWeek),
    }
  })

  app.get('/masters/:id/hours', async (request, reply) => {
    const { id } = request.params as { id: string }
    const master = await prisma.masterProfile.findFirst({
      where: { id, isActive: true },
      select: { id: true },
    })
    if (!master) return reply.status(404).send({ error: 'Not found' })
    const hours = await prisma.workingHours.findMany({
      where: { masterId: id },
      select: { dayOfWeek: true, startTime: true, endTime: true },
      orderBy: { dayOfWeek: 'asc' },
    })
    return {
      workingDays: hours.map((h) => h.dayOfWeek),
      hours,
    }
  })

  app.get('/masters/:id/slots', async (request, reply) => {
    const { id } = request.params as { id: string }
    const q = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        serviceId: z.string().optional(),
        duration: z.coerce.number().optional(),
      })
      .safeParse(request.query)
    if (!q.success) return reply.status(400).send({ error: 'date=YYYY-MM-DD required' })

    let duration = q.data.duration ?? 60
    if (q.data.serviceId) {
      const service = await prisma.service.findUnique({ where: { id: q.data.serviceId } })
      if (!service) return reply.status(404).send({ error: 'Service not found' })
      duration = service.durationMin
    }

    const { slots, dayOff } = await getAvailableSlots(id, q.data.date, duration)
    return { date: q.data.date, slots, dayOff }
  })

  app.get('/promos/active', async () => {
    const now = new Date()
    const rows = await prisma.promo.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { services: true },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((p) => ({
      id: p.id,
      headline: { ru: p.headlineRu, de: p.headlineDe },
      body: { ru: p.bodyRu, de: p.bodyDe },
      discountPct: p.discountPct,
      serviceIds: p.services.map((s) => s.serviceId),
    }))
  })

  app.post('/bookings/guest', async (request, reply) => {
    const body = z
      .object({
        serviceId: z.string().min(1),
        masterId: z.string().min(1),
        startsAt: z.string().min(10),
        notes: z.string().max(1000).optional(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(5),
        locale: z.enum(['ru', 'de']).optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const email = body.data.email.toLowerCase()
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return reply.status(409).send({ error: 'EMAIL_EXISTS' })
    }

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
      if (msg === 'SERVICE_NOT_FOUND') return reply.status(404).send({ error: msg })
      if (msg === 'MASTER_SERVICE_MISMATCH' || msg === 'INVALID_STARTS_AT') {
        return reply.status(400).send({ error: msg })
      }
      return reply.status(409).send({ error: msg })
    }

    const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.CLIENT,
        firstName: body.data.firstName.trim(),
        lastName: body.data.lastName.trim(),
        phone: body.data.phone.trim(),
        locale: body.data.locale ?? 'ru',
        clientProfile: { create: {} },
      },
      include: { clientProfile: true, masterProfile: true },
    })

    const profile = user.clientProfile
    if (!profile) return reply.status(500).send({ error: 'Profile missing' })

    const priced = await resolvePromoPrice(service.id, service.price)

    const booking = await prisma.booking.create({
      data: {
        clientId: profile.id,
        masterId: body.data.masterId,
        serviceId: service.id,
        startsAt,
        endsAt,
        status: BookingStatus.CONFIRMED,
        priceSnapshot: priced.price,
        notes: body.data.notes?.trim() || null,
        createdBy: user.id,
      },
      include: {
        service: true,
        master: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    })

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'BOOKING',
        title: 'Запись подтверждена',
        body: `${service.nameRu} — ${startsAt.toISOString().slice(0, 16).replace('T', ' ')}`,
      },
    })

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        locale: user.locale,
        clientProfileId: user.clientProfile?.id ?? null,
        masterProfileId: user.masterProfile?.id ?? null,
      },
      booking: {
        id: booking.id,
        startsAt: booking.startsAt.toISOString(),
        date: booking.startsAt.toISOString().slice(0, 10),
        time: booking.startsAt.toISOString().slice(11, 16),
        status: booking.status.toLowerCase(),
        service: {
          id: booking.service.id,
          name: { ru: booking.service.nameRu, de: booking.service.nameDe },
          image: booking.service.imageUrl,
        },
        master: {
          id: booking.master.id,
          name: `${booking.master.user.firstName} ${booking.master.user.lastName}`,
        },
      },
    })
  })
}
