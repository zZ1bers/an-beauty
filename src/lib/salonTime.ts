/** Salon wall clock — AN.Beauty is in Nürnberg (Germany). */
export const SALON_TZ = 'Europe/Berlin'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function zoneOffsetMs(timeZone: string, instantMs: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(instantMs))
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - instantMs
}

/** Convert salon local YYYY-MM-DD + HH:mm → absolute Instant. */
export function salonDateTime(dateStr: string, timeHHMM: string): Date {
  const [ys, ms, ds] = dateStr.split('-')
  const [hs, mins] = timeHHMM.split(':')
  const y = Number(ys)
  const m = Number(ms)
  const d = Number(ds)
  const hh = Number(hs)
  const mm = Number(mins)
  if (![y, m, d, hh, mm].every((n) => Number.isFinite(n))) {
    return new Date(NaN)
  }

  const target = Date.UTC(y, m - 1, d, hh, mm, 0, 0)
  let instant = target - zoneOffsetMs(SALON_TZ, target)
  instant = target - zoneOffsetMs(SALON_TZ, instant)
  return new Date(instant)
}

export function salonDateStr(instant: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: SALON_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(instant)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function salonTimeStr(instant: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: SALON_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  )
  return `${parts.hour}:${parts.minute}`
}

export function addCalendarDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`
}

/** Sunday=0 … Saturday=6 in salon TZ (matches JS Date#getDay). */
export function salonDayOfWeek(dateStr: string): number {
  const noon = salonDateTime(dateStr, '12:00')
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: SALON_TZ,
    weekday: 'short',
  }).format(noon)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[wd] ?? 0
}
