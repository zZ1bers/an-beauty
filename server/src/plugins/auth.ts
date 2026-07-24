import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Role } from '@prisma/client'

export type JwtUser = {
  id: string
  email: string
  role: Role
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUser
    user: JwtUser
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  }
}
