import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarPlus, Scissors, UserRound } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { api, ApiError } from '../../lib/api'
import { addDays, localDateTime, salonDayOfWeek, todayISO } from '../../lib/datetime'
import { DatePicker } from '../booking/DatePicker'
import { useToast } from '../ui/Toast'

type MasterRow = {
  id: string
  name: string
  image: string
  specialties: string[]
  isActive: boolean
}

type ServiceRow = {
  id: string
  name: { ru: string; de: string }
  price: number
  duration: number
  isActive: boolean
  masterIds?: string[]
}

type Mode = 'staff' | 'services'
type Step = 'pick' | 'time' | 'service' | 'master' | 'client'

const MASTER_PLACEHOLDER = '/placeholder-master.svg'

function nextWorkingDate(workingDays: number[], fromDate = todayISO()) {
  let cur = fromDate
  for (let i = 0; i < 60; i++) {
    if (workingDays.includes(salonDayOfWeek(cur))) return cur
    cur = addDays(cur, 1)
  }
  return fromDate
}

function bookingError(
  message: string,
  labels: {
    closedDay: string
    slotTaken: string
    slotBlocked: string
    outsideHours: string
  },
) {
  if (message === 'DAY_OFF') return labels.closedDay
  if (message === 'SLOT_TAKEN') return labels.slotTaken
  if (message === 'SLOT_BLOCKED') return labels.slotBlocked
  if (message === 'OUTSIDE_HOURS') return labels.outsideHours
  return message
}

type Props = {
  masters: MasterRow[]
  services: ServiceRow[]
  onCreated: () => void | Promise<void>
}

export function AdminQuickBook({ masters, services, onCreated }: Props) {
  const { t, locale } = useLang()
  const toast = useToast()

  const [mode, setMode] = useState<Mode>('staff')
  const [step, setStep] = useState<Step>('pick')
  const [masterId, setMasterId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [slot, setSlot] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [dayOff, setDayOff] = useState(false)
  const [workingDays, setWorkingDays] = useState<number[] | undefined>()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const activeMasters = useMemo(() => masters.filter((m) => m.isActive), [masters])
  const activeServices = useMemo(() => services.filter((s) => s.isActive), [services])

  const master = activeMasters.find((m) => m.id === masterId)
  const service = activeServices.find((s) => s.id === serviceId)

  const servicesForMaster = useMemo(() => {
    if (!masterId) return activeServices
    return activeServices.filter(
      (s) =>
        master?.specialties.includes(s.id) ||
        (s.masterIds?.length ? s.masterIds.includes(masterId) : false),
    )
  }, [activeServices, master, masterId])

  const mastersForService = useMemo(() => {
    if (!serviceId) return activeMasters
    return activeMasters.filter(
      (m) =>
        m.specialties.includes(serviceId) ||
        (activeServices.find((s) => s.id === serviceId)?.masterIds ?? []).includes(m.id),
    )
  }, [activeMasters, activeServices, serviceId])

  const resetFlow = (nextMode?: Mode) => {
    if (nextMode) setMode(nextMode)
    setStep('pick')
    setMasterId('')
    setServiceId('')
    setDate(todayISO())
    setSlot('')
    setSlots([])
    setDayOff(false)
    setWorkingDays(undefined)
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setNotes('')
  }

  const goBack = () => {
    if (mode === 'staff') {
      if (step === 'client') setStep('service')
      else if (step === 'service') setStep('time')
      else if (step === 'time') {
        setMasterId('')
        setSlot('')
        setStep('pick')
      }
    } else {
      if (step === 'client') setStep('time')
      else if (step === 'time') {
        setMasterId('')
        setSlot('')
        setStep('master')
      } else if (step === 'master') {
        setServiceId('')
        setStep('pick')
      }
    }
  }

  useEffect(() => {
    if (!masterId) {
      setWorkingDays(undefined)
      return
    }
    let cancelled = false
    void api<{ workingDays: number[] }>(`/masters/${masterId}/hours`, { auth: false })
      .then((r) => {
        if (cancelled) return
        setWorkingDays(r.workingDays)
        if (!r.workingDays.includes(salonDayOfWeek(date))) {
          setDate(nextWorkingDate(r.workingDays))
          setSlot('')
        }
      })
      .catch(() => {
        if (!cancelled) setWorkingDays(undefined)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterId])

  // Slots: with service use its duration; before service (staff path) use 30 min probe
  useEffect(() => {
    const needSlots =
      !!masterId &&
      !!date &&
      (step === 'time' || step === 'service' || step === 'client')
    if (!needSlots) {
      setSlots([])
      setDayOff(false)
      return
    }
    if (workingDays && !workingDays.includes(salonDayOfWeek(date))) {
      setSlots([])
      setDayOff(true)
      setSlot('')
      return
    }
    let cancelled = false
    const q = serviceId
      ? `date=${date}&serviceId=${serviceId}`
      : `date=${date}&duration=30`
    void api<{ slots: string[]; dayOff?: boolean }>(`/masters/${masterId}/slots?${q}`, {
      auth: false,
    })
      .then((r) => {
        if (cancelled) return
        setSlots(r.slots)
        setDayOff(!!r.dayOff)
        setSlot((prev) => (r.slots.includes(prev) ? prev : ''))
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([])
          setDayOff(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [masterId, serviceId, date, workingDays, step])

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !serviceId || !masterId || !date || !slot) {
      toast.push(t.admin.pickSlotFirst, 'err')
      return
    }
    if (dayOff || !slots.includes(slot)) {
      toast.push(dayOff ? t.admin.closedDay : t.admin.slotTaken, 'err')
      return
    }
    setBusy(true)
    try {
      const startsAt = localDateTime(date, slot).toISOString()
      await api('/admin/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId,
          masterId,
          startsAt,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      toast.push(t.admin.bookingCreated)
      resetFlow(mode)
      await onCreated()
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? bookingError(e.message, {
              closedDay: t.admin.closedDay,
              slotTaken: t.admin.slotTaken,
              slotBlocked: t.admin.slotBlocked,
              outsideHours: t.admin.outsideHours,
            })
          : t.admin.error
      toast.push(msg, 'err')
    } finally {
      setBusy(false)
    }
  }

  const showBack = step !== 'pick'

  return (
    <div className="admin-quickbook">
      <div className="admin-quickbook__intro">
        <div>
          <p className="eyebrow">
            <CalendarPlus size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
            {t.admin.quickBook}
          </p>
          <h2 className="portal__panel-title display" style={{ margin: '0.35rem 0 0.4rem' }}>
            {t.admin.walkInTitle}
          </h2>
          <p className="portal__hint" style={{ margin: 0 }}>
            {t.admin.walkInHint}
          </p>
        </div>
        <div className="admin-quickbook__modes">
          <button
            type="button"
            className={`btn ${mode === 'staff' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => resetFlow('staff')}
          >
            <UserRound size={16} />
            {t.admin.staff}
          </button>
          <button
            type="button"
            className={`btn ${mode === 'services' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => resetFlow('services')}
          >
            <Scissors size={16} />
            {t.admin.services}
          </button>
        </div>
      </div>

      {showBack && (
        <button type="button" className="btn btn-ghost" onClick={goBack} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} />
          {t.admin.back}
        </button>
      )}

      {step === 'pick' && mode === 'staff' && (
        <div className="admin-quickbook__grid">
          {activeMasters.map((m) => (
            <button
              key={m.id}
              type="button"
              className="admin-quickbook__card"
              onClick={() => {
                setMasterId(m.id)
                setServiceId('')
                setSlot('')
                setStep('time')
              }}
            >
              <img src={m.image || MASTER_PLACEHOLDER} alt="" />
              <strong>{m.name}</strong>
            </button>
          ))}
          {activeMasters.length === 0 && <p className="portal__hint">{t.admin.empty}</p>}
        </div>
      )}

      {step === 'pick' && mode === 'services' && (
        <div className="admin-quickbook__list">
          {activeServices.map((s) => (
            <button
              key={s.id}
              type="button"
              className="admin-quickbook__row"
              onClick={() => {
                setServiceId(s.id)
                setMasterId('')
                setSlot('')
                setStep('master')
              }}
            >
              <span>
                <strong>{s.name[locale]}</strong>
                <em>
                  {s.duration} {locale === 'ru' ? 'мин' : 'Min'} · {s.price.toFixed(0)} €
                </em>
              </span>
            </button>
          ))}
          {activeServices.length === 0 && <p className="portal__hint">{t.admin.empty}</p>}
        </div>
      )}

      {step === 'master' && mode === 'services' && (
        <div>
          <p className="portal__hint" style={{ marginBottom: '0.85rem' }}>
            {service?.name[locale]} — {t.admin.pickMaster}
          </p>
          <div className="admin-quickbook__grid">
            {mastersForService.map((m) => (
              <button
                key={m.id}
                type="button"
                className="admin-quickbook__card"
                onClick={() => {
                  setMasterId(m.id)
                  setSlot('')
                  setStep('time')
                }}
              >
                <img src={m.image || MASTER_PLACEHOLDER} alt="" />
                <strong>{m.name}</strong>
              </button>
            ))}
            {mastersForService.length === 0 && (
              <p className="portal__hint">{t.admin.pickServiceMaster}</p>
            )}
          </div>
        </div>
      )}

      {step === 'time' && master && (
        <div className="admin__walkin-schedule">
          <span>
            {t.admin.pickDate} · {master.name}
            {service ? ` · ${service.name[locale]}` : ''}
          </span>
          <DatePicker
            value={date}
            onChange={(d) => {
              setDate(d)
              setSlot('')
            }}
            locale={locale}
            calendarLabel={t.booking.calendar}
            masterName={master.name}
            withMasterLabel={t.booking.withMaster}
            workingDays={workingDays}
            closedLabel={t.booking.closedDay}
          />
          {dayOff ? (
            <p className="admin__slot-empty">{t.admin.closedDay}</p>
          ) : slots.length === 0 ? (
            <p className="admin__slot-empty">{t.admin.noSlots}</p>
          ) : (
            <div className="admin__slot-grid">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`admin__slot ${slot === s ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSlot(s)
                    if (mode === 'staff') setStep('service')
                    else setStep('client')
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'service' && mode === 'staff' && (
        <div>
          <p className="portal__hint" style={{ marginBottom: '0.85rem' }}>
            {master?.name} · {date} {slot} — {t.admin.pickService}
          </p>
          <div className="admin-quickbook__list">
            {servicesForMaster.map((s) => (
              <button
                key={s.id}
                type="button"
                className="admin-quickbook__row"
                onClick={() => {
                  setServiceId(s.id)
                  setStep('client')
                }}
              >
                <span>
                  <strong>{s.name[locale]}</strong>
                  <em>
                    {s.duration} {locale === 'ru' ? 'мин' : 'Min'} · {s.price.toFixed(0)} €
                  </em>
                </span>
              </button>
            ))}
            {servicesForMaster.length === 0 && <p className="portal__hint">{t.admin.empty}</p>}
          </div>
        </div>
      )}

      {step === 'client' && (
        <form
          className="admin__form"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <p className="portal__hint">
            {master?.name}
            {service ? ` · ${service.name[locale]}` : ''} · {date} {slot}
          </p>
          <div className="admin__form-grid admin__form-grid--2">
            <label>
              {t.admin.firstName}
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label>
              {t.admin.lastName}
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>
          <div className="admin__form-grid admin__form-grid--2">
            <label>
              {t.admin.email} ({t.admin.optional})
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label>
              {t.admin.phone} ({t.admin.optional})
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>
          <label>
            {t.admin.bookingNotes}
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t.admin.loading : t.admin.bookWalkIn}
          </button>
        </form>
      )}
    </div>
  )
}
