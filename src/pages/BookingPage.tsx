import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError, type AuthUser } from '../lib/api'
import { Footer } from '../components/Footer'
import { Modal } from '../components/ui/Modal'
import { DatePicker } from '../components/booking/DatePicker'
import './BookingPage.css'
import './Portal.css'

type Service = {
  id: string
  categoryId: string
  name: { ru: string; de: string }
  description: { ru: string; de: string }
  price: number
  duration: number
  image: string
}

type Master = {
  id: string
  name: string
  role: { ru: string; de: string }
  image: string
  specialties: string[]
}

type Category = {
  id: string
  slug: string
  icon: string
  name: { ru: string; de: string }
}

type ActivePromo = {
  id: string
  discountPct: number | null
  serviceIds: string[]
}

type ContactForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

function discountedPrice(original: number, pct: number) {
  return Math.round((original * (100 - pct)) / 100)
}

function promoForService(serviceId: string, promos: ActivePromo[]) {
  let best = 0
  for (const p of promos) {
    const pct = p.discountPct ?? 0
    if (pct <= 0) continue
    if (p.serviceIds.length === 0 || p.serviceIds.includes(serviceId)) {
      best = Math.max(best, pct)
    }
  }
  return best > 0 ? best : null
}

function ServicePrice({
  price,
  duration,
  discountPct,
}: {
  price: number
  duration?: number
  discountPct: number | null
}) {
  if (discountPct) {
    const next = discountedPrice(price, discountPct)
    return (
      <span className="booking__price">
        <s className="booking__price-old">€{price}</s>
        <strong className="booking__price-new">€{next}</strong>
        <span className="booking__price-badge">−{discountPct}%</span>
        {duration != null && <span className="booking__price-dur">· {duration} min</span>}
      </span>
    )
  }
  return (
    <span className="booking__price">
      €{price}
      {duration != null && <span className="booking__price-dur"> · {duration} min</span>}
    </span>
  )
}

function defaultDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0) d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function contactComplete(c: ContactForm) {
  return (
    c.firstName.trim().length > 0 &&
    c.lastName.trim().length > 0 &&
    c.email.trim().includes('@') &&
    c.phone.trim().length >= 5
  )
}

export function BookingPage() {
  const { t, locale } = useLang()
  const { user, acceptSession, refresh } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialMaster = params.get('master') ?? ''
  const initialService = params.get('service') ?? ''
  /** From masters CTA → master first; from services / default → service first */
  const masterFirst = Boolean(initialMaster) && !initialService
  const [step, setStep] = useState(() => {
    if (initialMaster && initialService) return 2
    if (initialMaster || initialService) return 1
    return 0
  })
  const [services, setServices] = useState<Service[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [promos, setPromos] = useState<ActivePromo[]>([])
  const [serviceId, setServiceId] = useState(initialService)
  const [masterId, setMasterId] = useState(initialMaster)
  const [browseCategoryId, setBrowseCategoryId] = useState('')
  const [browseMasterId, setBrowseMasterId] = useState('')
  const [detailService, setDetailService] = useState<Service | null>(null)
  const [date, setDate] = useState(defaultDate())
  const [slot, setSlot] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [workingDays, setWorkingDays] = useState<number[] | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contact, setContact] = useState<ContactForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    void Promise.all([
      api<Service[]>('/services', { auth: false }),
      api<Master[]>('/masters', { auth: false }),
      api<Category[]>('/categories', { auth: false }),
      api<ActivePromo[]>('/promos/active', { auth: false }),
    ]).then(([s, m, c, p]) => {
      setServices(s)
      setMasters(m)
      setCategories(c)
      setPromos(p)
    })
  }, [])

  useEffect(() => {
    if (user?.role === 'CLIENT') {
      setContact((prev) => ({
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }))
      if (!user.phone) setShowContact(true)
    }
  }, [user])

  useEffect(() => {
    if (!masterId) {
      setWorkingDays(undefined)
      return
    }
    void api<{ workingDays: number[] }>(`/masters/${masterId}/hours`, { auth: false }).then(
      (r) => {
        setWorkingDays(r.workingDays)
        const selected = new Date(`${date}T12:00:00`)
        if (!r.workingDays.includes(selected.getDay())) {
          const start = new Date()
          start.setHours(12, 0, 0, 0)
          for (let i = 0; i < 28; i++) {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            if (r.workingDays.includes(d.getDay())) {
              const y = d.getFullYear()
              const m = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              setDate(`${y}-${m}-${day}`)
              break
            }
          }
        }
      },
    )
  }, [masterId])

  useEffect(() => {
    if (!masterId || !serviceId || !date) return
    void api<{ slots: string[] }>(
      `/masters/${masterId}/slots?date=${date}&serviceId=${serviceId}`,
      { auth: false },
    ).then((r) => {
      setSlots(r.slots)
      setSlot('')
    })
  }, [masterId, serviceId, date])

  const filteredMasters = useMemo(() => {
    if (!serviceId) return masters
    return masters.filter((m) => m.specialties.includes(serviceId))
  }, [serviceId, masters])

  const filteredServices = useMemo(() => {
    if (!masterId) return services
    const master = masters.find((m) => m.id === masterId)
    if (!master) return services
    return services.filter((s) => master.specialties.includes(s.id))
  }, [masterId, masters, services])

  const selectedService = services.find((s) => s.id === serviceId)
  const selectedMaster = masters.find((m) => m.id === masterId)
  const selectedDiscount = selectedService
    ? promoForService(selectedService.id, promos)
    : null


  const steps = masterFirst
    ? [t.booking.stepMaster, t.booking.stepService, t.booking.step3, t.booking.step4]
    : [t.booking.stepService, t.booking.stepMaster, t.booking.step3, t.booking.step4]

  const canNext =
    (step === 0 && (masterFirst ? !!masterId : !!serviceId)) ||
    (step === 1 && (masterFirst ? !!serviceId : !!masterId)) ||
    (step === 2 && !!slot) ||
    step === 3

  const pickMaster = (id: string) => {
    setMasterId(id)
    const master = masters.find((m) => m.id === id)
    if (serviceId && master && !master.specialties.includes(serviceId)) {
      setServiceId('')
    }
  }

  const pickService = (id: string) => {
    setServiceId(id)
    if (masterId) {
      const master = masters.find((m) => m.id === masterId)
      if (master && !master.specialties.includes(id)) {
        setMasterId('')
      }
    }
  }

  const showMasterStep = masterFirst ? step === 0 : step === 1
  const showServiceStep = masterFirst ? step === 1 : step === 0
  const mastersForPick = serviceId ? filteredMasters : masters

  const servicesForPick = useMemo(() => {
    let list = masterId ? filteredServices : services
    if (browseCategoryId) {
      list = list.filter((s) => s.categoryId === browseCategoryId)
    }
    if (!masterId && browseMasterId) {
      const master = masters.find((m) => m.id === browseMasterId)
      if (master) {
        list = list.filter((s) => master.specialties.includes(s.id))
      }
    }
    return list
  }, [masterId, filteredServices, services, browseCategoryId, browseMasterId, masters])

  const needsContact =
    showContact ||
    !user ||
    (user.role === 'CLIENT' && (!user.phone || !user.firstName || !user.lastName))

  const placeBooking = async () => {
    setBusy(true)
    setError('')
    try {
      const startsAt = new Date(`${date}T${slot}:00`)

      if (user?.role === 'CLIENT') {
        if (needsContact) {
          if (!contactComplete(contact)) {
            setError(t.booking.contactHint)
            setShowContact(true)
            return
          }
          await api('/me', {
            method: 'PATCH',
            body: JSON.stringify({
              firstName: contact.firstName.trim(),
              lastName: contact.lastName.trim(),
              phone: contact.phone.trim(),
            }),
          })
          await refresh()
        }

        await api('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            serviceId,
            masterId,
            startsAt: startsAt.toISOString(),
            notes: notes.trim() || undefined,
          }),
        })
        setDone(true)
        return
      }

      if (!contactComplete(contact)) {
        setError(t.booking.contactHint)
        setShowContact(true)
        return
      }

      const data = await api<{ token: string; user: AuthUser }>('/bookings/guest', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          serviceId,
          masterId,
          startsAt: startsAt.toISOString(),
          notes: notes.trim() || undefined,
          firstName: contact.firstName.trim(),
          lastName: contact.lastName.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          locale,
        }),
      })
      acceptSession(data.token, data.user)
      setDone(true)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Error'
      if (msg === 'EMAIL_EXISTS') {
        setError(t.booking.emailExists)
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (user && user.role !== 'CLIENT') {
      setError(t.booking.clientsOnly)
      return
    }

    if (!user) {
      if (!showContact) {
        setAuthModalOpen(true)
        return
      }
      await placeBooking()
      return
    }

    await placeBooking()
  }

  return (
    <main className="booking page-enter page-shell">
      <div className="page-shell__main page-shell__main--top">
      <div className="booking__wrap">
        <header className="booking__head">
          <p className="eyebrow">{t.booking.eyebrow}</p>
          <h1 className="booking__title display">{t.booking.title}</h1>
          <div className="booking__steps">
            {steps.map((label, i) => (
              <button
                key={label}
                className={`booking__step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}
                onClick={() => i <= step && setStep(i)}
              >
                <span>{i + 1}</span>
                {label}
              </button>
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key={step}
              className="booking__panel glass-strong"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {showServiceStep && (
                <div className="booking__service-step">
                  <div className="booking__filters">
                    <div className="booking__filter-row">
                      <span className="booking__filter-label">{t.booking.filterCategory}</span>
                      <div className="booking__filter-chips" role="group" aria-label={t.booking.filterCategory}>
                        <button
                          type="button"
                          className={`booking__chip ${!browseCategoryId ? 'is-active' : ''}`}
                          onClick={() => setBrowseCategoryId('')}
                        >
                          {t.booking.allCategories}
                        </button>
                        {categories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`booking__chip ${browseCategoryId === c.id ? 'is-active' : ''}`}
                            onClick={() => setBrowseCategoryId(c.id)}
                          >
                            {c.icon ? <span className="booking__chip-icon">{c.icon}</span> : null}
                            {c.name[locale]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {!masterId && (
                      <div className="booking__filter-row">
                        <span className="booking__filter-label">{t.booking.filterMaster}</span>
                        <div className="booking__filter-chips" role="group" aria-label={t.booking.filterMaster}>
                          <button
                            type="button"
                            className={`booking__chip ${!browseMasterId ? 'is-active' : ''}`}
                            onClick={() => setBrowseMasterId('')}
                          >
                            {t.booking.allMasters}
                          </button>
                          {masters.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className={`booking__chip booking__chip--master ${browseMasterId === m.id ? 'is-active' : ''}`}
                              onClick={() => setBrowseMasterId(m.id)}
                            >
                              <img src={m.image} alt="" className="booking__chip-avatar" />
                              {m.name.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="booking__grid">
                    {servicesForPick.length === 0 && (
                      <p className="booking__no-slots">{t.booking.emptyServices}</p>
                    )}
                    {servicesForPick.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`booking__service ${serviceId === s.id ? 'is-selected' : ''}`}
                        onClick={() => setDetailService(s)}
                      >
                        <img src={s.image} alt="" />
                        <div>
                          <strong className="serif">{s.name[locale]}</strong>
                          <ServicePrice
                            price={s.price}
                            duration={s.duration}
                            discountPct={promoForService(s.id, promos)}
                          />
                          <em className="booking__service-hint">{t.booking.viewDetails}</em>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showMasterStep && (
                <div className="booking__masters">
                  {mastersForPick.map((m) => (
                    <button
                      key={m.id}
                      className={`booking__master ${masterId === m.id ? 'is-selected' : ''}`}
                      onClick={() => pickMaster(m.id)}
                    >
                      <img src={m.image} alt={m.name} />
                      <div>
                        <strong className="serif">{m.name}</strong>
                        <span>{m.role[locale]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="booking__slots">
                  <DatePicker
                    value={date}
                    onChange={setDate}
                    locale={locale}
                    calendarLabel={t.booking.calendar}
                    masterName={selectedMaster?.name}
                    withMasterLabel={t.booking.withMaster}
                    workingDays={workingDays}
                    closedLabel={t.booking.closedDay}
                  />
                  <div className="booking__slot-grid">
                    {slots.length === 0 && <p className="booking__no-slots">{t.booking.noSlots}</p>}
                    {slots.map((time) => (
                      <button
                        key={time}
                        className={`booking__slot ${slot === time ? 'is-selected' : ''}`}
                        onClick={() => setSlot(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="booking__confirm">
                  <div className="booking__summary">
                    <img src={selectedService?.image} alt="" />
                    <div>
                      <h3 className="serif">{selectedService?.name[locale]}</h3>
                      <p>
                        {selectedMaster?.name} · {date} · {slot}
                      </p>
                      {selectedService && (
                        <ServicePrice
                          price={selectedService.price}
                          discountPct={selectedDiscount}
                        />
                      )}
                    </div>
                  </div>

                  {(showContact || (user?.role === 'CLIENT' && !user.phone)) && (
                    <div className="booking__contact">
                      <h4 className="booking__contact-title">{t.booking.contactTitle}</h4>
                      <p className="booking__contact-hint">{t.booking.contactHint}</p>
                      <div className="booking__contact-grid portal-form">
                        <label>
                          {t.booking.firstName}
                          <input
                            value={contact.firstName}
                            onChange={(e) =>
                              setContact({ ...contact, firstName: e.target.value })
                            }
                            required
                          />
                        </label>
                        <label>
                          {t.booking.lastName}
                          <input
                            value={contact.lastName}
                            onChange={(e) =>
                              setContact({ ...contact, lastName: e.target.value })
                            }
                            required
                          />
                        </label>
                        {!user && (
                          <label>
                            {t.booking.email}
                            <input
                              type="email"
                              value={contact.email}
                              onChange={(e) =>
                                setContact({ ...contact, email: e.target.value })
                              }
                              required
                            />
                          </label>
                        )}
                        <label>
                          {t.booking.phone}
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={(e) =>
                              setContact({ ...contact, phone: e.target.value })
                            }
                            required
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <label className="portal-form booking__notes">
                    {t.booking.comment}
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.booking.commentPh}
                    />
                  </label>
                  {error && <p className="login__error">{error}</p>}
                  <p className="booking__note">{t.booking.noteLoggedIn}</p>
                </div>
              )}

              <div className="booking__nav">
                <button
                  className="btn btn-ghost"
                  disabled={step === 0}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  <ChevronLeft size={16} />
                  {t.booking.back}
                </button>
                {step < 3 ? (
                  <button
                    className="btn btn-primary"
                    disabled={!canNext}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    {t.booking.next}
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button className="btn btn-primary" disabled={busy} onClick={() => void confirm()}>
                    {t.booking.confirm}
                    <Check size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              className="booking__success glass-strong"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="booking__success-icon">
                <Check size={28} />
              </div>
              <h2 className="display">{t.booking.success}</h2>
              <p>{t.booking.successBody}</p>
              <div className="booking__success-actions">
                <Link to="/cabinet" className="btn btn-primary">
                  {t.nav.cabinet}
                </Link>
                <Link to="/" className="btn btn-ghost">
                  AN.Beauty
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>

      <Modal
        open={authModalOpen}
        title={t.booking.authTitle}
        onClose={() => setAuthModalOpen(false)}
      >
        <p className="booking__auth-body">{t.booking.authBody}</p>
        <div className="booking__auth-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setAuthModalOpen(false)
              navigate('/login', { state: { from: '/booking', mode: 'register' } })
            }}
          >
            {t.booking.authRegister}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setAuthModalOpen(false)
              setShowContact(true)
            }}
          >
            {t.booking.authGuest}
          </button>
        </div>
      </Modal>

      <Modal
        open={!!detailService}
        title={detailService?.name[locale] ?? ''}
        onClose={() => setDetailService(null)}
        wide
      >
        {detailService && (
          <div className="booking__detail">
            <img src={detailService.image} alt="" className="booking__detail-img" />
            <p className="booking__detail-meta">
              <ServicePrice
                price={detailService.price}
                duration={detailService.duration}
                discountPct={promoForService(detailService.id, promos)}
              />
            </p>
            <p className="booking__detail-body">{detailService.description[locale]}</p>
            <div className="booking__detail-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDetailService(null)}
              >
                {t.booking.back}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  pickService(detailService.id)
                  if (!masterId && browseMasterId) {
                    pickMaster(browseMasterId)
                  }
                  setDetailService(null)
                }}
              >
                {t.booking.selectService}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Footer />
    </main>
  )
}
