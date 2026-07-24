import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Sparkles,
  CalendarRange,
  Megaphone,
  Pencil,
  Trash2,
  FolderTree,
  BarChart3,
  LogOut,
  Plus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError } from '../lib/api'
import { Modal, confirmAction } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { ImageUpload } from '../components/ui/ImageUpload'
import './Portal.css'

const tabs = [
  { id: 'stats', icon: BarChart3 },
  { id: 'staff', icon: Users },
  { id: 'services', icon: Sparkles },
  { id: 'categories', icon: FolderTree },
  { id: 'bookings', icon: CalendarRange },
  { id: 'clients', icon: Users },
  { id: 'promos', icon: Megaphone },
] as const

type TabId = (typeof tabs)[number]['id']

type Stats = {
  clients: number
  masters: number
  services: number
  bookingsThisMonth: number
  revenueThisMonth: number
  upcomingBookings: number
}

type MasterRow = {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  image: string
  role: { ru: string; de: string }
  bio: { ru: string; de: string }
  specialties: string[]
  bookingsCount: number
  isActive: boolean
}

type ServiceRow = {
  id: string
  categoryId: string
  slug: string
  name: { ru: string; de: string }
  description: { ru: string; de: string }
  image: string
  price: number
  duration: number
  featured: boolean
  isActive: boolean
  nameRu?: string
  nameDe?: string
  descriptionRu?: string
  descriptionDe?: string
  imageUrl?: string
  durationMin?: number
}

type CategoryRow = {
  id: string
  slug: string
  icon: string
  nameRu: string
  nameDe: string
  isActive: boolean
}

type BookingRow = {
  id: string
  client: string
  date: string
  time: string
  status: string
  notes: string | null
  service: { name: { ru: string; de: string } }
  master: { name: string }
}

type ClientRow = {
  id: string
  name: string
  email: string
  phone: string | null
  allergies: string | null
  crmNotes: string | null
  totalVisits: number
  totalSpent: number
  bookingsCount: number
}

type ClientDetail = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  allergies: string | null
  preferences: string | null
  crmNotes: string | null
  totalVisits: number
  totalSpent: number
  isActive: boolean
  notes: { id: string; body: string; createdAt: string }[]
  bookings: {
    id: string
    startsAt: string
    status: string
    price: number
    service: string
    master: string
  }[]
}

type PromoRow = {
  id: string
  headline: { ru: string; de: string }
  body: { ru: string; de: string }
  discountPct: number | null
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  serviceIds: string[]
}

const emptyMaster = {
  email: '',
  password: 'master123',
  firstName: '',
  lastName: '',
  roleRu: '',
  roleDe: '',
  bioRu: '',
  bioDe: '',
  imageUrl: '',
  specialtyIds: [] as string[],
}

const emptyService = {
  categoryId: '',
  slug: '',
  nameRu: '',
  nameDe: '',
  descriptionRu: '',
  descriptionDe: '',
  price: 100,
  durationMin: 60,
  imageUrl: '',
  featured: false,
}

const emptyCategory = {
  slug: '',
  icon: '✦',
  nameRu: '',
  nameDe: '',
}

const emptyPromo = {
  headlineRu: '',
  headlineDe: '',
  bodyRu: '',
  bodyDe: '',
  discountPct: 10,
  isActive: true,
  serviceIds: [] as string[],
}

export function AdminPage() {
  const { t, locale } = useLang()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [tab, setTab] = useState<TabId>('stats')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [stats, setStats] = useState<Stats | null>(null)
  const [masters, setMasters] = useState<MasterRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [promos, setPromos] = useState<PromoRow[]>([])

  const [statusFilter, setStatusFilter] = useState('')
  const [clientSearch, setClientSearch] = useState('')

  const [masterModal, setMasterModal] = useState<'create' | 'edit' | null>(null)
  const [masterForm, setMasterForm] = useState(emptyMaster)
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null)

  const [serviceModal, setServiceModal] = useState<'create' | 'edit' | null>(null)
  const [serviceForm, setServiceForm] = useState(emptyService)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)

  const [categoryModal, setCategoryModal] = useState(false)
  const [categoryForm, setCategoryForm] = useState(emptyCategory)

  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null)
  const [clientCrm, setClientCrm] = useState({ crmNotes: '', allergies: '', preferences: '' })

  const [promoModal, setPromoModal] = useState<'create' | 'edit' | null>(null)
  const [promoForm, setPromoForm] = useState(emptyPromo)
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [st, m, s, c, b, cl, p] = await Promise.all([
        api<Stats>('/admin/stats'),
        api<MasterRow[]>('/admin/masters'),
        api<ServiceRow[]>('/admin/services'),
        api<CategoryRow[]>('/admin/categories'),
        api<BookingRow[]>('/admin/bookings'),
        api<ClientRow[]>('/admin/clients'),
        api<PromoRow[]>('/admin/promos'),
      ])
      setStats(st)
      setMasters(m)
      setServices(
        s.map((row) => ({
          ...row,
          name: row.name ?? { ru: row.nameRu ?? '', de: row.nameDe ?? '' },
          description: row.description ?? { ru: row.descriptionRu ?? '', de: row.descriptionDe ?? '' },
          image: row.image ?? row.imageUrl ?? '',
          duration: row.duration ?? row.durationMin ?? 60,
        })),
      )
      setCategories(c)
      setBookings(b)
      setClients(cl)
      setPromos(p)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.admin.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const labels: Record<TabId, string> = {
    stats: t.admin.stats,
    staff: t.admin.staff,
    services: t.admin.services,
    categories: t.admin.categories,
    bookings: t.admin.bookings,
    clients: t.admin.clients,
    promos: t.admin.promos,
  }

  const filteredBookings = useMemo(() => {
    if (!statusFilter) return bookings
    return bookings.filter((b) => b.status === statusFilter)
  }, [bookings, statusFilter])

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    )
  }, [clients, clientSearch])

  const openCreateMaster = () => {
    setMasterForm(emptyMaster)
    setEditingMasterId(null)
    setMasterModal('create')
  }

  const openEditMaster = (m: MasterRow) => {
    setEditingMasterId(m.id)
    setMasterForm({
      email: m.email,
      password: '',
      firstName: m.firstName,
      lastName: m.lastName,
      roleRu: m.role.ru,
      roleDe: m.role.de,
      bioRu: m.bio.ru,
      bioDe: m.bio.de,
      imageUrl: m.image,
      specialtyIds: m.specialties,
    })
    setMasterModal('edit')
  }

  const saveMaster = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (masterModal === 'create') {
        await api('/admin/masters', { method: 'POST', body: JSON.stringify(masterForm) })
      } else if (editingMasterId) {
        await api(`/admin/masters/${editingMasterId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            firstName: masterForm.firstName,
            lastName: masterForm.lastName,
            roleRu: masterForm.roleRu,
            roleDe: masterForm.roleDe,
            bioRu: masterForm.bioRu,
            bioDe: masterForm.bioDe,
            imageUrl: masterForm.imageUrl,
            specialtyIds: masterForm.specialtyIds,
          }),
        })
      }
      setMasterModal(null)
      toast.push(t.admin.save)
      await load()
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Error', 'err')
    } finally {
      setSaving(false)
    }
  }

  const openCreateService = () => {
    setServiceForm({ ...emptyService, categoryId: categories[0]?.id ?? '' })
    setEditingServiceId(null)
    setServiceModal('create')
  }

  const openEditService = (s: ServiceRow) => {
    setEditingServiceId(s.id)
    setServiceForm({
      categoryId: s.categoryId,
      slug: s.slug,
      nameRu: s.name.ru,
      nameDe: s.name.de,
      descriptionRu: s.description.ru,
      descriptionDe: s.description.de,
      price: s.price,
      durationMin: s.duration,
      imageUrl: s.image,
      featured: s.featured,
    })
    setServiceModal('edit')
  }

  const saveService = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (serviceModal === 'create') {
        await api('/admin/services', { method: 'POST', body: JSON.stringify(serviceForm) })
      } else if (editingServiceId) {
        const { slug: _slug, ...patch } = serviceForm
        await api(`/admin/services/${editingServiceId}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
      }
      setServiceModal(null)
      toast.push(t.admin.save)
      await load()
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Error', 'err')
    } finally {
      setSaving(false)
    }
  }

  const saveCategory = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api('/admin/categories', { method: 'POST', body: JSON.stringify(categoryForm) })
      setCategoryModal(false)
      setCategoryForm(emptyCategory)
      toast.push(t.admin.save)
      await load()
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Error', 'err')
    } finally {
      setSaving(false)
    }
  }

  const openClient = async (id: string) => {
    try {
      const detail = await api<ClientDetail>(`/admin/clients/${id}`)
      setClientDetail(detail)
      setClientCrm({
        crmNotes: detail.crmNotes ?? '',
        allergies: detail.allergies ?? '',
        preferences: detail.preferences ?? '',
      })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Error', 'err')
    }
  }

  const saveClientCrm = async (e: FormEvent) => {
    e.preventDefault()
    if (!clientDetail) return
    setSaving(true)
    try {
      await api(`/admin/clients/${clientDetail.id}`, {
        method: 'PATCH',
        body: JSON.stringify(clientCrm),
      })
      toast.push(t.admin.save)
      await load()
      await openClient(clientDetail.id)
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Error', 'err')
    } finally {
      setSaving(false)
    }
  }

  const setBookingStatus = async (id: string, status: string) => {
    try {
      await api(`/admin/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: status.toUpperCase() }),
      })
      toast.push(t.admin.save)
      await load()
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Error', 'err')
    }
  }

  const openCreatePromo = () => {
    setPromoForm(emptyPromo)
    setEditingPromoId(null)
    setPromoModal('create')
  }

  const openEditPromo = (p: PromoRow) => {
    setEditingPromoId(p.id)
    setPromoForm({
      headlineRu: p.headline.ru,
      headlineDe: p.headline.de,
      bodyRu: p.body.ru,
      bodyDe: p.body.de,
      discountPct: p.discountPct ?? 0,
      isActive: p.isActive,
      serviceIds: p.serviceIds,
    })
    setPromoModal('edit')
  }

  const savePromo = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (promoModal === 'create') {
        await api('/admin/promos', { method: 'POST', body: JSON.stringify(promoForm) })
      } else if (editingPromoId) {
        await api(`/admin/promos/${editingPromoId}`, {
          method: 'PATCH',
          body: JSON.stringify(promoForm),
        })
      }
      setPromoModal(null)
      toast.push(t.admin.save)
      await load()
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Error', 'err')
    } finally {
      setSaving(false)
    }
  }

  const toggleSpecialty = (id: string) => {
    setMasterForm((prev) => ({
      ...prev,
      specialtyIds: prev.specialtyIds.includes(id)
        ? prev.specialtyIds.filter((x) => x !== id)
        : [...prev.specialtyIds, id],
    }))
  }

  const togglePromoService = (id: string) => {
    setPromoForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter((x) => x !== id)
        : [...prev.serviceIds, id],
    }))
  }

  const addActions: Partial<Record<TabId, () => void>> = {
    staff: openCreateMaster,
    services: openCreateService,
    categories: () => {
      setCategoryForm(emptyCategory)
      setCategoryModal(true)
    },
    promos: openCreatePromo,
  }

  return (
    <main className="portal portal--admin page-enter">
      <div className="portal__wrap">
        <header className="portal__head">
          <div>
            <p className="eyebrow">CRM Control</p>
            <h1 className="portal__title display">{t.admin.title}</h1>
            <p className="portal__sub">{t.admin.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            {addActions[tab] && (
              <button className="btn btn-primary" onClick={addActions[tab]}>
                <Plus size={16} />
                {t.admin.add}
              </button>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut size={16} />
              {t.admin.logout}
            </button>
          </div>
        </header>

        <div className="admin__tabs">
          {tabs.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={`admin__tab ${tab === id ? 'is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              {labels[id]}
            </button>
          ))}
        </div>

        {loading && <p className="portal__loading">{t.admin.loading}</p>}
        {error && <p className="portal__error">{error}</p>}

        {!loading && !error && (
          <AnimatePanel tab={tab}>
            {tab === 'stats' && stats && (
              <div className="admin__cats">
                {(
                  [
                    [stats.clients, t.admin.clients],
                    [stats.masters, t.admin.staff],
                    [stats.services, t.admin.services],
                    [stats.bookingsThisMonth, t.admin.bookingsMonth],
                    [`€${stats.revenueThisMonth}`, t.admin.revenue],
                    [stats.upcomingBookings, t.admin.upcoming],
                  ] as const
                ).map(([value, label]) => (
                  <div key={label} className="admin__cat glass">
                    <strong style={{ fontSize: '1.4rem' }}>{value}</strong>
                    <span style={{ textTransform: 'none', letterSpacing: 0 }}>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'staff' && (
              <div className="admin__table glass-strong">
                {masters.length === 0 && <p className="portal__empty">{t.admin.empty}</p>}
                {masters.map((m) => (
                  <div key={m.id} className="admin__row">
                    <img src={m.image} alt="" />
                    <div>
                      <strong>
                        {m.name}
                        {!m.isActive ? ' · off' : ''}
                      </strong>
                      <span>{m.role[locale]}</span>
                    </div>
                    <em>{m.bookingsCount} bookings</em>
                    <div className="admin__row-actions">
                      <button aria-label="edit" onClick={() => openEditMaster(m)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        aria-label="delete"
                        onClick={() => {
                          if (!confirmAction(t.admin.confirmDelete)) return
                          void api(`/admin/masters/${m.id}`, { method: 'DELETE' })
                            .then(() => load())
                            .then(() => toast.push(t.admin.delete))
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'services' && (
              <div className="admin__table glass-strong">
                {services.map((s) => (
                  <div key={s.id} className="admin__row admin__row--service">
                    <img src={s.image} alt="" />
                    <div>
                      <strong>{s.name[locale]}</strong>
                      <span>
                        €{s.price} · {s.duration} min
                        {s.featured ? ' · featured' : ''}
                      </span>
                    </div>
                    <em>€{s.price}</em>
                    <div className="admin__row-actions">
                      <button aria-label="edit" onClick={() => openEditService(s)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        aria-label="delete"
                        onClick={() => {
                          if (!confirmAction(t.admin.confirmDelete)) return
                          void api(`/admin/services/${s.id}`, { method: 'DELETE' })
                            .then(() => load())
                            .then(() => toast.push(t.admin.delete))
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'categories' && (
              <div className="admin__cats">
                {categories.map((c) => (
                  <div key={c.id} className="admin__cat glass">
                    <span>{c.icon}</span>
                    <strong>{locale === 'ru' ? c.nameRu : c.nameDe}</strong>
                    <button
                      className="btn btn-ghost"
                      style={{ justifySelf: 'start', padding: '0.35rem 0.7rem', fontSize: '0.72rem' }}
                      onClick={() => {
                        if (!confirmAction(t.admin.confirmDelete)) return
                        void api(`/admin/categories/${c.id}`, { method: 'DELETE' })
                          .then(() => load())
                          .then(() => toast.push(t.admin.delete))
                      }}
                    >
                      {t.admin.delete}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'bookings' && (
              <>
                <div className="admin__filters">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">{t.admin.allStatuses}</option>
                    {['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin__table glass-strong">
                  {filteredBookings.length === 0 && <p className="portal__empty">{t.admin.empty}</p>}
                  {filteredBookings.map((b) => (
                    <div key={b.id} className="admin__row">
                      <div className="admin__booking-avatar">{b.client.slice(0, 1)}</div>
                      <div>
                        <strong>{b.client}</strong>
                        <span>
                          {b.service.name[locale]} · {b.master.name}
                        </span>
                      </div>
                      <em>
                        {b.date} {b.time}
                      </em>
                      <select
                        className="admin__status-select"
                        value={b.status}
                        onChange={(e) => void setBookingStatus(b.id, e.target.value)}
                      >
                        {['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'clients' && (
              <>
                <div className="admin__filters">
                  <input
                    type="search"
                    placeholder="Search…"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
                <div className="admin__table glass-strong">
                  {filteredClients.map((c) => (
                    <div
                      key={c.id}
                      className="admin__row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => void openClient(c.id)}
                    >
                      <div className="admin__booking-avatar">{c.name.slice(0, 1)}</div>
                      <div>
                        <strong>{c.name}</strong>
                        <span>
                          {c.email}
                          {c.phone ? ` · ${c.phone}` : ''}
                        </span>
                      </div>
                      <em>
                        {c.totalVisits} · €{c.totalSpent}
                      </em>
                      <span className="admin__badge">{c.bookingsCount}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'promos' && (
              <div className="admin__table glass-strong">
                {promos.map((p) => (
                  <div key={p.id} className="admin__row">
                    <div className="admin__booking-avatar">%</div>
                    <div>
                      <strong>{p.headline[locale]}</strong>
                      <span>{p.body[locale]}</span>
                    </div>
                    <em>
                      {p.discountPct ?? 0}% · {p.isActive ? 'on' : 'off'}
                    </em>
                    <div className="admin__row-actions">
                      <button aria-label="edit" onClick={() => openEditPromo(p)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        aria-label="delete"
                        onClick={() => {
                          if (!confirmAction(t.admin.confirmDelete)) return
                          void api(`/admin/promos/${p.id}`, { method: 'DELETE' })
                            .then(() => load())
                            .then(() => toast.push(t.admin.delete))
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnimatePanel>
        )}
      </div>

      <Modal
        open={masterModal !== null}
        title={masterModal === 'create' ? t.admin.add : t.admin.edit}
        onClose={() => setMasterModal(null)}
        wide
      >
        <form className="admin__form" onSubmit={saveMaster}>
          <div className="admin__form-grid">
            <label>
              First name
              <input
                required
                value={masterForm.firstName}
                onChange={(e) => setMasterForm({ ...masterForm, firstName: e.target.value })}
              />
            </label>
            <label>
              Last name
              <input
                required
                value={masterForm.lastName}
                onChange={(e) => setMasterForm({ ...masterForm, lastName: e.target.value })}
              />
            </label>
            {masterModal === 'create' && (
              <>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={masterForm.email}
                    onChange={(e) => setMasterForm({ ...masterForm, email: e.target.value })}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={masterForm.password}
                    onChange={(e) => setMasterForm({ ...masterForm, password: e.target.value })}
                  />
                </label>
              </>
            )}
            <label>
              Role RU
              <input
                required
                value={masterForm.roleRu}
                onChange={(e) => setMasterForm({ ...masterForm, roleRu: e.target.value })}
              />
            </label>
            <label>
              Role DE
              <input
                required
                value={masterForm.roleDe}
                onChange={(e) => setMasterForm({ ...masterForm, roleDe: e.target.value })}
              />
            </label>
          </div>
          <label>
            Bio RU
            <textarea
              rows={2}
              required
              value={masterForm.bioRu}
              onChange={(e) => setMasterForm({ ...masterForm, bioRu: e.target.value })}
            />
          </label>
          <label>
            Bio DE
            <textarea
              rows={2}
              required
              value={masterForm.bioDe}
              onChange={(e) => setMasterForm({ ...masterForm, bioDe: e.target.value })}
            />
          </label>
          <ImageUpload
            label={locale === 'ru' ? 'Фото' : 'Foto'}
            value={masterForm.imageUrl}
            onChange={(url) => setMasterForm({ ...masterForm, imageUrl: url })}
          />
          <div>
            <p className="eyebrow">{t.admin.services}</p>
            <div className="admin__checkboxes">
              {services.map((s) => (
                <label key={s.id} className="admin__check">
                  <input
                    type="checkbox"
                    checked={masterForm.specialtyIds.includes(s.id)}
                    onChange={() => toggleSpecialty(s.id)}
                  />
                  {s.name[locale]}
                </label>
              ))}
            </div>
          </div>
          <div className="admin__form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setMasterModal(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={saving || !masterForm.imageUrl}>
              {t.admin.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={serviceModal !== null}
        title={serviceModal === 'create' ? t.admin.add : t.admin.edit}
        onClose={() => setServiceModal(null)}
        wide
      >
        <form className="admin__form" onSubmit={saveService}>
          <div className="admin__form-grid">
            <label>
              Category
              <select
                required
                value={serviceForm.categoryId}
                onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === 'ru' ? c.nameRu : c.nameDe}
                  </option>
                ))}
              </select>
            </label>
            {serviceModal === 'create' && (
              <label>
                Slug
                <input
                  required
                  value={serviceForm.slug}
                  onChange={(e) => setServiceForm({ ...serviceForm, slug: e.target.value })}
                />
              </label>
            )}
            <label>
              Name RU
              <input
                required
                value={serviceForm.nameRu}
                onChange={(e) => setServiceForm({ ...serviceForm, nameRu: e.target.value })}
              />
            </label>
            <label>
              Name DE
              <input
                required
                value={serviceForm.nameDe}
                onChange={(e) => setServiceForm({ ...serviceForm, nameDe: e.target.value })}
              />
            </label>
            <label>
              Price €
              <input
                type="number"
                required
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
              />
            </label>
            <label>
              Duration min
              <input
                type="number"
                required
                value={serviceForm.durationMin}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, durationMin: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <label>
            Description RU
            <textarea
              rows={2}
              required
              value={serviceForm.descriptionRu}
              onChange={(e) => setServiceForm({ ...serviceForm, descriptionRu: e.target.value })}
            />
          </label>
          <label>
            Description DE
            <textarea
              rows={2}
              required
              value={serviceForm.descriptionDe}
              onChange={(e) => setServiceForm({ ...serviceForm, descriptionDe: e.target.value })}
            />
          </label>
          <ImageUpload
            label={locale === 'ru' ? 'Фото услуги' : 'Leistungsfoto'}
            value={serviceForm.imageUrl}
            onChange={(url) => setServiceForm({ ...serviceForm, imageUrl: url })}
          />
          <label className="admin__check" style={{ alignItems: 'flex-start', textTransform: 'none', letterSpacing: 0 }}>
            <input
              type="checkbox"
              checked={serviceForm.featured}
              onChange={(e) => setServiceForm({ ...serviceForm, featured: e.target.checked })}
            />
            <span>
              <strong>{locale === 'ru' ? 'Featured — на главной' : 'Featured — auf Startseite'}</strong>
              <br />
              <em style={{ fontStyle: 'normal', opacity: 0.75, fontSize: '0.8rem' }}>
                {locale === 'ru'
                  ? 'Показывать эту услугу в блоке «Ритуалы красоты» на лендинге'
                  : 'Diese Leistung im Block „Schönheitsrituale“ auf der Startseite zeigen'}
              </em>
            </span>
          </label>
          <div className="admin__form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setServiceModal(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={saving || !serviceForm.imageUrl}>
              {t.admin.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={categoryModal} title={t.admin.add} onClose={() => setCategoryModal(false)}>
        <form className="admin__form" onSubmit={saveCategory}>
          <label>
            Slug
            <input
              required
              value={categoryForm.slug}
              onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
            />
          </label>
          <label>
            Icon
            <input
              required
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
            />
          </label>
          <label>
            Name RU
            <input
              required
              value={categoryForm.nameRu}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameRu: e.target.value })}
            />
          </label>
          <label>
            Name DE
            <input
              required
              value={categoryForm.nameDe}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameDe: e.target.value })}
            />
          </label>
          <div className="admin__form-actions">
            <button className="btn btn-primary" disabled={saving}>
              {t.admin.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!clientDetail}
        title={clientDetail ? `${clientDetail.firstName} ${clientDetail.lastName}` : ''}
        onClose={() => setClientDetail(null)}
        wide
      >
        {clientDetail && (
          <div className="admin__detail">
            <div className="admin__detail-meta">
              <strong>
                {clientDetail.firstName} {clientDetail.lastName}
              </strong>
              <span>{clientDetail.email}</span>
              <span>{clientDetail.phone || '—'}</span>
              <span>
                {clientDetail.totalVisits} visits · €{clientDetail.totalSpent}
              </span>
            </div>
            <form className="admin__form" onSubmit={saveClientCrm}>
              <label>
                CRM notes
                <textarea
                  rows={2}
                  value={clientCrm.crmNotes}
                  onChange={(e) => setClientCrm({ ...clientCrm, crmNotes: e.target.value })}
                />
              </label>
              <label>
                Allergies
                <input
                  value={clientCrm.allergies}
                  onChange={(e) => setClientCrm({ ...clientCrm, allergies: e.target.value })}
                />
              </label>
              <label>
                Preferences
                <input
                  value={clientCrm.preferences}
                  onChange={(e) => setClientCrm({ ...clientCrm, preferences: e.target.value })}
                />
              </label>
              <div className="admin__form-actions">
                <button className="btn btn-primary" disabled={saving}>
                  {t.admin.save}
                </button>
              </div>
            </form>
            <div>
              <p className="eyebrow">{t.admin.bookings}</p>
              <div className="admin__mini-list">
                {clientDetail.bookings.map((b) => (
                  <div key={b.id} className="admin__mini-row">
                    <span>
                      {b.service} · {b.master}
                    </span>
                    <em>
                      {new Date(b.startsAt).toLocaleString()} · {b.status}
                    </em>
                  </div>
                ))}
              </div>
            </div>
            {clientDetail.notes.length > 0 && (
              <div>
                <p className="eyebrow">{t.staff.notes}</p>
                <div className="admin__mini-list">
                  {clientDetail.notes.map((n) => (
                    <div key={n.id} className="admin__mini-row">
                      <span>{n.body}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={promoModal !== null}
        title={promoModal === 'create' ? t.admin.add : t.admin.edit}
        onClose={() => setPromoModal(null)}
        wide
      >
        <form className="admin__form" onSubmit={savePromo}>
          <div className="admin__form-grid">
            <label>
              Headline RU
              <input
                required
                value={promoForm.headlineRu}
                onChange={(e) => setPromoForm({ ...promoForm, headlineRu: e.target.value })}
              />
            </label>
            <label>
              Headline DE
              <input
                required
                value={promoForm.headlineDe}
                onChange={(e) => setPromoForm({ ...promoForm, headlineDe: e.target.value })}
              />
            </label>
          </div>
          <label>
            Body RU
            <textarea
              rows={2}
              required
              value={promoForm.bodyRu}
              onChange={(e) => setPromoForm({ ...promoForm, bodyRu: e.target.value })}
            />
          </label>
          <label>
            Body DE
            <textarea
              rows={2}
              required
              value={promoForm.bodyDe}
              onChange={(e) => setPromoForm({ ...promoForm, bodyDe: e.target.value })}
            />
          </label>
          <label>
            Discount %
            <input
              type="number"
              value={promoForm.discountPct}
              onChange={(e) => setPromoForm({ ...promoForm, discountPct: Number(e.target.value) })}
            />
          </label>
          <label className="admin__check">
            <input
              type="checkbox"
              checked={promoForm.isActive}
              onChange={(e) => setPromoForm({ ...promoForm, isActive: e.target.checked })}
            />
            Active
          </label>
          <div className="admin__checkboxes">
            {services.map((s) => (
              <label key={s.id} className="admin__check">
                <input
                  type="checkbox"
                  checked={promoForm.serviceIds.includes(s.id)}
                  onChange={() => togglePromoService(s.id)}
                />
                {s.name[locale]}
              </label>
            ))}
          </div>
          <div className="admin__form-actions">
            <button className="btn btn-primary" disabled={saving}>
              {t.admin.save}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  )
}

function AnimatePanel({ tab, children }: { tab: string; children: ReactNode }) {
  return (
    <motion.div
      key={tab}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}
