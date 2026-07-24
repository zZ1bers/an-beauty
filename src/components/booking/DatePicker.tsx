import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import './DatePicker.css'

type DatePickerProps = {
  value: string
  onChange: (date: string) => void
  locale: 'ru' | 'de'
  calendarLabel: string
  masterName?: string
  withMasterLabel?: string
  /** JS getDay(): 0=Sun … 6=Sat */
  workingDays?: number[]
  closedLabel?: string
}

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function parseDate(str: string) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
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
  const today = useMemo(() => startOfDay(new Date()), [])
  const stripRef = useRef<HTMLDivElement>(null)
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = parseDate(value)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [calOpen, setCalOpen] = useState(false)

  const workingSet = useMemo(() => {
    if (!workingDays) return null
    return new Set(workingDays)
  }, [workingDays])

  const isClosed = (d: Date) => {
    if (!workingSet) return d.getDay() === 0
    return !workingSet.has(d.getDay())
  }

  const stripDays = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => addDays(today, i))
  }, [today])

  useEffect(() => {
    const d = parseDate(value)
    setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [value])

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('.date-picker__day.is-selected')
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [value])

  const weekdays = locale === 'ru' ? WEEKDAYS_RU : WEEKDAYS_DE

  const monthLabel = monthCursor.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
    month: 'long',
    year: 'numeric',
  })

  const calendarCells = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const first = new Date(year, month, 1)
    const startOffset = (first.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ date: Date | null; key: string }> = []

    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, key: `e-${i}` })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      cells.push({ date, key: toDateStr(date) })
    }
    return cells
  }, [monthCursor])

  const scrollStrip = (dir: -1 | 1) => {
    stripRef.current?.scrollBy({ left: dir * 180, behavior: 'smooth' })
  }

  const selectDay = (d: Date) => {
    if (startOfDay(d) < today) return
    if (isClosed(d)) return
    onChange(toDateStr(d))
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
          {stripDays.map((d) => {
            const key = toDateStr(d)
            const selected = key === value
            const closed = isClosed(d)
            const isToday = key === toDateStr(today)
            const weekday = d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
              weekday: 'short',
            })
            return (
              <button
                key={key}
                type="button"
                disabled={closed}
                title={closed ? closedLabel : undefined}
                className={`date-picker__day ${selected ? 'is-selected' : ''} ${closed ? 'is-closed' : ''} ${isToday ? 'is-today' : ''}`}
                onClick={() => selectDay(d)}
              >
                <span className="date-picker__weekday">{weekday}</span>
                <span className="date-picker__num">{d.getDate()}</span>
                <span className="date-picker__month">
                  {closed
                    ? closedLabel ?? (locale === 'ru' ? 'вых.' : 'frei')
                    : d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
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
              onClick={() =>
                setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              }
              aria-label="Prev month"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="serif">{monthLabel}</h3>
            <button
              type="button"
              className="date-picker__arrow"
              onClick={() =>
                setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              }
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
            {calendarCells.map((cell) => {
              if (!cell.date) {
                return <span key={cell.key} className="date-picker__cell is-empty" />
              }
              const key = toDateStr(cell.date)
              const past = startOfDay(cell.date) < today
              const closed = isClosed(cell.date)
              const selected = key === value
              const isToday = key === toDateStr(today)
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={past || closed}
                  title={closed ? closedLabel : undefined}
                  className={`date-picker__cell ${selected ? 'is-selected' : ''} ${closed ? 'is-closed' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => {
                    selectDay(cell.date!)
                    setCalOpen(false)
                  }}
                >
                  {cell.date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
