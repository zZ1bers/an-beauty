import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { BookingStatus, Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireRole } from '../plugins/auth.js'
import { getAdminStats, resolveBookableSlot } from '../services/booking.js'
import { buildMonthlyReportPdf } from '../services/monthlyReport.js'
import { resolvePromoPrice } from '../services/promo.js'

export async function adminRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: requireRole(Role.ADMIN) }

  app.get('/admin/stats', adminOnly, async () => getAdminStats())

  /** Monthly PDF for bookkeeping: clients, day-by-day appointments, totals */
  app.get('/admin/reports/month.pdf', adminOnly, async (request, reply) => {
    const q = z
      .object({
        year: z.coerce.number().int().min(2020).max(2100),
        month: z.coerce.number().int().min(1).max(12),
        locale: z.enum(['ru', 'de']).optional(),
      })
      .safeParse(request.query)
    if (!q.success) {
      return reply.status(400).send({ error: 'year and month required' })
    }

    const pdf = await buildMonthlyReportPdf({
      year: q.data.year,
      month: q.data.month,
      locale: q.data.locale,
    })
    const filename = `an-beauty-${q.data.year}-${String(q.data.month).padStart(2, '0')}.pdf`
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdf)
  })

  // ——— Clients (view only — no impersonation) ———
  app.get('/admin/clients', adminOnly, async () => {
    const rows = await prisma.clientProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            locale: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: { select: { bookings: true } },
      },
    })
    return rows.map((c) => ({
      id: c.id,
      userId: c.userId,
      email: c.user.email,
      name: `${c.user.firstName} ${c.user.lastName}`,
      phone: c.user.phone,
      locale: c.user.locale,
      isActive: c.user.isActive,
      allergies: c.allergies,
      preferences: c.preferences,
      crmNotes: c.crmNotes,
      totalVisits: c.totalVisits,
      totalSpent: Number(c.totalSpent),
      bookingsCount: c._count.bookings,
      createdAt: c.user.createdAt,
    }))
  })

  app.get('/admin/clients/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const c = await prisma.clientProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            locale: true,
            isActive: true,
          },
        },
        notes: { orderBy: { createdAt: 'desc' }, take: 20 },
        bookings: {
          orderBy: { startsAt: 'desc' },
          take: 30,
          include: {
            service: true,
            master: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    })
    if (!c) return reply.status(404).send({ error: 'Not found' })
    return {
      id: c.id,
      userId: c.userId,
      email: c.user.email,
      firstName: c.user.firstName,
      lastName: c.user.lastName,
      phone: c.user.phone,
      locale: c.user.locale,
      isActive: c.user.isActive,
      allergies: c.allergies,
      preferences: c.preferences,
      crmNotes: c.crmNotes,
      totalVisits: c.totalVisits,
      totalSpent: Number(c.totalSpent),
      notes: c.notes,
      bookings: c.bookings.map((b) => ({
        id: b.id,
        startsAt: b.startsAt,
        status: b.status,
        price: Number(b.priceSnapshot),
        service: b.service.nameRu,
        master: `${b.master.user.firstName} ${b.master.user.lastName}`,
      })),
    }
  })

  app.patch('/admin/clients/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z
      .object({
        crmNotes: z.string().optional(),
        allergies: z.string().optional(),
        preferences: z.string().optional(),
        isActive: z.boolean().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const c = await prisma.clientProfile.findUnique({ where: { id } })
    if (!c) return reply.status(404).send({ error: 'Not found' })

    const updated = await prisma.clientProfile.update({
      where: { id },
      data: {
        crmNotes: body.data.crmNotes,
        allergies: body.data.allergies,
        preferences: body.data.preferences,
        ...(body.data.isActive !== undefined
          ? { user: { update: { isActive: body.data.isActive } } }
          : {}),
      },
      include: { user: true },
    })
    return updated
  })

  // ——— Categories ———
  app.get('/admin/categories', adminOnly, async () => {
    return prisma.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' } })
  })

  app.post('/admin/categories', adminOnly, async (request, reply) => {
    const body = z
      .object({
        slug: z.string().min(1),
        icon: z.string().optional().default('✨'),
        nameRu: z.string(),
        nameDe: z.string(),
        sortOrder: z.number().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })
    try {
      const row = await prisma.serviceCategory.create({ data: body.data })
      return reply.status(201).send(row)
    } catch (e: unknown) {
      if (typeof e === 'object' && e && 'code' in e && (e as { code: string }).code === 'P2002') {
        return reply.status(409).send({ error: 'Slug already exists' })
      }
      throw e
    }
  })

  app.patch('/admin/categories/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z
      .object({
        icon: z.string().optional(),
        nameRu: z.string().optional(),
        nameDe: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })
    try {
      return await prisma.serviceCategory.update({ where: { id }, data: body.data })
    } catch {
      return reply.status(404).send({ error: 'Not found' })
    }
  })

  app.delete('/admin/categories/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await prisma.serviceCategory.update({ where: { id }, data: { isActive: false } })
      return { ok: true, soft: true }
    } catch {
      return reply.status(404).send({ error: 'Not found' })
    }
  })

  // ——— Services ———
  app.get('/admin/services', adminOnly, async () => {
    const rows = await prisma.service.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { category: true, masters: true },
    })
    return rows.map((s) => ({
      ...s,
      price: Number(s.price),
      name: { ru: s.nameRu, de: s.nameDe },
      description: { ru: s.descriptionRu, de: s.descriptionDe },
      image: s.imageUrl,
      duration: s.durationMin,
      masterIds: s.masters.map((m) => m.masterId),
    }))
  })

  app.post('/admin/services', adminOnly, async (request, reply) => {
    const body = z
      .object({
        categoryId: z.string(),
        slug: z.string().min(1),
        nameRu: z.string().optional().default(''),
        nameDe: z.string().optional().default(''),
        descriptionRu: z.string().optional().default(''),
        descriptionDe: z.string().optional().default(''),
        price: z.number(),
        durationMin: z.number().int().positive(),
        imageUrl: z.string().optional().default(''),
        featured: z.boolean().optional(),
        sortOrder: z.number().optional(),
        masterIds: z.array(z.string()).optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })
    const { masterIds, ...data } = body.data
    try {
      const row = await prisma.service.create({
        data: {
          ...data,
          nameRu: data.nameRu.trim() || data.slug,
          nameDe: data.nameDe.trim() || data.slug,
          masters: masterIds?.length
            ? { create: masterIds.map((masterId) => ({ masterId })) }
            : undefined,
        },
        include: { masters: true },
      })
      return reply.status(201).send({
        ...row,
        price: Number(row.price),
        masterIds: row.masters.map((m) => m.masterId),
      })
    } catch (e: unknown) {
      if (typeof e === 'object' && e && 'code' in e && (e as { code: string }).code === 'P2002') {
        return reply.status(409).send({ error: 'Slug already exists' })
      }
      throw e
    }
  })

  app.patch('/admin/services/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z
      .object({
        categoryId: z.string().optional(),
        nameRu: z.string().optional(),
        nameDe: z.string().optional(),
        descriptionRu: z.string().optional(),
        descriptionDe: z.string().optional(),
        price: z.number().optional(),
        durationMin: z.number().int().positive().optional(),
        imageUrl: z.string().optional(),
        featured: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
        masterIds: z.array(z.string()).optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const { masterIds, ...data } = body.data
    try {
      if (masterIds) {
        await prisma.$transaction(async (tx) => {
          await tx.masterService.deleteMany({ where: { serviceId: id } })
          if (masterIds.length) {
            await tx.masterService.createMany({
              data: masterIds.map((masterId) => ({ masterId, serviceId: id })),
            })
          }
        })
      }
      const row = await prisma.service.update({
        where: { id },
        data,
        include: { masters: true },
      })
      return {
        ...row,
        price: Number(row.price),
        masterIds: row.masters.map((m) => m.masterId),
      }
    } catch {
      return reply.status(404).send({ error: 'Not found' })
    }
  })

  app.delete('/admin/services/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await prisma.service.update({ where: { id }, data: { isActive: false, featured: false } })
      return { ok: true, soft: true }
    } catch {
      return reply.status(404).send({ error: 'Not found' })
    }
  })

  // ——— Masters ———
  app.get('/admin/masters', adminOnly, async () => {
    const rows = await prisma.masterProfile.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
      include: {
        user: true,
        services: true,
        _count: { select: { bookings: true } },
      },
    })
    return rows.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: { ru: m.roleRu, de: m.roleDe },
      bio: { ru: m.bioRu, de: m.bioDe },
      image: m.imageUrl,
      rating: Number(m.rating),
      isActive: m.isActive,
      showOnHome: m.showOnHome,
      specialties: m.services.map((s) => s.serviceId),
      bookingsCount: m._count.bookings,
    }))
  })

  app.post('/admin/masters', adminOnly, async (request, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().optional().default(''),
        lastName: z.string().optional().default(''),
        phone: z.string().optional(),
        roleRu: z.string().optional().default(''),
        roleDe: z.string().optional().default(''),
        bioRu: z.string().optional().default(''),
        bioDe: z.string().optional().default(''),
        imageUrl: z.string().optional().default(''),
        showOnHome: z.boolean().optional().default(true),
        specialtyIds: z.array(z.string()).optional(),
        sortOrder: z.number().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const email = body.data.email.toLowerCase()
    if (await prisma.user.findUnique({ where: { email } })) {
      return reply.status(409).send({ error: 'Email already exists' })
    }

    const passwordHash = await bcrypt.hash(body.data.password, 10)
    const firstName = body.data.firstName.trim() || email.split('@')[0] || 'Master'
    const lastName = body.data.lastName.trim()
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.MASTER,
        firstName,
        lastName,
        phone: body.data.phone,
        masterProfile: {
          create: {
            roleRu: body.data.roleRu,
            roleDe: body.data.roleDe,
            bioRu: body.data.bioRu,
            bioDe: body.data.bioDe,
            imageUrl: body.data.imageUrl,
            showOnHome: body.data.showOnHome,
            sortOrder: body.data.sortOrder ?? 0,
            services: body.data.specialtyIds?.length
              ? {
                  create: body.data.specialtyIds.map((serviceId) => ({ serviceId })),
                }
              : undefined,
            workingHours: {
              create: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
                dayOfWeek,
                startTime: '08:00',
                endTime: '19:30',
              })),
            },
          },
        },
      },
      include: { masterProfile: { include: { services: true } } },
    })
    return reply.status(201).send(user.masterProfile)
  })

  app.patch('/admin/masters/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        roleRu: z.string().optional(),
        roleDe: z.string().optional(),
        bioRu: z.string().optional(),
        bioDe: z.string().optional(),
        imageUrl: z.string().optional(),
        isActive: z.boolean().optional(),
        showOnHome: z.boolean().optional(),
        specialtyIds: z.array(z.string()).optional(),
        sortOrder: z.number().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const master = await prisma.masterProfile.findUnique({ where: { id } })
    if (!master) return reply.status(404).send({ error: 'Not found' })

    if (body.data.specialtyIds) {
      await prisma.$transaction([
        prisma.masterService.deleteMany({ where: { masterId: id } }),
        ...(body.data.specialtyIds.length
          ? [
              prisma.masterService.createMany({
                data: body.data.specialtyIds.map((serviceId) => ({ masterId: id, serviceId })),
              }),
            ]
          : []),
      ])
    }

    const updated = await prisma.masterProfile.update({
      where: { id },
      data: {
        roleRu: body.data.roleRu,
        roleDe: body.data.roleDe,
        bioRu: body.data.bioRu,
        bioDe: body.data.bioDe,
        imageUrl: body.data.imageUrl,
        isActive: body.data.isActive,
        showOnHome: body.data.showOnHome,
        sortOrder: body.data.sortOrder,
        user: {
          update: {
            firstName: body.data.firstName,
            lastName: body.data.lastName,
            isActive: body.data.isActive,
          },
        },
      },
      include: {
        user: true,
        services: true,
      },
    })
    return updated
  })

  app.delete('/admin/masters/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const master = await prisma.masterProfile.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    })
    if (!master) return reply.status(404).send({ error: 'Not found' })

    // Hard-delete when nothing references the master; otherwise deactivate
    if (master._count.bookings === 0) {
      try {
        await prisma.user.delete({ where: { id: master.userId } })
        return { ok: true, soft: false }
      } catch {
        /* FK elsewhere (e.g. authored notes) — fall through to soft delete */
      }
    }

    await prisma.masterProfile.update({
      where: { id },
      data: { isActive: false, showOnHome: false, user: { update: { isActive: false } } },
    })
    return { ok: true, soft: true }
  })

  // ——— Bookings ———
  app.get('/admin/bookings', adminOnly, async (request) => {
    const q = z
      .object({
        status: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .safeParse(request.query)

    const rows = await prisma.booking.findMany({
      where: {
        status: q.success && q.data.status ? (q.data.status.toUpperCase() as BookingStatus) : undefined,
        startsAt:
          q.success && (q.data.from || q.data.to)
            ? {
                gte: q.data.from ? new Date(q.data.from) : undefined,
                lte: q.data.to ? new Date(q.data.to) : undefined,
              }
            : undefined,
      },
      orderBy: { startsAt: 'desc' },
      take: 200,
      include: {
        service: true,
        client: { include: { user: { select: { firstName: true, lastName: true } } } },
        master: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    })

    const salonTz = process.env.TZ || 'Europe/Berlin'
    const dateFmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: salonTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const timeFmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: salonTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    return rows.map((b) => {
      const clientName = b.client
        ? `${b.client.user.firstName} ${b.client.user.lastName}`
        : `${b.guestFirstName ?? ''} ${b.guestLastName ?? ''}`.trim() || 'Walk-in'
      return {
        id: b.id,
        startsAt: b.startsAt.toISOString(),
        date: dateFmt.format(b.startsAt),
        time: timeFmt.format(b.startsAt),
        status: b.status.toLowerCase(),
        notes: b.notes,
        price: Number(b.priceSnapshot),
        client: clientName,
        clientId: b.clientId,
        isGuest: !b.clientId,
        guestPhone: b.guestPhone,
        service: {
          id: b.service.id,
          categoryId: b.service.categoryId,
          name: { ru: b.service.nameRu, de: b.service.nameDe },
        },
        master: {
          id: b.master.id,
          name: `${b.master.user.firstName} ${b.master.user.lastName}`,
        },
      }
    })
  })

  /** Walk-in booking: no client account — only name/phone + appointment */
  app.post('/admin/bookings', adminOnly, async (request, reply) => {
    const body = z
      .object({
        serviceId: z.string().min(1),
        masterId: z.string().min(1),
        startsAt: z.string().min(10),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        notes: z.string().max(1000).optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

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
      if (msg === 'DAY_OFF') return reply.status(409).send({ error: 'DAY_OFF' })
      if (msg === 'OUTSIDE_HOURS') return reply.status(409).send({ error: 'OUTSIDE_HOURS' })
      if (msg === 'SLOT_BLOCKED') return reply.status(409).send({ error: 'SLOT_BLOCKED' })
      if (msg === 'SLOT_TAKEN') return reply.status(409).send({ error: 'SLOT_TAKEN' })
      return reply.status(409).send({ error: msg })
    }

    const priced = await resolvePromoPrice(service.id, service.price)

    const booking = await prisma.booking.create({
      data: {
        clientId: null,
        masterId: body.data.masterId,
        serviceId: service.id,
        startsAt,
        endsAt,
        status: BookingStatus.CONFIRMED,
        priceSnapshot: priced.price,
        notes: body.data.notes?.trim() || null,
        guestFirstName: body.data.firstName.trim(),
        guestLastName: body.data.lastName.trim(),
        guestPhone: body.data.phone?.trim() || null,
        createdBy: request.user.id,
      },
      include: {
        service: true,
        master: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    })

    return reply.status(201).send({
      id: booking.id,
      startsAt: booking.startsAt.toISOString(),
      date: booking.startsAt.toISOString().slice(0, 10),
      time: booking.startsAt.toISOString().slice(11, 16),
      status: booking.status.toLowerCase(),
      notes: booking.notes,
      price: Number(booking.priceSnapshot),
      client: `${booking.guestFirstName} ${booking.guestLastName}`,
      clientId: null,
      isGuest: true,
      guestPhone: booking.guestPhone,
      service: {
        id: booking.service.id,
        categoryId: booking.service.categoryId,
        name: { ru: booking.service.nameRu, de: booking.service.nameDe },
      },
      master: {
        id: booking.master.id,
        name: `${booking.master.user.firstName} ${booking.master.user.lastName}`,
      },
    })
  })

  app.patch('/admin/bookings/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z
      .object({
        status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
        notes: z.string().optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    try {
      return await prisma.booking.update({
        where: { id },
        data: {
          status: body.data.status,
          notes: body.data.notes,
          cancelledAt:
            body.data.status === 'CANCELLED'
              ? new Date()
              : body.data.status
                ? null
                : undefined,
        },
      })
    } catch {
      return reply.status(404).send({ error: 'Not found' })
    }
  })

  // ——— Promos ———
  app.get('/admin/promos', adminOnly, async () => {
    const rows = await prisma.promo.findMany({
      orderBy: { createdAt: 'desc' },
      include: { services: true },
    })
    return rows.map((p) => ({
      id: p.id,
      headline: { ru: p.headlineRu, de: p.headlineDe },
      body: { ru: p.bodyRu, de: p.bodyDe },
      discountPct: p.discountPct,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      isActive: p.isActive,
      serviceIds: p.services.map((s) => s.serviceId),
    }))
  })

  app.post('/admin/promos', adminOnly, async (request, reply) => {
    const body = z
      .object({
        headlineRu: z.string(),
        headlineDe: z.string(),
        bodyRu: z.string(),
        bodyDe: z.string(),
        discountPct: z.number().int().optional().nullable(),
        startsAt: z.string().nullable().optional(),
        endsAt: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        serviceIds: z.array(z.string()).optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const promo = await prisma.promo.create({
      data: {
        headlineRu: body.data.headlineRu,
        headlineDe: body.data.headlineDe,
        bodyRu: body.data.bodyRu,
        bodyDe: body.data.bodyDe,
        discountPct: body.data.discountPct,
        startsAt: body.data.startsAt ? new Date(body.data.startsAt) : null,
        endsAt: body.data.endsAt ? new Date(body.data.endsAt) : null,
        isActive: body.data.isActive ?? true,
        services: body.data.serviceIds?.length
          ? { create: body.data.serviceIds.map((serviceId) => ({ serviceId })) }
          : undefined,
      },
      include: { services: true },
    })
    return reply.status(201).send(promo)
  })

  app.patch('/admin/promos/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z
      .object({
        headlineRu: z.string().optional(),
        headlineDe: z.string().optional(),
        bodyRu: z.string().optional(),
        bodyDe: z.string().optional(),
        discountPct: z.number().int().nullable().optional(),
        startsAt: z.string().nullable().optional(),
        endsAt: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        serviceIds: z.array(z.string()).optional(),
      })
      .safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const existing = await prisma.promo.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })

    if (body.data.serviceIds) {
      await prisma.$transaction([
        prisma.promoService.deleteMany({ where: { promoId: id } }),
        ...(body.data.serviceIds.length
          ? [
              prisma.promoService.createMany({
                data: body.data.serviceIds.map((serviceId) => ({ promoId: id, serviceId })),
              }),
            ]
          : []),
      ])
    }

    const { serviceIds: _s, startsAt, endsAt, ...rest } = body.data
    return prisma.promo.update({
      where: { id },
      data: {
        ...rest,
        startsAt: startsAt === undefined ? undefined : startsAt ? new Date(startsAt) : null,
        endsAt: endsAt === undefined ? undefined : endsAt ? new Date(endsAt) : null,
      },
      include: { services: true },
    })
  })

  app.delete('/admin/promos/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await prisma.promo.update({ where: { id }, data: { isActive: false } })
      return { ok: true, soft: true }
    } catch {
      return reply.status(404).send({ error: 'Not found' })
    }
  })
}
