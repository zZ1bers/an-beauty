/**
 * Close all masters from October onward by inserting per-day TimeOff rows.
 *
 * SAFE / additive only:
 * - Does NOT change WorkingHours, bookings, users, services, promos
 * - Does NOT delete or update existing TimeOff (Aug/Sep stay as-is)
 * - Only INSERTs new day-off blocks from CLOSE_FROM (default 2026-10-01)
 * - One TimeOff per calendar day so masters can reopen a single day in the cabinet
 *   (opening a day deletes that one row, not a multi-month block)
 *
 *   npm run db:close-from-october
 *   DRY_RUN=1 npm run db:close-from-october
 *   CLOSE_FROM=2026-10-01 CLOSE_TO=2027-12-31 npm run db:close-from-october
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { addCalendarDays, salonDateTime } from '../src/lib/salonTime.js'

const prisma = new PrismaClient()

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const FROM = process.env.CLOSE_FROM ?? '2026-10-01'
const TO = process.env.CLOSE_TO ?? '2027-12-31'
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const REASON = 'Closed until opened by master'

function assertDate(label: string, value: string) {
  if (!DATE_RE.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD, got: ${value}`)
  }
}

function coversFullDay(
  startsAt: Date,
  endsAt: Date,
  dayStart: Date,
  nextDayStart: Date,
) {
  return startsAt <= dayStart && endsAt >= nextDayStart
}

async function main() {
  assertDate('CLOSE_FROM', FROM)
  assertDate('CLOSE_TO', TO)
  if (TO < FROM) throw new Error('CLOSE_TO must be >= CLOSE_FROM')
  // Hard guard: never touch anything before October 2026
  if (FROM < '2026-10-01') {
    throw new Error('Refusing CLOSE_FROM before 2026-10-01 (Aug/Sep must stay untouched)')
  }

  const masters = await prisma.masterProfile.findMany({
    select: { id: true, user: { select: { firstName: true, lastName: true } } },
  })

  const rangeStart = salonDateTime(FROM, '00:00')
  const rangeEnd = salonDateTime(addCalendarDays(TO, 1), '00:00')

  // Existing offs that touch [FROM, TO] — used only to skip already-closed days
  const existing = await prisma.timeOff.findMany({
    where: {
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
    },
    select: { masterId: true, startsAt: true, endsAt: true },
  })

  const byMaster = new Map<string, { startsAt: Date; endsAt: Date }[]>()
  for (const row of existing) {
    const list = byMaster.get(row.masterId) ?? []
    list.push({ startsAt: row.startsAt, endsAt: row.endsAt })
    byMaster.set(row.masterId, list)
  }

  const days: string[] = []
  for (let cur = FROM; cur <= TO; cur = addCalendarDays(cur, 1)) {
    days.push(cur)
  }

  console.log(
    `${DRY_RUN ? '[DRY RUN] ' : ''}Close masters ${FROM} → ${TO} (${days.length} days × ${masters.length} masters)`,
  )

  let created = 0
  let skipped = 0
  const batch: { masterId: string; startsAt: Date; endsAt: Date; reason: string }[] = []

  for (const m of masters) {
    const offs = byMaster.get(m.id) ?? []
    for (const day of days) {
      const start = salonDateTime(day, '00:00')
      const end = salonDateTime(addCalendarDays(day, 1), '00:00')
      const already = offs.some((o) => coversFullDay(o.startsAt, o.endsAt, start, end))
      if (already) {
        skipped += 1
        continue
      }
      batch.push({ masterId: m.id, startsAt: start, endsAt: end, reason: REASON })
      created += 1
    }
    const name = `${m.user.firstName} ${m.user.lastName}`.trim()
    console.log(`  · ${name || m.id}`)
  }

  if (!DRY_RUN && batch.length > 0) {
    // createMany in chunks to keep payload reasonable
    const CHUNK = 500
    for (let i = 0; i < batch.length; i += CHUNK) {
      await prisma.timeOff.createMany({ data: batch.slice(i, i + CHUNK) })
    }
  }

  console.log(
    `${DRY_RUN ? '[DRY RUN] would create' : 'Created'} ${created} day-off rows; skipped ${skipped} already-closed days.`,
  )
  console.log('Untouched: WorkingHours, Booking, User, Service, Promo, and all TimeOff before', FROM)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
