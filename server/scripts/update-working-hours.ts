/**
 * Non-destructive: set all master working hours to 10:00–20:00.
 * Does not wipe users, bookings, services, etc.
 *
 *   npm run db:update-hours
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const r = await prisma.workingHours.updateMany({
    data: { startTime: '10:00', endTime: '20:00' },
  })
  console.log(`Updated ${r.count} working-hours rows → 10:00–20:00`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
