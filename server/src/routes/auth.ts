import type { FastifyInstance } from 'fastify'
import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../db.js'
import { authenticate } from '../plugins/auth.js'
import { sendPasswordResetCode } from '../services/mail.js'

const RESET_TTL_MS = 15 * 60 * 1000
const RESET_COOLDOWN_MS = 60 * 1000
const RESET_MAX_ATTEMPTS = 5

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  locale: z.enum(['ru', 'de']).optional(),
})

const forgotSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['ru', 'de']).optional(),
})

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(6),
})

function publicUser(user: {
  id: string
  email: string
  role: Role
  firstName: string
  lastName: string
  phone: string | null
  locale: string
  clientProfile?: { id: string } | null
  masterProfile?: { id: string } | null
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    locale: user.locale,
    clientProfileId: user.clientProfile?.id ?? null,
    masterProfileId: user.masterProfile?.id ?? null,
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const user = await prisma.user.findUnique({
      where: { email: body.data.email.toLowerCase() },
      include: { clientProfile: true, masterProfile: true },
    })
    if (!user || !user.isActive) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(body.data.password, user.passwordHash)
    if (!ok) return reply.status(401).send({ error: 'Invalid credentials' })

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    return { token, user: publicUser(user) }
  })

  app.post('/auth/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const email = body.data.email.toLowerCase()
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return reply.status(409).send({ error: 'Email already registered' })

    const passwordHash = await bcrypt.hash(body.data.password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.CLIENT,
        firstName: body.data.firstName,
        lastName: body.data.lastName,
        phone: body.data.phone,
        locale: body.data.locale ?? 'ru',
        clientProfile: { create: {} },
      },
      include: { clientProfile: true, masterProfile: true },
    })

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    return reply.status(201).send({ token, user: publicUser(user) })
  })

  app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { clientProfile: true, masterProfile: true },
    })
    if (!user || !user.isActive) return reply.status(401).send({ error: 'Unauthorized' })
    return { user: publicUser(user) }
  })

  /** Always returns ok — do not reveal whether the email exists */
  app.post('/auth/forgot-password', async (request, reply) => {
    const body = forgotSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const email = body.data.email.toLowerCase()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      return { ok: true }
    }

    if (user.resetSentAt && Date.now() - user.resetSentAt.getTime() < RESET_COOLDOWN_MS) {
      return { ok: true }
    }

    const code = String(randomInt(100000, 1000000))
    const resetCodeHash = await bcrypt.hash(code, 10)
    const locale = (body.data.locale || user.locale || 'ru') === 'de' ? 'de' : 'ru'

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetCodeHash,
        resetCodeExpiresAt: new Date(Date.now() + RESET_TTL_MS),
        resetAttempts: 0,
        resetSentAt: new Date(),
      },
    })

    try {
      await sendPasswordResetCode({
        to: user.email,
        code,
        firstName: user.firstName,
        locale,
      })
    } catch (e) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetCodeHash: null,
          resetCodeExpiresAt: null,
          resetAttempts: 0,
          resetSentAt: null,
        },
      })
      const msg = e instanceof Error ? e.message : 'MAIL_FAILED'
      if (msg === 'SMTP_NOT_CONFIGURED') {
        return reply.status(503).send({ error: 'Mail not configured' })
      }
      return reply.status(502).send({ error: 'Mail send failed' })
    }

    return { ok: true }
  })

  app.post('/auth/reset-password', async (request, reply) => {
    const body = resetSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid body' })

    const email = body.data.email.toLowerCase()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive || !user.resetCodeHash || !user.resetCodeExpiresAt) {
      return reply.status(400).send({ error: 'Invalid or expired code' })
    }

    if (user.resetCodeExpiresAt.getTime() < Date.now()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetCodeHash: null, resetCodeExpiresAt: null, resetAttempts: 0 },
      })
      return reply.status(400).send({ error: 'Invalid or expired code' })
    }

    if (user.resetAttempts >= RESET_MAX_ATTEMPTS) {
      return reply.status(429).send({ error: 'Too many attempts' })
    }

    const codeOk = await bcrypt.compare(body.data.code, user.resetCodeHash)
    if (!codeOk) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetAttempts: { increment: 1 } },
      })
      return reply.status(400).send({ error: 'Invalid or expired code' })
    }

    const passwordHash = await bcrypt.hash(body.data.password, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetCodeHash: null,
        resetCodeExpiresAt: null,
        resetAttempts: 0,
        resetSentAt: null,
      },
    })

    return { ok: true }
  })
}
