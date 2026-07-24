import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { config } from './config.js'
import { authRoutes } from './routes/auth.js'
import { publicRoutes } from './routes/public.js'
import { clientRoutes } from './routes/client.js'
import { masterRoutes } from './routes/master.js'
import { adminRoutes } from './routes/admin.js'
import { uploadRoutes } from './routes/upload.js'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  await app.register(cors, {
    origin: config.corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  await app.register(jwt, { secret: config.jwtSecret })

  const uploadDir = path.resolve(process.cwd(), 'uploads')
  await mkdir(uploadDir, { recursive: true })
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
  })

  await app.register(uploadRoutes)
  await app.register(publicRoutes)
  await app.register(authRoutes)
  await app.register(clientRoutes)
  await app.register(masterRoutes)
  await app.register(adminRoutes)

  return app
}
