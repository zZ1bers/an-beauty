import type { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { randomUUID } from 'node:crypto'
import { Role } from '@prisma/client'
import { requireRole } from '../plugins/auth.js'
import { config } from '../config.js'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
const MAX_BYTES = 8 * 1024 * 1024

function extFor(mime: string, filename?: string) {
  if (filename) {
    const ext = path.extname(filename).toLowerCase()
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'].includes(ext)) return ext
  }
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  if (mime === 'image/heic' || mime === 'image/heif') return '.heic'
  return '.jpg'
}

export async function uploadRoutes(app: FastifyInstance) {
  await app.register(multipart, {
    limits: { fileSize: MAX_BYTES, files: 1 },
  })

  await mkdir(UPLOAD_DIR, { recursive: true })

  app.post(
    '/uploads',
    { preHandler: requireRole(Role.ADMIN, Role.MASTER) },
    async (request, reply) => {
      const file = await request.file()
      if (!file) return reply.status(400).send({ error: 'No file uploaded' })

      const mime = file.mimetype
      if (!ALLOWED.has(mime) && !mime.startsWith('image/')) {
        return reply.status(400).send({ error: 'Only images are allowed' })
      }

      const filename = `${randomUUID()}${extFor(mime, file.filename)}`
      const dest = path.join(UPLOAD_DIR, filename)

      try {
        await pipeline(file.file, createWriteStream(dest))
      } catch {
        return reply.status(500).send({ error: 'Upload failed' })
      }

      if (file.file.truncated) {
        return reply.status(413).send({ error: 'File too large (max 8MB)' })
      }

      const base = config.publicUrl.replace(/\/$/, '')
      const url = `${base}/uploads/${filename}`
      return reply.status(201).send({ url, filename })
    },
  )
}
