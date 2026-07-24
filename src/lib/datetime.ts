/** Local calendar helpers — avoid UTC shift bugs with toISOString(). */

export function todayISO() {
  return toDateStr(new Date())
}

export function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Build Date in local timezone from YYYY-MM-DD + HH:MM */
export function localDateTime(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

export function dayStart(date: string) {
  return localDateTime(date, '00:00')
}

export function dayEnd(date: string) {
  return localDateTime(date, '23:59')
}

export function addDays(date: string, days: number) {
  const d = dayStart(date)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart
}

export function formatDayLabel(date: string, locale: string) {
  const d = dayStart(date)
  return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Monday-based weekday index: Mon=0 … Sun=6 */
export function mondayIndex(date: string) {
  const dow = dayStart(date).getDay() // Sun=0 … Sat=6
  return (dow + 6) % 7
}

export function startOfMonth(date: string) {
  const d = dayStart(date)
  d.setDate(1)
  return toDateStr(d)
}

export function endOfMonth(date: string) {
  const d = dayStart(date)
  d.setMonth(d.getMonth() + 1, 0)
  return toDateStr(d)
}

export function addMonths(date: string, months: number) {
  const d = dayStart(date)
  d.setMonth(d.getMonth() + months)
  return toDateStr(d)
}

export function monthTitle(date: string, locale: string) {
  return dayStart(date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
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
