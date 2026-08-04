import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock3, NotebookPen, Users, Activity, CalendarRange, LogOut, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError } from '../lib/api'
import { ConfirmDialog } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import {
  addDays,
  addMonths,
  dayEnd,
  dayStart,
  formatDayLabel,
  localDateTime,
  monthGrid,
  monthTitle,
  overlaps,
  startOfMonth,
  toTimeStr,
  todayISO,
  toDateStr,
} from '../lib/datetime'
import './Portal.css'

type MasterBooking = {
  id: string
  startsAt: string
  endsAt: string
  status: string
  notes: string | null
  service: { name: { ru: string; de: string } }
  client: { id: string; name: string; allergies: string | null; isGuest?: boolean }
}

type TimeOff = { id: string; startsAt: string; endsAt: string; reason: string | null }

type Schedule = {
  workingHours: { id?: string; dayOfWeek: number; startTime: string; endTime: string }[]
  timeOffs: TimeOff[]
}

type CatalogService = {
  id: string
  name: { ru: string; de: string }
  price: number
  duration: number
}

/** JS getDay(): 0=Sun … 6=Sat — display Mon→Sun like Google Calendar (EU) */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const DAY_LABELS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const HEAD_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const HEAD_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
/** 08:00–19:00 start times (30 min cells; day ends 19:30) */
const SLOT_TIMES = Array.from({ length: 23 }, (_, i) => {
  const total = 8 * 60 + i * 30
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

const SLOT_MIN = 30

async function removeTimeOff(id: string) {
  await api(`/master/time-off/${id}/remove`, { method: 'POST', body: JSON.stringify({}) })
}

export function StaffPage() {
  const { t, locale } = useLang()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [view, setView] = useState<'day' | 'schedule' | 'services'>('day')
  const [date, setDate] = useState(todayISO())
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(todayISO()))
  const [bookings, setBookings] = useState<MasterBooking[]>([])
  const [load, setLoad] = useState(0)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [hoursDraft, setHoursDraft] = useState<
    { dayOfWeek: number; startTime: string; endTime: string; enabled: boolean }[]
  >([])
  const [catalog, setCatalog] = useState<CatalogService[]>([])
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [noteClientId, setNoteClientId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyAction, setBusyAction] = useState(false)
  const [clientsScope, setClientsScope] = useState<'day' | 'all'>('day')
  const [allBookings, setAllBookings] = useState<MasterBooking[]>([])
  const [allLoading, setAllLoading] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)

  const dayLabels = locale === 'ru' ? DAY_LABELS_RU : DAY_LABELS_DE
  const headLabels = locale === 'ru' ? HEAD_RU : HEAD_DE
  const today = todayISO()

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const from = startOfMonth(calendarMonth)
      const to = addDays(addMonths(calendarMonth, 1), 7)
      const [b, l, s, catalogRows, me] = await Promise.all([
        api<MasterBooking[]>(`/master/bookings?date=${date}`),
        api<{ load: number }>(`/master/load?date=${date}`),
        api<Schedule>(`/master/schedule?from=${from}&to=${to}`),
        api<CatalogService[]>('/services', { auth: false }),
        api<{ specialties: string[] }>('/master/me'),
      ])
      setBookings(b)
      setLoad(l.load)
      setSchedule(s)
      setCatalog(catalogRows)
      setSpecialtyIds(me.specialties)
      setHoursDraft(
        [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
          const existing = s.workingHours.find((h) => h.dayOfWeek === dayOfWeek)
          return {
            dayOfWeek,
            startTime: existing?.startTime ?? '08:00',
            endTime: existing?.endTime ?? '19:30',
            enabled: !!existing,
          }
        }),
      )
      if (b[0] && !noteClientId) setNoteClientId(b[0].client.id)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, calendarMonth])

  const hoursLabel = useMemo(() => {
    if (!schedule) return '—'
    const d = dayStart(date).getDay()
    const h = schedule.workingHours.find((w) => w.dayOfWeek === d)
    return h ? `${h.startTime}–${h.endTime}` : t.staff.dayOff
  }, [schedule, date, t.staff.dayOff])

  const isWorkingDay = useMemo(() => {
    if (!schedule) return false
    const d = dayStart(date).getDay()
    return schedule.workingHours.some((w) => w.dayOfWeek === d)
  }, [schedule, date])

  const slotStates = useMemo(() => {
    const map = new Map<
      string,
      { kind: 'open' | 'busy' | 'blocked' | 'dayoff'; timeOffId?: string }
    >()

    const offs = schedule?.timeOffs ?? []
    const dayOff = offs.find((o) => {
      const s = new Date(o.startsAt)
      const e = new Date(o.endsAt)
      const ds = dayStart(date)
      const de = dayEnd(date)
      // full-day style: covers almost entire day
      return s <= ds && e >= de
    })

    for (const time of SLOT_TIMES) {
      const slotStart = localDateTime(date, time)
      const slotEnd = new Date(slotStart.getTime() + SLOT_MIN * 60_000)

      const booking = bookings.find((b) => {
        if (b.status !== 'confirmed' && b.status !== 'pending') return false
        return overlaps(slotStart, slotEnd, new Date(b.startsAt), new Date(b.endsAt))
      })
      if (booking) {
        map.set(time, { kind: 'busy' })
        continue
      }

      if (dayOff) {
        map.set(time, { kind: 'dayoff', timeOffId: dayOff.id })
        continue
      }

      const block = offs.find((o) =>
        overlaps(slotStart, slotEnd, new Date(o.startsAt), new Date(o.endsAt)),
      )
      if (block) {
        map.set(time, { kind: 'blocked', timeOffId: block.id })
      } else {
        map.set(time, { kind: 'open' })
      }
    }
    return map
  }, [bookings, schedule, date])

  const fullDayOff = useMemo(() => {
    const offs = schedule?.timeOffs ?? []
    return offs.find((o) => {
      const s = new Date(o.startsAt)
      const e = new Date(o.endsAt)
      return s <= dayStart(date) && e >= dayEnd(date)
    })
  }, [schedule, date])

  const calendarCells = useMemo(() => monthGrid(calendarMonth), [calendarMonth])

  const dayOffIds = useMemo(() => {
    const map = new Map<string, string>()
    const days = calendarCells.filter(Boolean).map((c) => c!.date)
    for (const o of schedule?.timeOffs ?? []) {
      const s = new Date(o.startsAt)
      const e = new Date(o.endsAt)
      for (const day of days) {
        if (s <= dayStart(day) && e >= dayEnd(day)) {
          map.set(day, o.id)
        }
      }
    }
    return map
  }, [schedule, calendarCells])

  const todayBookings = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'pending')
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))

  const loadAllBookings = useCallback(async () => {
    setAllLoading(true)
    try {
      const rows = await api<MasterBooking[]>('/master/bookings')
      setAllBookings(rows.sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt)))
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    } finally {
      setAllLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (clientsScope === 'all') void loadAllBookings()
  }, [clientsScope, loadAllBookings])

  const clientBookings = clientsScope === 'day' ? todayBookings : allBookings

  const clientBookingsGrouped = useMemo(() => {
    if (clientsScope !== 'all') return null
    const groups: { day: string; items: MasterBooking[] }[] = []
    for (const b of allBookings) {
      const day = toDateStr(new Date(b.startsAt))
      const last = groups[groups.length - 1]
      if (last && last.day === day) last.items.push(b)
      else groups.push({ day, items: [b] })
    }
    return groups
  }, [clientsScope, allBookings])

  const patchBooking = async (id: string, status: string) => {
    try {
      await api(`/master/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      toast.push(t.admin.save)
      await loadData()
      if (clientsScope === 'all') await loadAllBookings()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    }
  }

  const confirmCancelBooking = async () => {
    if (!cancelId) return
    setCancelBusy(true)
    try {
      await patchBooking(cancelId, 'CANCELLED')
      setCancelId(null)
    } finally {
      setCancelBusy(false)
    }
  }

  const noteTarget = clientBookings.find((b) => b.client.id === noteClientId)?.client
  const noteIsGuest = !!noteTarget?.isGuest || noteClientId.startsWith('guest:')

  const saveNote = async () => {
    if (!noteClientId || !note.trim()) {
      toast.push(t.staff.selectClient, 'err')
      return
    }
    if (noteIsGuest) {
      toast.push(t.staff.guestNoNotes, 'err')
      return
    }
    try {
      await api(`/clients/${noteClientId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: note.trim() }),
      })
      setNote('')
      toast.push(t.staff.noteSaved)
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    }
  }

  const toggleSlot = async (time: string) => {
    const state = slotStates.get(time)
    if (!state || state.kind === 'busy' || busyAction) return
    setBusyAction(true)
    try {
      if (state.kind === 'blocked' || state.kind === 'dayoff') {
        if (state.kind === 'dayoff') {
          toast.push(t.staff.fullDayOff, 'err')
          return
        }
        if (state.timeOffId) {
          await removeTimeOff(state.timeOffId)
          toast.push(t.staff.unblock)
        }
      } else {
        const startsAt = localDateTime(date, time)
        const endsAt = new Date(startsAt.getTime() + SLOT_MIN * 60_000)
        await api('/master/time-off', {
          method: 'POST',
          body: JSON.stringify({
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            reason: 'Blocked slot',
          }),
        })
        toast.push(t.staff.closeSlots)
      }
      await loadData()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    } finally {
      setBusyAction(false)
    }
  }

  const toggleFullDay = async (day: string) => {
    if (busyAction) return
    setBusyAction(true)
    try {
      const existingId = dayOffIds.get(day)
      if (existingId) {
        await removeTimeOff(existingId)
        toast.push(t.staff.workingDay)
      } else {
        // Remove smaller slot blocks inside the day first
        const offs = (schedule?.timeOffs ?? []).filter((o) =>
          overlaps(dayStart(day), dayEnd(day), new Date(o.startsAt), new Date(o.endsAt)),
        )
        for (const o of offs) {
          await removeTimeOff(o.id)
        }
        const start = dayStart(day)
        const end = new Date(dayStart(addDays(day, 1)).getTime())
        await api('/master/time-off', {
          method: 'POST',
          body: JSON.stringify({
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            reason: 'Day off',
          }),
        })
        toast.push(t.staff.fullDayOff)
      }
      await loadData()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    } finally {
      setBusyAction(false)
    }
  }

  const saveSchedule = async () => {
    try {
      await api('/master/schedule', {
        method: 'PUT',
        body: JSON.stringify({
          workingHours: hoursDraft
            .filter((h) => h.enabled)
            .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
        }),
      })
      toast.push(t.admin.save)
      await loadData()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    }
  }

  const toggleSpecialty = (id: string) => {
    setSpecialtyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const saveServices = async () => {
    setBusyAction(true)
    try {
      await api('/master/services', {
        method: 'PUT',
        body: JSON.stringify({ specialtyIds }),
      })
      toast.push(t.staff.servicesSaved)
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    } finally {
      setBusyAction(false)
    }
  }

  return (
    <main className="portal page-enter">
      <div className="portal__wrap">
        <header className="portal__head">
          <div>
            <p className="eyebrow">
              {user?.firstName} {user?.lastName}
            </p>
            <h1 className="portal__title display">{t.staff.title}</h1>
            <p className="portal__sub">{t.staff.subtitle}</p>
            <div className="admin__tabs" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <button
                className={`admin__tab ${view === 'day' ? 'is-active' : ''}`}
                onClick={() => setView('day')}
              >
                <Clock3 size={14} />
                {t.staff.today}
              </button>
              <button
                className={`admin__tab ${view === 'schedule' ? 'is-active' : ''}`}
                onClick={() => setView('schedule')}
              >
                <CalendarRange size={14} />
                {t.staff.schedule}
              </button>
              <button
                className={`admin__tab ${view === 'services' ? 'is-active' : ''}`}
                onClick={() => setView('services')}
              >
                <Sparkles size={14} />
                {t.staff.myServices}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div className="portal__load glass">
              <Activity size={18} />
              <div>
                <strong>{load}%</strong>
                <span>{t.staff.load}</span>
              </div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {loading && <p className="portal__loading">{t.admin.loading}</p>}
        {error && <p className="portal__error">{error}</p>}

        {!loading && view === 'day' && (
          <>
            <div className="admin__filters">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {formatDayLabel(date, locale)} · {hoursLabel}
              </span>
              <button
                className={`btn ${fullDayOff ? 'btn-primary' : 'btn-ghost'}`}
                disabled={busyAction}
                onClick={() => void toggleFullDay(date)}
              >
                {fullDayOff ? t.staff.fullDayOff : t.staff.clickToClose}
              </button>
            </div>

            <p className="portal__hint" style={{ marginBottom: '1rem' }}>
              {t.staff.slotHint}
            </p>

            {!isWorkingDay && !fullDayOff && (
              <p className="portal__error" style={{ marginBottom: '1rem' }}>
                {t.staff.dayOff} — {locale === 'ru' ? 'в недельном графике этот день выключен' : 'dieser Wochentag ist im Plan aus'}
              </p>
            )}

            <div className="portal__grid">
              <section className="portal__panel glass-strong">
                <div className="portal__panel-head">
                  <Clock3 size={18} />
                  <h2>{t.staff.today}</h2>
                </div>
                <div className="portal__slots">
                  {SLOT_TIMES.map((slot) => {
                    const state = slotStates.get(slot) ?? { kind: 'open' as const }
                    const closed =
                      state.kind === 'busy' || state.kind === 'blocked' || state.kind === 'dayoff'
                    const label =
                      state.kind === 'busy'
                        ? t.staff.busy
                        : state.kind === 'open'
                          ? t.staff.clickToClose
                          : t.staff.clickToOpen
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`portal__slot ${closed ? 'is-closed' : 'is-open'}`}
                        disabled={state.kind === 'busy' || busyAction}
                        onClick={() => void toggleSlot(slot)}
                        title={label}
                      >
                        <span>{slot}</span>
                        <em>{label}</em>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="portal__panel glass-strong">
                <div className="portal__panel-head staff-clients-head">
                  <div className="staff-clients-head__title">
                    <Users size={18} />
                    <h2>{t.staff.clients}</h2>
                  </div>
                  <div className="staff-clients-scope" role="group" aria-label={t.staff.clients}>
                    <button
                      type="button"
                      className={`staff-clients-scope__btn ${clientsScope === 'day' ? 'is-active' : ''}`}
                      onClick={() => setClientsScope('day')}
                    >
                      {t.staff.clientsDay}
                    </button>
                    <button
                      type="button"
                      className={`staff-clients-scope__btn ${clientsScope === 'all' ? 'is-active' : ''}`}
                      onClick={() => setClientsScope('all')}
                    >
                      {t.staff.clientsAll}
                    </button>
                  </div>
                </div>
                <div className="portal__bookings staff-clients-list">
                  {allLoading && clientsScope === 'all' && (
                    <p className="portal__loading">{t.admin.loading}</p>
                  )}
                  {!allLoading && clientBookings.length === 0 && <p className="portal__empty">—</p>}

                  {clientsScope === 'day' &&
                    todayBookings.map((b, i) => {
                      const time = toTimeStr(new Date(b.startsAt))
                      const actionable = b.status === 'confirmed' || b.status === 'pending'
                      return (
                        <motion.article
                          key={b.id}
                          className={`portal__booking ${noteClientId === b.client.id ? 'is-selected' : ''}`}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          onClick={() => setNoteClientId(b.client.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="portal__booking-time">{time}</div>
                          <div>
                            <strong>
                              {b.client.name}
                              {b.client.isGuest ? (
                                <em className="admin__guest-tag"> · {t.staff.walkInGuest}</em>
                              ) : null}
                            </strong>
                            <p>{b.service.name[locale]}</p>
                            {(b.notes || b.client.allergies) && (
                              <span className="portal__hint">{b.notes || b.client.allergies}</span>
                            )}
                            {actionable && (
                              <div className="portal__actions">
                                <button
                                  className="btn btn-green"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void patchBooking(b.id, 'COMPLETED')
                                  }}
                                >
                                  {t.staff.complete}
                                </button>
                                <button
                                  className="btn btn-ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void patchBooking(b.id, 'NO_SHOW')
                                  }}
                                >
                                  {t.staff.noshow}
                                </button>
                                <button
                                  className="btn btn-ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCancelId(b.id)
                                  }}
                                >
                                  {t.client.cancel}
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.article>
                      )
                    })}

                  {clientsScope === 'all' &&
                    !allLoading &&
                    clientBookingsGrouped?.map((group) => (
                      <div key={group.day} className="staff-clients-day">
                        <p className="staff-clients-day__label">{formatDayLabel(group.day, locale)}</p>
                        {group.items.map((b) => {
                          const time = toTimeStr(new Date(b.startsAt))
                          const actionable = b.status === 'confirmed' || b.status === 'pending'
                          return (
                            <article
                              key={b.id}
                              className={`portal__booking ${noteClientId === b.client.id ? 'is-selected' : ''}`}
                              onClick={() => setNoteClientId(b.client.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="portal__booking-time">{time}</div>
                              <div>
                                <strong>
                                  {b.client.name}
                                  {b.client.isGuest ? (
                                    <em className="admin__guest-tag"> · {t.staff.walkInGuest}</em>
                                  ) : null}
                                </strong>
                                <p>{b.service.name[locale]}</p>
                                <span className="portal__hint">{b.status}</span>
                                {(b.notes || b.client.allergies) && (
                                  <span className="portal__hint">{b.notes || b.client.allergies}</span>
                                )}
                                {actionable && (
                                  <div className="portal__actions">
                                    <button
                                      className="btn btn-green"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void patchBooking(b.id, 'COMPLETED')
                                      }}
                                    >
                                      {t.staff.complete}
                                    </button>
                                    <button
                                      className="btn btn-ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void patchBooking(b.id, 'NO_SHOW')
                                      }}
                                    >
                                      {t.staff.noshow}
                                    </button>
                                    <button
                                      className="btn btn-ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setCancelId(b.id)
                                      }}
                                    >
                                      {t.client.cancel}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    ))}
                </div>
              </section>

              <section className="portal__panel glass-strong portal__panel--wide">
                <div className="portal__panel-head">
                  <NotebookPen size={18} />
                  <h2>{t.staff.notes}</h2>
                </div>
                <p className="portal__hint" style={{ marginBottom: '0.75rem' }}>
                  {!noteClientId
                    ? t.staff.selectClient
                    : noteIsGuest
                      ? t.staff.guestNoNotes
                      : (noteTarget?.name ?? noteClientId)}
                </p>
                <textarea
                  className="portal__notes"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  disabled={noteIsGuest || !noteClientId}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => void saveNote()}
                  disabled={noteIsGuest || !noteClientId}
                >
                  {t.admin.save}
                </button>
              </section>
            </div>
          </>
        )}

        {!loading && view === 'schedule' && (
          <div className="portal__grid">
            <section className="portal__panel glass-strong">
              <div className="portal__panel-head">
                <CalendarRange size={18} />
                <h2>{t.staff.weekHours}</h2>
              </div>
              <div className="staff-week">
                {WEEK_ORDER.map((dayOfWeek) => {
                  const h = hoursDraft.find((x) => x.dayOfWeek === dayOfWeek) ?? {
                    dayOfWeek,
                    startTime: '08:00',
                    endTime: '19:30',
                    enabled: false,
                  }
                  return (
                    <div key={dayOfWeek} className="staff-week__row">
                      <label className="staff-week__day">
                        <input
                          type="checkbox"
                          checked={h.enabled}
                          onChange={(e) =>
                            setHoursDraft((prev) => {
                              const exists = prev.some((x) => x.dayOfWeek === dayOfWeek)
                              if (!exists) {
                                return [
                                  ...prev,
                                  {
                                    dayOfWeek,
                                    startTime: '08:00',
                                    endTime: '19:30',
                                    enabled: e.target.checked,
                                  },
                                ]
                              }
                              return prev.map((x) =>
                                x.dayOfWeek === dayOfWeek
                                  ? { ...x, enabled: e.target.checked }
                                  : x,
                              )
                            })
                          }
                        />
                        <span>{dayLabels[dayOfWeek]}</span>
                      </label>
                      <input
                        type="time"
                        disabled={!h.enabled}
                        value={h.startTime}
                        onChange={(e) =>
                          setHoursDraft((prev) =>
                            prev.map((x) =>
                              x.dayOfWeek === dayOfWeek
                                ? { ...x, startTime: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <span className="staff-week__dash">–</span>
                      <input
                        type="time"
                        disabled={!h.enabled}
                        value={h.endTime}
                        onChange={(e) =>
                          setHoursDraft((prev) =>
                            prev.map((x) =>
                              x.dayOfWeek === dayOfWeek ? { ...x, endTime: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>
                  )
                })}
                <div className="admin__form-actions">
                  <button className="btn btn-primary" onClick={() => void saveSchedule()}>
                    {t.admin.save}
                  </button>
                </div>
              </div>
            </section>

            <section className="portal__panel glass-strong">
              <div className="portal__panel-head">
                <CalendarRange size={18} />
                <h2>{t.staff.monthOff}</h2>
              </div>
              <p className="portal__hint" style={{ marginBottom: '1rem' }}>
                {t.staff.monthHint}
              </p>
              <div className="staff-cal__nav">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                >
                  ‹
                </button>
                <strong className="serif">{monthTitle(calendarMonth, locale)}</strong>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                >
                  ›
                </button>
              </div>
              <div className="staff-month staff-month--calendar">
                {headLabels.map((label) => (
                  <div key={label} className="staff-month__head">
                    {label}
                  </div>
                ))}
                {calendarCells.map((cell, i) => {
                  if (!cell) {
                    return <div key={`empty-${i}`} className="staff-month__day is-empty" />
                  }
                  const { date: day } = cell
                  const off = dayOffIds.has(day)
                  const dow = dayStart(day).getDay()
                  const inWeekPlan = hoursDraft.some((h) => h.dayOfWeek === dow && h.enabled)
                  const isToday = day === today
                  const isPast = day < today
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`staff-month__day ${off ? 'is-off' : ''} ${!inWeekPlan ? 'is-weekend' : ''} ${isToday ? 'is-today' : ''}`}
                      disabled={busyAction || isPast}
                      onClick={() => void toggleFullDay(day)}
                    >
                      <strong>{Number(day.slice(8))}</strong>
                      <span>{off ? t.staff.dayOff : ''}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {!loading && view === 'services' && (
          <section className="portal__panel glass-strong">
            <div className="portal__panel-head">
              <Sparkles size={18} />
              <h2>{t.staff.myServices}</h2>
            </div>
            <p className="portal__hint" style={{ marginBottom: '1.25rem' }}>
              {t.staff.myServicesHint}
            </p>
            <div className="admin__checkboxes">
              {catalog.map((s) => (
                <label key={s.id} className="admin__check">
                  <input
                    type="checkbox"
                    checked={specialtyIds.includes(s.id)}
                    onChange={() => toggleSpecialty(s.id)}
                  />
                  <span>
                    {s.name[locale]}
                    <em style={{ display: 'block', opacity: 0.65, fontStyle: 'normal', fontSize: '0.8rem' }}>
                      €{s.price} · {s.duration} min
                    </em>
                  </span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busyAction}
                onClick={() => void saveServices()}
              >
                {t.admin.save}
              </button>
            </div>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={cancelId !== null}
        title={t.staff.confirmCancelTitle}
        body={t.staff.confirmCancelBody}
        confirmLabel={t.staff.confirmCancelYes}
        cancelLabel={t.staff.confirmCancelNo}
        busy={cancelBusy}
        onClose={() => setCancelId(null)}
        onConfirm={() => void confirmCancelBooking()}
      />
    </main>
  )
}
