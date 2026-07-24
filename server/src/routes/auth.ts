import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../db.js'
import { authenticate } from '../plugins/auth.js'

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
}
