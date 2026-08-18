/**
 * Non-destructive: set all master working hours to 10:00–20:00.
 * Does NOT touch TimeOff (blocked slots), bookings, services, users.
 *
 *   npm run db:update-hours
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const masters = await prisma.masterProfile.findMany({ select: { id: true } })
  let upserts = 0

  for (const m of masters) {
    // Keep whatever days already exist; set them to 10:00–20:00
    const updated = await prisma.workingHours.updateMany({
      where: { masterId: m.id },
      data: { startTime: '10:00', endTime: '20:00' },
    })
    upserts += updated.count

    // Ensure Mon–Sat exist (0=Sun … 6=Sat). Do not create Sunday if missing.
    for (const dayOfWeek of [1, 2, 3, 4, 5, 6]) {
      await prisma.workingHours.upsert({
        where: { masterId_dayOfWeek: { masterId: m.id, dayOfWeek } },
        create: {
          masterId: m.id,
          dayOfWeek,
          startTime: '10:00',
          endTime: '20:00',
        },
        update: {
          startTime: '10:00',
          endTime: '20:00',
        },
      })
      upserts += 1
    }
  }

  const timeOffs = await prisma.timeOff.count()
  console.log(
    `Working hours → 10:00–20:00 for ${masters.length} masters (${upserts} row ops). TimeOff untouched: ${timeOffs} blocks kept.`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
