import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  UserRound,
  Sparkles,
  ArrowUpRight,
  Megaphone,
  NotebookPen,
  Lightbulb,
  LogOut,
} from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError } from '../lib/api'
import { ConfirmDialog } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { Footer } from '../components/Footer'
import { localDateTime, toDateStr, toTimeStr } from '../lib/datetime'
import './CabinetPage.css'
import './Portal.css'

type BookingItem = {
  id: string
  startsAt?: string
  date?: string
  time?: string
  status: string
  notes?: string | null
  service: {
    id: string
    name: { ru: string; de: string }
    image: string
    description?: { ru: string; de: string }
  }
  master: { id: string; name: string }
}

type Profile = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  profile: {
    allergies: string | null
    preferences: string | null
    totalVisits: number
  }
}

type Promo = {
  id: string
  headline: { ru: string; de: string }
  body: { ru: string; de: string }
  discountPct: number | null
}

function bookingWhen(b: BookingItem) {
  if (b.startsAt) {
    const d = new Date(b.startsAt)
    return { date: toDateStr(d), time: toTimeStr(d), sort: d.getTime() }
  }
  return {
    date: b.date ?? '',
    time: b.time ?? '',
    sort: b.date && b.time ? localDateTime(b.date, b.time).getTime() : 0,
  }
}

function tipForService(name: string, locale: 'ru' | 'de') {
  const n = name.toLowerCase()
  if (locale === 'ru') {
    if (n.includes('hydra') || n.includes('пил') || n.includes('peel') || n.includes('лицо')) {
      return 'За сутки до процедуры избегайте активных кислот и ретинола. Приходите без плотного макияжа.'
    }
    if (n.includes('массаж') || n.includes('spa') || n.includes('тело')) {
      return 'Лёгкий ужин и вода в течение дня помогут телу лучше принять ритуал. Одежда — комфортная.'
    }
    if (n.includes('бров') || n.includes('ресниц') || n.includes('lash')) {
      return 'Не наносите масла и тушь в день процедуры. Возьмите солнцезащитные очки на выход.'
    }
    if (n.includes('маникюр') || n.includes('ногт')) {
      return 'Снимите старое покрытие заранее, если возможно. Сообщите мастеру о ломкости ногтей.'
    }
    if (n.includes('инъек') || n.includes('ботокс') || n.includes('морщин')) {
      return 'Исключите алкоголь за сутки. Сообщите о приёме препаратов, разжижающих кровь.'
    }
    return 'Приходите за 5–10 минут. Если есть особенности кожи — напишите примечание мастеру ниже.'
  }
  if (n.includes('hydra') || n.includes('peel') || n.includes('gesicht')) {
    return 'Einen Tag vorher keine starken Säuren/Retinol. Bitte ohne starkes Make-up kommen.'
  }
  if (n.includes('massage') || n.includes('spa') || n.includes('körper')) {
    return 'Leichte Mahlzeit und Wasser am Tag helfen. Bequeme Kleidung ist ideal.'
  }
  if (n.includes('brauen') || n.includes('wimpern') || n.includes('lash')) {
    return 'Am Termin keine Öle/Mascara. Sonnenbrille für danach mitnehmen.'
  }
  if (n.includes('maniküre') || n.includes('nagel')) {
    return 'Altes Gel möglichst vorher entfernen. Brüchige Nägel bitte erwähnen.'
  }
  return 'Bitte 5–10 Minuten früher. Hinweise zur Haut können Sie unten notieren.'
}

export function CabinetPage() {
  const { t, locale } = useLang()
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [items, setItems] = useState<BookingItem[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    allergies: '',
    preferences: '',
  })
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [bookings, me, promoList] = await Promise.all([
        api<BookingItem[]>('/me/bookings'),
        api<Profile>('/me'),
        api<Promo[]>('/promos/active', { auth: false }),
      ])
      setItems(bookings)
      setProfile(me)
      setPromos(promoList)
      setProfileForm({
        firstName: me.firstName,
        lastName: me.lastName,
        phone: me.phone ?? '',
        allergies: me.profile.allergies ?? '',
        preferences: me.profile.preferences ?? '',
      })
      setNoteDrafts(
        Object.fromEntries(bookings.map((b) => [b.id, b.notes ?? ''])),
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const upcoming = useMemo(
    () =>
      items
        .filter((b) => b.status === 'confirmed' || b.status === 'pending')
        .sort((a, b) => bookingWhen(a).sort - bookingWhen(b).sort),
    [items],
  )

  const history = useMemo(
    () =>
      items
        .filter(
          (b) =>
            b.status === 'completed' || b.status === 'cancelled' || b.status === 'no_show',
        )
        .sort((a, b) => bookingWhen(b).sort - bookingWhen(a).sort),
    [items],
  )

  const confirmCancel = async () => {
    if (!cancelId) return
    setCancelBusy(true)
    try {
      await api(`/bookings/${cancelId}/cancel`, { method: 'POST' })
      toast.push(t.client.cancel)
      setCancelId(null)
      await load()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    } finally {
      setCancelBusy(false)
    }
  }

  const reschedule = (b: BookingItem) => {
    navigate(`/booking?service=${b.service.id}&master=${b.master.id}`)
  }

  const saveNote = async (id: string) => {
    setSavingNoteId(id)
    try {
      await api(`/bookings/${id}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: noteDrafts[id] ?? '' }),
      })
      toast.push(t.client.noteSave)
      await load()
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : 'Error', 'err')
    } finally {
      setSavingNoteId(null)
    }
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phone: profileForm.phone || undefined,
          allergies: profileForm.allergies,
          preferences: profileForm.preferences,
        }),
      })
      toast.push(t.admin.save)
      await load()
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Error', 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="cabinet page-enter page-shell">
      <div className="page-shell__main page-shell__main--top">
      <div className="cabinet__wrap">
        {loading && <p className="portal__loading">{t.admin.loading}</p>}
        {error && <p className="portal__error">{error}</p>}

        {!loading && !error && (
          <>
            {/* 1. Promos */}
            <section className="cabinet__promos">
              {promos.length === 0 ? (
                <p className="cabinet__empty cabinet__empty--soft">{t.client.noPromos}</p>
              ) : (
                <div className="cabinet__promo-stack">
                  {promos.map((p, i) => (
                    <motion.article
                      key={p.id}
                      className="cabinet__promo"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.45 }}
                    >
                      <div className="cabinet__promo-glow" aria-hidden />
                      <div className="cabinet__promo-copy">
                        <p className="cabinet__promo-label">
                          <Megaphone size={14} />
                          {t.client.promos}
                          {p.discountPct != null && (
                            <span className="cabinet__promo-badge">−{p.discountPct}%</span>
                          )}
                        </p>
                        <h3 className="serif">{p.headline[locale]}</h3>
                        <p>{p.body[locale]}</p>
                        <Link to="/booking" className="btn btn-primary">
                          {t.nav.book}
                          <ArrowUpRight size={16} />
                        </Link>
                      </div>
                      <Sparkles className="cabinet__promo-icon" size={88} strokeWidth={1} aria-hidden />
                    </motion.article>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Welcome */}
            <header className="cabinet__head">
              <div>
                <p className="eyebrow">{t.client.welcome}</p>
                <h1 className="cabinet__title display">
                  {user?.firstName} {user?.lastName}
                </h1>
                <p className="cabinet__sub">{t.client.subtitle}</p>
              </div>
            </header>

            {/* 3. Upcoming + tips + notes */}
            <section className="cabinet__block">
              <div className="cabinet__section-head">
                <CalendarDays size={18} />
                <h2>{t.client.upcoming}</h2>
              </div>

              {upcoming.length === 0 ? (
                <div className="cabinet__empty-card glass">
                  <p>{t.client.noNextVisit}</p>
                  <Link to="/booking" className="btn btn-primary">
                    {t.client.bookCta}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              ) : (
                <div className="cabinet__list">
                  {upcoming.map((b, i) => {
                    const when = bookingWhen(b)
                    const tip = tipForService(b.service.name[locale], locale)
                    return (
                      <motion.article
                        key={b.id}
                        className="cabinet__visit glass-strong"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <div className="cabinet__visit-main">
                          <img src={b.service.image} alt="" />
                          <div className="cabinet__info">
                            <div className="cabinet__status" data-status={b.status}>
                              {b.status}
                            </div>
                            <h3 className="serif">{b.service.name[locale]}</h3>
                            <p>
                              <CalendarDays size={14} />
                              {when.date} · {when.time} · {b.master.name}
                            </p>
                            <div className="cabinet__actions">
                              <button className="btn btn-ghost" onClick={() => reschedule(b)}>
                                {t.client.reschedule}
                              </button>
                              <button
                                className="btn btn-ghost cabinet__cancel"
                                onClick={() => setCancelId(b.id)}
                              >
                                {t.client.cancel}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="cabinet__tip">
                          <Lightbulb size={16} />
                          <div>
                            <strong>{t.client.tipTitle}</strong>
                            <p>{tip}</p>
                          </div>
                        </div>

                        <div className="cabinet__note">
                          <div className="cabinet__section-head">
                            <NotebookPen size={16} />
                            <h3>{t.client.noteToMaster}</h3>
                          </div>
                          <textarea
                            rows={3}
                            value={noteDrafts[b.id] ?? ''}
                            placeholder={t.client.notePlaceholder}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                            }
                          />
                          <button
                            className="btn btn-primary"
                            disabled={savingNoteId === b.id}
                            onClick={() => void saveNote(b.id)}
                          >
                            {t.client.noteSave}
                          </button>
                        </div>
                      </motion.article>
                    )
                  })}
                </div>
              )}
            </section>

            {/* 4. Profile */}
            <section className="cabinet__block cabinet__profile glass-strong">
              <div className="cabinet__profile-head">
                <div className="portal__panel-head">
                  <UserRound size={18} />
                  <h2>{t.client.profile}</h2>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost cabinet__logout"
                  onClick={() => logout()}
                >
                  <LogOut size={16} />
                  {t.admin.logout}
                </button>
              </div>
              {profile && (
                <div className="cabinet__loyalty">
                  <p className="cabinet__visits-line">
                    {profile.profile.totalVisits} {t.client.visits}
                  </p>
                  <p className="cabinet__loyalty-hint">{t.client.loyaltyHint}</p>
                  <p className="cabinet__loyalty-progress">
                    {profile.profile.totalVisits >= 10
                      ? t.client.loyaltyReady
                      : t.client.loyaltyProgress.replace(
                          '{n}',
                          String(10 - profile.profile.totalVisits),
                        )}
                  </p>
                </div>
              )}
              <form className="portal-form admin__form" onSubmit={saveProfile}>
                <div className="cabinet__profile-grid">
                  <label>
                    {locale === 'ru' ? 'Имя' : 'Vorname'}
                    <input
                      value={profileForm.firstName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, firstName: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    {locale === 'ru' ? 'Фамилия' : 'Nachname'}
                    <input
                      value={profileForm.lastName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, lastName: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    {t.client.phone}
                    <input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  {t.client.allergies}
                  <textarea
                    rows={2}
                    value={profileForm.allergies}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, allergies: e.target.value })
                    }
                  />
                </label>
                <label>
                  {t.client.preferences}
                  <textarea
                    rows={2}
                    value={profileForm.preferences}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, preferences: e.target.value })
                    }
                  />
                </label>
                <button className="btn btn-primary" disabled={saving}>
                  {t.admin.save}
                </button>
              </form>
            </section>

            {/* 5. History */}
            <section className="cabinet__block">
              <div className="cabinet__section-head">
                <CalendarDays size={18} />
                <h2>{t.client.historyTitle}</h2>
              </div>
              <div className="cabinet__list">
                {history.length === 0 && <p className="cabinet__empty">{t.client.empty}</p>}
                {history.map((b, i) => {
                  const when = bookingWhen(b)
                  return (
                    <motion.article
                      key={b.id}
                      className="cabinet__card glass"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <img src={b.service.image} alt="" />
                      <div className="cabinet__info">
                        <div className="cabinet__status" data-status={b.status}>
                          {b.status}
                        </div>
                        <h3 className="serif">{b.service.name[locale]}</h3>
                        <p>
                          <CalendarDays size={14} />
                          {when.date} · {when.time} · {b.master.name}
                        </p>
                        <Link
                          to={`/booking?service=${b.service.id}&master=${b.master.id}`}
                          className="btn btn-ghost"
                        >
                          {t.client.bookCta}
                        </Link>
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
      </div>

      <ConfirmDialog
        open={cancelId !== null}
        title={t.client.confirmCancelTitle}
        body={t.client.confirmCancelBody}
        confirmLabel={t.client.confirmCancelYes}
        cancelLabel={t.client.confirmCancelNo}
        busy={cancelBusy}
        onClose={() => setCancelId(null)}
        onConfirm={() => void confirmCancel()}
      />

      <Footer />
    </main>
  )
}
