/** Salon calendar helpers (Europe/Berlin) — avoid host-TZ / UTC shift bugs. */

import {
  addCalendarDays,
  salonDateStr,
  salonDateTime,
  salonDayOfWeek,
  salonTimeStr,
} from './salonTime'

export { salonDayOfWeek }

export function todayISO() {
  return salonDateStr(new Date())
}

export function toDateStr(d: Date) {
  return salonDateStr(d)
}

export function toTimeStr(d: Date) {
  return salonTimeStr(d)
}

/** Build Date from salon-local YYYY-MM-DD + HH:MM (Nürnberg / Europe/Berlin). */
export function localDateTime(date: string, time: string) {
  return salonDateTime(date, time)
}

export function dayStart(date: string) {
  return salonDateTime(date, '00:00')
}

export function dayEnd(date: string) {
  return salonDateTime(date, '23:59')
}

export function addDays(date: string, days: number) {
  return addCalendarDays(date, days)
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart
}

export function formatDayLabel(date: string, locale: string) {
  const d = dayStart(date)
  return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Monday-based weekday index: Mon=0 … Sun=6 */
export function mondayIndex(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // Sun=0 … Sat=6
  return (dow + 6) % 7
}

export function startOfMonth(date: string) {
  const [y, m] = date.split('-')
  return `${y}-${m}-01`
}

export function endOfMonth(date: string) {
  const [y, m] = date.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

export function addMonths(date: string, months: number) {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1 + months, 1))
  const y2 = utc.getUTCFullYear()
  const m2 = utc.getUTCMonth() + 1
  const last = new Date(Date.UTC(y2, m2, 0)).getUTCDate()
  const day = Math.min(d, last)
  return `${y2}-${String(m2).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function monthTitle(date: string, locale: string) {
  return dayStart(date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
    timeZone: 'Europe/Berlin',
    month: 'long',
    year: 'numeric',
  })
}

/** Google-style month grid cells (Mon→Sun), including leading/trailing blanks */
export function monthGrid(monthDate: string) {
  const start = startOfMonth(monthDate)
  const end = endOfMonth(monthDate)
  const lead = mondayIndex(start)
  const cells: ({ date: string; inMonth: boolean } | null)[] = []

  for (let i = 0; i < lead; i++) cells.push(null)

  let cur = start
  while (cur <= end) {
    cells.push({ date: cur, inMonth: true })
    cur = addDays(cur, 1)
  }

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
