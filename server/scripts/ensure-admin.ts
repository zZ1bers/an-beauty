/**
 * Create or update ADMIN from ADMIN_EMAIL / ADMIN_PASSWORD without wiping the DB.
 * Usage (in api container):
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx scripts/ensure-admin.ts
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient, Role, Locale } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@an.beauty').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD?.trim()
  if (!password) {
    throw new Error('ADMIN_PASSWORD is required')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
      },
    })
    console.log(`Admin password updated: ${email}`)
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.ADMIN,
        firstName: 'Admin',
        lastName: 'AN.Beauty',
        locale: Locale.RU,
        isActive: true,
      },
    })
    console.log(`Admin created: ${email}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
