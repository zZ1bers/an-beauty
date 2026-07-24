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
  UserRound,
  Scissors,
  Wallet,
  Clock3,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { useTheme } from '../theme/ThemeContext'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError } from '../lib/api'
import { Modal, confirmAction } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { ImageUpload } from '../components/ui/ImageUpload'
import './Portal.css'

const CHART_BASE = {
  coral: '#E7717D',
  coralDeep: '#d45a67',
  green: '#8FC24A',
  greenDeep: '#7AAD3A',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#E0B07A',
  confirmed: '#A8A29A',
  completed: '#8FC24A',
  cancelled: '#E7717D',
  no_show: '#6B8FB8',
}

function chartTheme(mode: 'light' | 'dark') {
  if (mode === 'light') {
    return {
      ...CHART_BASE,
      label: '#3a2f28',
      tick: 'rgba(58, 47, 40, 0.72)',
      grid: 'rgba(58, 47, 40, 0.12)',
      tooltipBg: 'rgba(255, 255, 255, 0.98)',
      tooltipBorder: 'rgba(231, 113, 125, 0.4)',
      tooltipText: '#3a2f28',
    }
  }
  return {
    ...CHART_BASE,
    label: '#F4EFE9',
    tick: 'rgba(244, 239, 233, 0.78)',
    grid: 'rgba(244, 239, 233, 0.14)',
    tooltipBg: 'rgba(34, 27, 23, 0.96)',
    tooltipBorder: 'rgba(231, 113, 125, 0.45)',
    tooltipText: '#F4EFE9',
  }
}

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
  masterIds?: string[]
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
  clientId?: string
  date: string
  time: string
  startsAt?: string
  status: string
  notes: string | null
  price: number
  service: { id: string; categoryId?: string; name: { ru: string; de: string } }
  master: { id: string; name: string }
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
  createdAt?: string
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
  masterIds: [] as string[],
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
  const { theme } = useTheme()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const CHART = useMemo(() => chartTheme(theme), [theme])
  const tickProps = useMemo(
    () => ({ fill: CHART.tick, fontSize: 12, fontWeight: 500 as const }),
    [CHART.tick],
  )
  const tipStyle = useMemo(
    () => ({
      background: CHART.tooltipBg,
      border: `1px solid ${CHART.tooltipBorder}`,
      borderRadius: 12,
      color: CHART.tooltipText,
      boxShadow:
        theme === 'light'
          ? '0 12px 32px rgba(58, 47, 40, 0.12)'
          : '0 12px 32px rgba(0,0,0,0.35)',
    }),
    [CHART, theme],
  )
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
  const [masterFilter, setMasterFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
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
          masterIds: row.masterIds ?? [],
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

  const serviceCategoryById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of services) map.set(s.id, s.categoryId)
    return map
  }, [services])

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false
      if (masterFilter && b.master.id !== masterFilter) return false
      if (categoryFilter) {
        const catId = b.service.categoryId ?? serviceCategoryById.get(b.service.id)
        if (catId !== categoryFilter) return false
      }
      return true
    })
  }, [bookings, statusFilter, masterFilter, categoryFilter, serviceCategoryById])

  const chartSeries = useMemo(() => {
    const days = 14
    const dayKeys: string[] = []
    const byDay = new Map<string, { date: string; revenue: number; bookings: number; clients: number }>()
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dayKeys.push(key)
      byDay.set(key, {
        date: key.slice(5).replace('-', '/'),
        revenue: 0,
        bookings: 0,
        clients: 0,
      })
    }

    for (const b of bookings) {
      const key = (b.startsAt ?? b.date).slice(0, 10)
      const row = byDay.get(key)
      if (!row) continue
      row.bookings += 1
      if (b.status === 'completed' || b.status === 'confirmed') {
        row.revenue += Number(b.price) || 0
      }
    }

    for (const c of clients) {
      if (!c.createdAt) continue
      const key = new Date(c.createdAt).toISOString().slice(0, 10)
      const row = byDay.get(key)
      if (row) row.clients += 1
    }

    return dayKeys.map((k) => byDay.get(k)!)
  }, [bookings, clients])

  const statusChart = useMemo(() => {
    const counts = new Map<string, number>()
    for (const b of bookings) {
      counts.set(b.status, (counts.get(b.status) ?? 0) + 1)
    }
    return [...counts.entries()].map(([name, value]) => ({
      name,
      value,
      fill: STATUS_COLORS[name] ?? CHART_BASE.coral,
    }))
  }, [bookings])

  const masterChart = useMemo(() => {
    const map = new Map<string, { name: string; bookings: number; revenue: number }>()
    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      const cur = map.get(b.master.id) ?? { name: b.master.name.split(' ')[0] || b.master.name, bookings: 0, revenue: 0 }
      cur.bookings += 1
      if (b.status === 'completed') cur.revenue += Number(b.price) || 0
      map.set(b.master.id, cur)
    }
    return [...map.values()].sort((a, b) => b.bookings - a.bookings).slice(0, 6)
  }, [bookings])

  const topClientsChart = useMemo(() => {
    return [...clients]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map((c) => {
        const parts = c.name.trim().split(/\s+/)
        const short =
          parts.length >= 2 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || c.name
        return {
          name: short,
          spent: Math.round(c.totalSpent),
          label: `€${Math.round(c.totalSpent)}`,
        }
      })
  }, [clients])

  const upcomingList = useMemo(() => {
    const now = Date.now()
    return bookings
      .filter((b) => {
        if (b.status !== 'pending' && b.status !== 'confirmed') return false
        const at = new Date(b.startsAt ?? `${b.date}T${b.time}:00`).getTime()
        return Number.isFinite(at) && at >= now
      })
      .sort((a, b) => {
        const ta = new Date(a.startsAt ?? `${a.date}T${a.time}:00`).getTime()
        const tb = new Date(b.startsAt ?? `${b.date}T${b.time}:00`).getTime()
        return ta - tb
      })
  }, [bookings])

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
      masterIds: s.masterIds ?? [],
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

  const toggleServiceMaster = (id: string) => {
    setServiceForm((prev) => ({
      ...prev,
      masterIds: prev.masterIds.includes(id)
        ? prev.masterIds.filter((x) => x !== id)
        : [...prev.masterIds, id],
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
              <div className="admin__stats">
                <div className="admin__kpis">
                  {(
                    [
                      [stats.clients, t.admin.clients, UserRound, 'coral'],
                      [stats.masters, t.admin.staff, Scissors, 'green'],
                      [stats.services, t.admin.services, Sparkles, 'beige'],
                      [stats.bookingsThisMonth, t.admin.bookingsMonth, CalendarRange, 'coral'],
                      [`€${stats.revenueThisMonth}`, t.admin.revenue, Wallet, 'green'],
                      [stats.upcomingBookings, t.admin.upcoming, Clock3, 'beige'],
                    ] as const
                  ).map(([value, label, Icon, tone]) => (
                    <div key={label} className={`admin__kpi admin__kpi--${tone} glass-strong`}>
                      <div className="admin__kpi-icon" aria-hidden>
                        <Icon size={18} />
                      </div>
                      <div className="admin__kpi-copy">
                        <span className="admin__kpi-label">{label}</span>
                        <strong className="admin__kpi-value">{value}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="admin__charts">
                  <div className="admin__chart glass-strong">
                    <h3>{t.admin.chartRevenue}</h3>
                    <div className="admin__chart-body">
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={chartSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={CHART.coral} stopOpacity={0.55} />
                              <stop offset="100%" stopColor={CHART.coral} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                          <XAxis dataKey="date" tick={tickProps} axisLine={false} tickLine={false} />
                          <YAxis
                            yAxisId="€"
                            tick={tickProps}
                            width={42}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            yAxisId="n"
                            orientation="right"
                            tick={tickProps}
                            width={28}
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip contentStyle={tipStyle} labelStyle={{ color: CHART.label }} />
                          <Legend wrapperStyle={{ color: CHART.label, paddingTop: 8 }} />
                          <Area
                            yAxisId="€"
                            type="monotone"
                            dataKey="revenue"
                            name="€"
                            stroke={CHART.coral}
                            fill="url(#revFill)"
                            strokeWidth={2.5}
                          />
                          <Line
                            yAxisId="n"
                            type="monotone"
                            dataKey="bookings"
                            name={t.admin.bookings}
                            stroke={CHART.green}
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: CHART.green, strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="admin__chart glass-strong">
                    <h3>{t.admin.chartByStatus}</h3>
                    <div className="admin__chart-body">
                      {statusChart.length === 0 ? (
                        <p className="portal__empty">{t.admin.empty}</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={statusChart}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={52}
                              outerRadius={88}
                              paddingAngle={4}
                              stroke="rgba(26,21,18,0.35)"
                              strokeWidth={2}
                            >
                              {statusChart.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                              <LabelList
                                dataKey="value"
                                position="outside"
                                fill={CHART.label}
                                fontSize={12}
                                fontWeight={600}
                              />
                            </Pie>
                            <Tooltip contentStyle={tipStyle} />
                            <Legend
                              wrapperStyle={{ color: CHART.label }}
                              formatter={(value) => (
                                <span style={{ color: CHART.label, fontSize: 12 }}>{value}</span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="admin__chart glass-strong">
                    <h3>{t.admin.chartByMaster}</h3>
                    <div className="admin__chart-body">
                      {masterChart.length === 0 ? (
                        <p className="portal__empty">{t.admin.empty}</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={masterChart} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                            <XAxis dataKey="name" tick={tickProps} axisLine={false} tickLine={false} />
                            <YAxis tick={tickProps} width={36} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={tipStyle} cursor={false} />
                            <Legend
                              wrapperStyle={{ color: CHART.label }}
                              formatter={(value) => (
                                <span style={{ color: CHART.label, fontSize: 12 }}>{value}</span>
                              )}
                            />
                            <Bar
                              dataKey="bookings"
                              name={t.admin.bookings}
                              fill={CHART.coral}
                              radius={[8, 8, 0, 0]}
                              maxBarSize={36}
                              activeBar={false}
                            >
                              <LabelList
                                dataKey="bookings"
                                position="top"
                                fill={CHART.label}
                                fontSize={11}
                                fontWeight={600}
                              />
                            </Bar>
                            <Bar
                              dataKey="revenue"
                              name="€"
                              fill={CHART.greenDeep}
                              radius={[8, 8, 0, 0]}
                              maxBarSize={36}
                              activeBar={false}
                            >
                              <LabelList
                                dataKey="revenue"
                                position="top"
                                fill={CHART.label}
                                fontSize={11}
                                fontWeight={600}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="admin__chart glass-strong">
                    <h3>{t.admin.chartClients}</h3>
                    <div className="admin__chart-body">
                      {topClientsChart.length === 0 ? (
                        <p className="portal__empty">{t.admin.empty}</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart
                            data={topClientsChart}
                            layout="vertical"
                            margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
                          >
                            <defs>
                              <linearGradient id="clientBar" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={CHART.coralDeep} />
                                <stop offset="100%" stopColor={CHART.coral} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                            <XAxis
                              type="number"
                              tick={tickProps}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => `€${v}`}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={78}
                              tick={tickProps}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={tipStyle}
                              cursor={false}
                              formatter={(value) => [`€${value}`, '€']}
                            />
                            <Bar
                              dataKey="spent"
                              name="€"
                              fill="url(#clientBar)"
                              radius={[0, 10, 10, 0]}
                              barSize={22}
                              activeBar={false}
                            >
                              <LabelList
                                dataKey="label"
                                position="right"
                                fill={CHART.label}
                                fontSize={12}
                                fontWeight={700}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                <section className="admin__upcoming">
                  <div className="admin__upcoming-head">
                    <h3>{t.admin.upcomingList}</h3>
                    <span className="admin__upcoming-count">{upcomingList.length}</span>
                  </div>
                  <div className="admin__table glass-strong">
                    {upcomingList.length === 0 && (
                      <p className="portal__empty">{t.admin.upcomingEmpty}</p>
                    )}
                    {upcomingList.map((b) => (
                      <div key={b.id} className="admin__row admin__upcoming-row">
                        <div className="admin__booking-avatar">{b.client.slice(0, 1)}</div>
                        <div>
                          <strong>{b.client}</strong>
                          <span>
                            {b.service.name[locale]} · {b.master.name}
                          </span>
                        </div>
                        <em>
                          {b.date} · {b.time}
                        </em>
                        <span className={`admin__badge admin__badge--${b.status}`}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                </section>
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
                <div className="admin__booking-filters glass-strong">
                  <div className="admin__filter-row">
                    <span className="admin__filter-label">{t.admin.filterStatus}</span>
                    <div className="admin__filter-chips" role="group" aria-label={t.admin.filterStatus}>
                      <button
                        type="button"
                        className={`admin__chip ${!statusFilter ? 'is-active' : ''}`}
                        onClick={() => setStatusFilter('')}
                      >
                        {t.admin.allStatuses}
                      </button>
                      {(
                        [
                          ['pending', t.admin.statusPending],
                          ['confirmed', t.admin.statusConfirmed],
                          ['completed', t.admin.statusCompleted],
                          ['cancelled', t.admin.statusCancelled],
                          ['no_show', t.admin.statusNoShow],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={`admin__chip admin__chip--${value} ${statusFilter === value ? 'is-active' : ''}`}
                          onClick={() => setStatusFilter(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="admin__filter-row">
                    <span className="admin__filter-label">{t.admin.filterMaster}</span>
                    <div className="admin__filter-chips" role="group" aria-label={t.admin.filterMaster}>
                      <button
                        type="button"
                        className={`admin__chip ${!masterFilter ? 'is-active' : ''}`}
                        onClick={() => setMasterFilter('')}
                      >
                        {t.admin.allMasters}
                      </button>
                      {masters
                        .filter((m) => m.isActive)
                        .map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`admin__chip admin__chip--master ${masterFilter === m.id ? 'is-active' : ''}`}
                            onClick={() => setMasterFilter(m.id)}
                          >
                            <img src={m.image} alt="" className="admin__chip-avatar" />
                            {m.name.split(' ')[0]}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="admin__filter-row">
                    <span className="admin__filter-label">{t.admin.filterCategory}</span>
                    <div className="admin__filter-chips" role="group" aria-label={t.admin.filterCategory}>
                      <button
                        type="button"
                        className={`admin__chip ${!categoryFilter ? 'is-active' : ''}`}
                        onClick={() => setCategoryFilter('')}
                      >
                        {t.admin.allCategories}
                      </button>
                      {categories
                        .filter((c) => c.isActive)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`admin__chip ${categoryFilter === c.id ? 'is-active' : ''}`}
                            onClick={() => setCategoryFilter(c.id)}
                          >
                            {c.icon ? <span className="admin__chip-icon">{c.icon}</span> : null}
                            {locale === 'de' ? c.nameDe : c.nameRu}
                          </button>
                        ))}
                    </div>
                  </div>
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
                          {b.price != null ? ` · €${b.price}` : ''}
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
          <div>
            <p className="eyebrow">{t.admin.mastersForService}</p>
            <div className="admin__checkboxes">
              {masters.map((m) => (
                <label key={m.id} className="admin__check">
                  <input
                    type="checkbox"
                    checked={serviceForm.masterIds.includes(m.id)}
                    onChange={() => toggleServiceMaster(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </div>
          </div>
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
