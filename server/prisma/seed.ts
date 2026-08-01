import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient, Role, Locale } from '@prisma/client'

const prisma = new PrismaClient()

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

async function main() {
  // Full wipe — never run against a live DB with real data unless intentional
  await prisma.notification.deleteMany()
  await prisma.clientNote.deleteMany()
  await prisma.promoService.deleteMany()
  await prisma.promo.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.timeOff.deleteMany()
  await prisma.workingHours.deleteMany()
  await prisma.masterService.deleteMany()
  await prisma.service.deleteMany()
  await prisma.serviceCategory.deleteMany()
  await prisma.clientProfile.deleteMany()
  await prisma.masterProfile.deleteMany()
  await prisma.user.deleteMany()

  const email = (process.env.ADMIN_EMAIL || 'admin@an.beauty').trim().toLowerCase()
  let password = process.env.ADMIN_PASSWORD?.trim() || ''
  let generated = false

  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_PASSWORD is required when NODE_ENV=production')
    }
    password = randomBytes(12).toString('base64url')
    generated = true
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role: Role.ADMIN,
      firstName: 'Admin',
      lastName: 'AN.Beauty',
      locale: Locale.RU,
      isActive: true,
    },
  })

  console.log('Seed complete: database wiped, admin created.')
  console.log(`  ADMIN_EMAIL=${email}`)
  if (generated) {
    console.log(`  ADMIN_PASSWORD=${password}`)
    console.log('  (generated — store securely; not written to any file)')
  } else {
    console.log('  ADMIN_PASSWORD=(from env)')
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
