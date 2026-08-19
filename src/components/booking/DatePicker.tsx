import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { addDays, addMonths, monthGrid, startOfMonth, todayISO } from '../../lib/datetime'
import { salonDayOfWeek } from '../../lib/salonTime'
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
}: DatePickerProps) {
  const today = useMemo(() => todayISO(), [])
  const stripRef = useRef<HTMLDivElement>(null)
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(value))
  const [calOpen, setCalOpen] = useState(false)
  /** Grow as user scrolls right — was hard-capped at 21 days */
  const [daysAhead, setDaysAhead] = useState(60)

  const workingSet = useMemo(() => {
    if (!workingDays) return null
    return new Set(workingDays)
  }, [workingDays])

  const isClosed = (dateStr: string) => {
    if (!workingSet) return salonDayOfWeek(dateStr) === 0
    return !workingSet.has(salonDayOfWeek(dateStr))
  }

  const stripDays = useMemo(() => {
    return Array.from({ length: daysAhead }, (_, i) => addDays(today, i))
  }, [today, daysAhead])

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
    if (isClosed(dateStr)) return
    onChange(dateStr)
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
            const closed = isClosed(key)
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
                disabled={closed}
                title={closed ? closedLabel : undefined}
                className={`date-picker__day ${selected ? 'is-selected' : ''} ${closed ? 'is-closed' : ''} ${isToday ? 'is-today' : ''}`}
                onClick={() => selectDay(key)}
              >
                <span className="date-picker__weekday">{weekday}</span>
                <span className="date-picker__num">{d}</span>
                <span className="date-picker__month">
                  {closed
                    ? closedLabel ?? (locale === 'ru' ? 'вых.' : 'frei')
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
              const closed = isClosed(key)
              const selected = key === value
              const isToday = key === today
              return (
                <button
                  key={key}
                  type="button"
                  disabled={past || closed}
                  title={closed ? closedLabel : undefined}
                  className={`date-picker__cell ${selected ? 'is-selected' : ''} ${closed ? 'is-closed' : ''} ${isToday ? 'is-today' : ''}`}
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
