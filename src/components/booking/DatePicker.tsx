import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { addDays, addMonths, monthGrid, startOfMonth, todayISO } from '../../lib/datetime'
import { salonDayOfWeek } from '../../lib/salonTime'
import { api } from '../../lib/api'
import './DatePicker.css'

type DatePickerProps = {
  value: string
  onChange: (date: string) => void
  locale: 'ru' | 'de'
  calendarLabel: string
  masterName?: string
  withMasterLabel?: string
  /** JS getDay(): 0=Sun … 6=Sat (salon / Europe/Berlin) */
  workingDays?: number[]
  closedLabel?: string
  /** Label for days with no free slots (booked / blocked). Defaults to closedLabel. */
  noSlotsLabel?: string
  /** When set, fetches availability and paints full/empty days red. */
  masterId?: string
  serviceId?: string
  /** Used when serviceId is not set (e.g. admin master-first probe). */
  durationMin?: number
}

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function DatePicker({
  value,
  onChange,
  locale,
  calendarLabel,
  masterName,
  withMasterLabel,
  workingDays,
  closedLabel,
  noSlotsLabel,
  masterId,
  serviceId,
  durationMin,
}: DatePickerProps) {
  const today = useMemo(() => todayISO(), [])
  const stripRef = useRef<HTMLDivElement>(null)
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(value))
  const [calOpen, setCalOpen] = useState(false)
  /** Grow as user scrolls right — was hard-capped at 21 days */
  const [daysAhead, setDaysAhead] = useState(60)
  const [unavailable, setUnavailable] = useState<Set<string>>(() => new Set())

  const workingSet = useMemo(() => {
    if (!workingDays) return null
    return new Set(workingDays)
  }, [workingDays])

  const isNonWorking = (dateStr: string) => {
    if (!workingSet) return salonDayOfWeek(dateStr) === 0
    return !workingSet.has(salonDayOfWeek(dateStr))
  }

  const isUnavailable = (dateStr: string) => unavailable.has(dateStr)

  /** Closed for picking: non-working week OR no free slots */
  const isBlocked = (dateStr: string) => isNonWorking(dateStr) || isUnavailable(dateStr)

  const stripDays = useMemo(() => {
    return Array.from({ length: daysAhead }, (_, i) => addDays(today, i))
  }, [today, daysAhead])

  const availTo = useMemo(() => {
    const stripEnd = addDays(today, daysAhead)
    const monthEnd = addDays(addMonths(startOfMonth(monthCursor), 1), -1)
    return stripEnd > monthEnd ? stripEnd : monthEnd
  }, [today, daysAhead, monthCursor])

  useEffect(() => {
    if (!masterId) {
      setUnavailable(new Set())
      return
    }
    let cancelled = false
    const from = today
    const to = availTo
    const params = new URLSearchParams({ from, to })
    if (serviceId) params.set('serviceId', serviceId)
    else if (durationMin) params.set('duration', String(durationMin))
    else params.set('duration', '30')

    void api<{ unavailable: string[] }>(`/masters/${masterId}/availability?${params}`, {
      auth: false,
    })
      .then((r) => {
        if (!cancelled) setUnavailable(new Set(r.unavailable))
      })
      .catch(() => {
        if (!cancelled) setUnavailable(new Set())
      })
    return () => {
      cancelled = true
    }
  }, [masterId, serviceId, durationMin, today, availTo])

  // If current day has no slots, jump to the next open day
  useEffect(() => {
    if (!masterId || unavailable.size === 0) return
    if (value < today) return
    const blocked =
      (workingSet ? !workingSet.has(salonDayOfWeek(value)) : salonDayOfWeek(value) === 0) ||
      unavailable.has(value)
    if (!blocked) return
    for (let i = 0; i < Math.max(daysAhead, 90); i++) {
      const d = addDays(today, i)
      const nonWork = workingSet
        ? !workingSet.has(salonDayOfWeek(d))
        : salonDayOfWeek(d) === 0
      if (!nonWork && !unavailable.has(d)) {
        onChange(d)
        return
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unavailable, masterId, workingSet])

  useEffect(() => {
    setMonthCursor(startOfMonth(value))
  }, [value])

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('.date-picker__day.is-selected')
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [value])

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 160) {
        setDaysAhead((n) => Math.min(n + 45, 400))
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const weekdays = locale === 'ru' ? WEEKDAYS_RU : WEEKDAYS_DE
  const fullLabel = noSlotsLabel ?? closedLabel ?? (locale === 'ru' ? 'занято' : 'voll')

  const monthLabel = useMemo(() => {
    const [y, m] = monthCursor.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    })
  }, [monthCursor, locale])

  const calendarCells = useMemo(() => monthGrid(monthCursor), [monthCursor])

  const scrollStrip = (dir: -1 | 1) => {
    if (dir === 1) setDaysAhead((n) => Math.min(n + 30, 400))
    requestAnimationFrame(() => {
      stripRef.current?.scrollBy({ left: dir * 180, behavior: 'smooth' })
    })
  }

  const selectDay = (dateStr: string) => {
    if (dateStr < today) return
    if (isBlocked(dateStr)) return
    onChange(dateStr)
  }

  const dayTitle = (dateStr: string) => {
    if (isNonWorking(dateStr)) return closedLabel
    if (isUnavailable(dateStr)) return fullLabel
    return undefined
  }

  const dayClass = (dateStr: string, selected: boolean, isToday: boolean) => {
    const parts = ['date-picker__day']
    if (selected) parts.push('is-selected')
    if (isNonWorking(dateStr) || isUnavailable(dateStr)) parts.push('is-closed')
    if (isUnavailable(dateStr) && !isNonWorking(dateStr)) parts.push('is-full')
    if (isToday) parts.push('is-today')
    return parts.join(' ')
  }

  const cellClass = (dateStr: string, selected: boolean, isToday: boolean, past: boolean) => {
    const parts = ['date-picker__cell']
    if (selected) parts.push('is-selected')
    if (isNonWorking(dateStr) || isUnavailable(dateStr)) parts.push('is-closed')
    if (isUnavailable(dateStr) && !isNonWorking(dateStr)) parts.push('is-full')
    if (isToday) parts.push('is-today')
    if (past) parts.push('is-past')
    return parts.join(' ')
  }

  return (
    <div className="date-picker">
      <div className="date-picker__toolbar">
        <p className="date-picker__meta">
          {masterName && (
            <>
              {withMasterLabel} <strong>{masterName}</strong>
            </>
          )}
        </p>
        <button
          type="button"
          className={`date-picker__cal-btn ${calOpen ? 'is-open' : ''}`}
          onClick={() => setCalOpen((v) => !v)}
        >
          <CalendarDays size={16} />
          {calendarLabel}
        </button>
      </div>

      <div className="date-picker__strip-wrap">
        <button
          type="button"
          className="date-picker__arrow"
          onClick={() => scrollStrip(-1)}
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="date-picker__strip" ref={stripRef}>
          {stripDays.map((key) => {
            const selected = key === value
            const blocked = isBlocked(key)
            const nonWorking = isNonWorking(key)
            const isToday = key === today
            const [y, m, d] = key.split('-').map(Number)
            const labelDate = new Date(Date.UTC(y, m - 1, d))
            const weekday = labelDate.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
              timeZone: 'UTC',
              weekday: 'short',
            })
            return (
              <button
                key={key}
                type="button"
                disabled={blocked}
                title={dayTitle(key)}
                className={dayClass(key, selected, isToday)}
                onClick={() => selectDay(key)}
              >
                <span className="date-picker__weekday">{weekday}</span>
                <span className="date-picker__num">{d}</span>
                <span className="date-picker__month">
                  {blocked
                    ? nonWorking
                      ? (closedLabel ?? (locale === 'ru' ? 'вых.' : 'frei'))
                      : (fullLabel ?? (locale === 'ru' ? 'занято' : 'voll'))
                    : labelDate.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
                        timeZone: 'UTC',
                        month: 'short',
                      })}
                </span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="date-picker__arrow"
          onClick={() => scrollStrip(1)}
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {calOpen && (
        <div className="date-picker__panel glass">
          <div className="date-picker__month-head">
            <button
              type="button"
              className="date-picker__arrow"
              onClick={() => setMonthCursor((m) => startOfMonth(addMonths(m, -1)))}
              aria-label="Prev month"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="serif">{monthLabel}</h3>
            <button
              type="button"
              className="date-picker__arrow"
              onClick={() => setMonthCursor((m) => startOfMonth(addMonths(m, 1)))}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="date-picker__weekdays">
            {weekdays.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="date-picker__grid">
            {calendarCells.map((cell, i) => {
              if (!cell) {
                return <span key={`e-${i}`} className="date-picker__cell is-empty" />
              }
              const key = cell.date
              const past = key < today
              const blocked = isBlocked(key)
              const selected = key === value
              const isToday = key === today
              return (
                <button
                  key={key}
                  type="button"
                  disabled={past || blocked}
                  title={dayTitle(key)}
                  className={cellClass(key, selected, isToday, past)}
                  onClick={() => {
                    selectDay(key)
                    setCalOpen(false)
                  }}
                >
                  {Number(key.slice(8))}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
