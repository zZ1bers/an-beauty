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
  FileDown,
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
import { api, apiDownload, ApiError } from '../lib/api'
import { addDays, dayEnd, localDateTime, salonDayOfWeek, todayISO, toDateStr } from '../lib/datetime'
import { Modal, confirmAction } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { ImageUpload } from '../components/ui/ImageUpload'
import { DatePicker } from '../components/booking/DatePicker'
import './Portal.css'

function nextWorkingDate(workingDays: number[], fromDate = todayISO()) {
  let cur = fromDate
  for (let i = 0; i < 28; i++) {
    if (workingDays.includes(salonDayOfWeek(cur))) return cur
    cur = addDays(cur, 1)
  }
  return fromDate
}

function walkInBookingError(
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
  showOnHome: boolean
}

const MASTER_PLACEHOLDER = '/placeholder-master.svg'

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
  imageUrl?: string
  isActive: boolean
}

type BookingRow = {
  id: string
  client: string
  clientId?: string | null
  clientEmail?: string | null
  clientPhone?: string | null
  isGuest?: boolean
  guestPhone?: string | null
  date: string
  time: string
  startsAt?: string
  status: string
  notes: string | null
  price: number
  service: { id: string; categoryId?: string; name: { ru: string; de: string } }
  master: { id: string; name: string }
}

const emptyWalkIn = {
  firstName: '',
  lastName: '',
  phone: '',
  serviceId: '',
  masterId: '',
  date: '',
  slot: '',
  notes: '',
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
  password: '',
  firstName: '',
  lastName: '',
  roleRu: '',
  roleDe: '',
  bioRu: '',
  bioDe: '',
  imageUrl: '',
  showOnHome: true,
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

const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1499002238440-d264edd948ad?w=900&q=80'

const emptyCategory = {
  slug: '',
  icon: '✦',
  nameRu: '',
  nameDe: '',
  imageUrl: DEFAULT_CATEGORY_IMAGE,
}

const emptyPromo = {
  headlineRu: '',
  headlineDe: '',
  bodyRu: '',
  bodyDe: '',
  discountPct: 10,
  startsAt: '',
  endsAt: '',
  isActive: true,
  serviceIds: [] as string[],
}

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return toDateStr(d)
}

function promoPayload(form: typeof emptyPromo) {
  return {
    headlineRu: form.headlineRu,
    headlineDe: form.headlineDe,
    bodyRu: form.bodyRu,
    bodyDe: form.bodyDe,
    discountPct: form.discountPct,
    isActive: form.isActive,
    serviceIds: form.serviceIds,
    startsAt: form.startsAt ? localDateTime(form.startsAt, '00:00').toISOString() : null,
    endsAt: form.endsAt ? dayEnd(form.endsAt).toISOString() : null,
  }
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null)
  const [clientCrm, setClientCrm] = useState({ crmNotes: '', allergies: '', preferences: '' })

  const [promoModal, setPromoModal] = useState<'create' | 'edit' | null>(null)
  const [walkInModal, setWalkInModal] = useState(false)
  const [walkInForm, setWalkInForm] = useState(emptyWalkIn)
  const [walkInSlots, setWalkInSlots] = useState<string[]>([])
  const [walkInDayOff, setWalkInDayOff] = useState(false)
  const [walkInWorkingDays, setWalkInWorkingDays] = useState<number[] | undefined>(undefined)
  const [walkInBusy, setWalkInBusy] = useState(false)

  const now = new Date()
  const [reportMonth, setReportMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  )
  const [reportBusy, setReportBusy] = useState(false)
  const [promoForm, setPromoForm] = useState(emptyPromo)
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)

  const load = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (!silent) {
      setLoading(true)
      setError('')
    }
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
      if (!silent) setError(e instanceof ApiError ? e.message : t.admin.error)
      else toast.push(e instanceof ApiError ? e.message : t.admin.error, 'err')
    } finally {
      if (!silent) setLoading(false)
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
      const key = toDateStr(d)
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
      const key = toDateStr(new Date(c.createdAt))
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
    const when = (b: BookingRow) =>
      b.startsAt
        ? new Date(b.startsAt).getTime()
        : b.date && b.time
          ? localDateTime(b.date, b.time).getTime()
          : NaN
    return bookings
      .filter((b) => {
        if (b.status !== 'pending' && b.status !== 'confirmed') return false
        const at = when(b)
        return Number.isFinite(at) && at >= now
      })
      .sort((a, b) => when(a) - when(b))
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
      showOnHome: m.showOnHome,
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
            showOnHome: masterForm.showOnHome,
            specialtyIds: masterForm.specialtyIds,
          }),
        })
      }
      setMasterModal(null)
      toast.push(t.admin.save)
      await load({ silent: true })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
    } finally {
      setSaving(false)
    }
  }

  const deleteMaster = async (m: MasterRow) => {
    if (!confirmAction(t.admin.confirmDelete)) return
    try {
      const res = await api<{ ok: boolean; soft?: boolean }>(`/admin/masters/${m.id}`, {
        method: 'DELETE',
      })
      toast.push(res.soft ? t.admin.deactivated : t.admin.deleted)
      await load({ silent: true })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
    }
  }

  const restoreMaster = async (m: MasterRow) => {
    try {
      await api(`/admin/masters/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true, showOnHome: true }),
      })
      toast.push(t.admin.restore)
      await load({ silent: true })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
    }
  }

  const softDelete = async (path: string) => {
    if (!confirmAction(t.admin.confirmDelete)) return
    try {
      const res = await api<{ ok: boolean; soft?: boolean }>(path, { method: 'DELETE' })
      toast.push(res.soft ? t.admin.deactivated : t.admin.deleted)
      await load({ silent: true })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
    }
  }

  const restoreEntity = async (path: string, body: Record<string, unknown> = { isActive: true }) => {
    try {
      await api(path, { method: 'PATCH', body: JSON.stringify(body) })
      toast.push(t.admin.restore)
      await load({ silent: true })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
    }
  }

  const openCreateService = () => {
    const activeCat = categories.find((c) => c.isActive)
    setServiceForm({ ...emptyService, categoryId: activeCat?.id ?? categories[0]?.id ?? '' })
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
      await load({ silent: true })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
    } finally {
      setSaving(false)
    }
  }

  const openCreateCategory = () => {
    setEditingCategoryId(null)
    setCategoryForm(emptyCategory)
    setCategoryModal(true)
  }

  const openEditCategory = (c: CategoryRow) => {
    setEditingCategoryId(c.id)
    setCategoryForm({
      slug: c.slug,
      icon: c.icon,
      nameRu: c.nameRu,
      nameDe: c.nameDe,
      imageUrl: c.imageUrl || DEFAULT_CATEGORY_IMAGE,
    })
    setCategoryModal(true)
  }

  const saveCategory = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingCategoryId) {
        const { slug: _slug, ...patch } = categoryForm
        await api(`/admin/categories/${editingCategoryId}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
      } else {
        await api('/admin/categories', { method: 'POST', body: JSON.stringify(categoryForm) })
      }
      setCategoryModal(false)
      setEditingCategoryId(null)
      setCategoryForm(emptyCategory)
      toast.push(t.admin.save)
      await load({ silent: true })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
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
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
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
      await load({ silent: true })
      await openClient(clientDetail.id)
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
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
      await load({ silent: true })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
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
      startsAt: toDateInputValue(p.startsAt),
      endsAt: toDateInputValue(p.endsAt),
      isActive: p.isActive,
      serviceIds: p.serviceIds,
    })
    setPromoModal('edit')
  }

  const savePromo = async (e: FormEvent) => {
    e.preventDefault()
    if (promoForm.startsAt && promoForm.endsAt && promoForm.endsAt < promoForm.startsAt) {
      toast.push(t.admin.promoDateError, 'err')
      return
    }
    setSaving(true)
    try {
      const body = promoPayload(promoForm)
      if (promoModal === 'create') {
        await api('/admin/promos', { method: 'POST', body: JSON.stringify(body) })
      } else if (editingPromoId) {
        await api(`/admin/promos/${editingPromoId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }
      setPromoModal(null)
      toast.push(t.admin.save)
      await load({ silent: true })
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : t.admin.error, 'err')
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

  const openWalkIn = () => {
    setWalkInForm({
      ...emptyWalkIn,
      date: todayISO(),
      serviceId: services.find((s) => s.isActive)?.id ?? '',
    })
    setWalkInSlots([])
    setWalkInDayOff(false)
    setWalkInWorkingDays(undefined)
    setWalkInModal(true)
  }

  const walkInMasters = useMemo(() => {
    if (!walkInForm.serviceId) return masters.filter((m) => m.isActive)
    return masters.filter((m) => m.isActive && m.specialties.includes(walkInForm.serviceId))
  }, [masters, walkInForm.serviceId])

  const walkInMaster = masters.find((m) => m.id === walkInForm.masterId)

  useEffect(() => {
    if (!walkInModal || !walkInForm.masterId) {
      setWalkInWorkingDays(undefined)
      return
    }
    let cancelled = false
    void api<{ workingDays: number[] }>(`/masters/${walkInForm.masterId}/hours`, {
      auth: false,
    })
      .then((r) => {
        if (cancelled) return
        setWalkInWorkingDays(r.workingDays)
        if (!r.workingDays.includes(salonDayOfWeek(walkInForm.date))) {
          setWalkInForm((prev) => ({
            ...prev,
            date: nextWorkingDate(r.workingDays),
            slot: '',
          }))
        }
      })
      .catch(() => {
        if (!cancelled) setWalkInWorkingDays(undefined)
      })
    return () => {
      cancelled = true
    }
    // Only re-fetch when master/modal changes — not on every date change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkInModal, walkInForm.masterId])

  useEffect(() => {
    if (!walkInModal || !walkInForm.masterId || !walkInForm.serviceId || !walkInForm.date) {
      setWalkInSlots([])
      setWalkInDayOff(false)
      return
    }
    if (walkInWorkingDays && !walkInWorkingDays.includes(salonDayOfWeek(walkInForm.date))) {
      setWalkInSlots([])
      setWalkInDayOff(true)
      setWalkInForm((prev) => ({ ...prev, slot: '' }))
      return
    }
    let cancelled = false
    void api<{ slots: string[]; dayOff?: boolean }>(
      `/masters/${walkInForm.masterId}/slots?date=${walkInForm.date}&serviceId=${walkInForm.serviceId}`,
      { auth: false },
    )
      .then((r) => {
        if (!cancelled) {
          setWalkInSlots(r.slots)
          setWalkInDayOff(!!r.dayOff)
          setWalkInForm((prev) => ({
            ...prev,
            slot: r.slots.includes(prev.slot) ? prev.slot : '',
          }))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWalkInSlots([])
          setWalkInDayOff(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [
    walkInModal,
    walkInForm.masterId,
    walkInForm.serviceId,
    walkInForm.date,
    walkInWorkingDays,
  ])

  const saveWalkIn = async () => {
    if (
      !walkInForm.firstName.trim() ||
      !walkInForm.lastName.trim() ||
      !walkInForm.serviceId ||
      !walkInForm.masterId ||
      !walkInForm.date ||
      !walkInForm.slot
    ) {
      toast.push(t.admin.pickSlotFirst, 'err')
      return
    }
    if (walkInDayOff) {
      toast.push(t.admin.closedDay, 'err')
      return
    }
    if (!walkInSlots.includes(walkInForm.slot)) {
      toast.push(t.admin.slotTaken, 'err')
      return
    }
    setWalkInBusy(true)
    try {
      const startsAt = localDateTime(walkInForm.date, walkInForm.slot).toISOString()
      await api('/admin/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: walkInForm.serviceId,
          masterId: walkInForm.masterId,
          startsAt,
          firstName: walkInForm.firstName.trim(),
          lastName: walkInForm.lastName.trim(),
          phone: walkInForm.phone.trim() || undefined,
          notes: walkInForm.notes.trim() || undefined,
        }),
      })
      toast.push(t.admin.bookingCreated)
      setWalkInModal(false)
      await load({ silent: true })
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? walkInBookingError(e.message, {
              closedDay: t.admin.closedDay,
              slotTaken: t.admin.slotTaken,
              slotBlocked: t.admin.slotBlocked,
              outsideHours: t.admin.outsideHours,
            })
          : t.admin.error
      toast.push(msg, 'err')
    } finally {
      setWalkInBusy(false)
    }
  }

  const downloadMonthReport = async () => {
    const [y, m] = reportMonth.split('-').map(Number)
    if (!y || !m) {
      toast.push(t.admin.error, 'err')
      return
    }
    setReportBusy(true)
    try {
      const filename = `an-beauty-${y}-${String(m).padStart(2, '0')}.pdf`
      await apiDownload(
        `/admin/reports/month.pdf?year=${y}&month=${m}&locale=${locale}`,
        filename,
      )
      toast.push(t.admin.reportReady)
    } catch (e) {
      toast.push(e instanceof ApiError ? e.message : t.admin.error, 'err')
    } finally {
      setReportBusy(false)
    }
  }

  const addActions: Partial<Record<TabId, () => void>> = {
    staff: openCreateMaster,
    services: openCreateService,
    categories: openCreateCategory,
    promos: openCreatePromo,
    bookings: openWalkIn,
  }

  return (
    <main className="portal portal--admin page-enter">
      <div className="portal__wrap">
        <header className="portal__head">
          <div>
            <p className="eyebrow">{t.admin.crmControl}</p>
            <h1 className="portal__title display">{t.admin.title}</h1>
            <p className="portal__sub">{t.admin.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            {addActions[tab] && (
              <button className="btn btn-primary" onClick={addActions[tab]}>
                <Plus size={16} />
                {tab === 'bookings' ? t.admin.bookWalkIn : t.admin.add}
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
                <div className="admin__report glass-strong">
                  <div className="admin__report-copy">
                    <strong>{t.admin.reportTitle}</strong>
                    <span>{t.admin.reportHint}</span>
                  </div>
                  <div className="admin__report-actions">
                    <label className="admin__report-month">
                      <input
                        type="month"
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={reportBusy}
                      onClick={() => void downloadMonthReport()}
                    >
                      <FileDown size={16} />
                      {reportBusy ? t.admin.reportDownloading : t.admin.reportDownload}
                    </button>
                  </div>
                </div>

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
                          {(b.clientPhone || b.clientEmail) && (
                            <span className="admin__booking-contact">
                              {b.clientPhone || b.clientEmail}
                            </span>
                          )}
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
                  <div key={m.id} className={`admin__row ${!m.isActive ? 'is-inactive' : ''}`}>
                    <img src={m.image || MASTER_PLACEHOLDER} alt="" />
                    <div>
                      <strong>
                        {m.name}
                        {!m.isActive ? ` · ${t.admin.inactive}` : ''}
                        {m.isActive && m.showOnHome ? ` · ${t.admin.onHome}` : ''}
                      </strong>
                      <span>{m.role[locale] || m.email}</span>
                    </div>
                    <em>
                      {m.bookingsCount} {t.admin.bookingsCount}
                    </em>
                    <div className="admin__row-actions">
                      {!m.isActive && (
                        <button type="button" className="btn btn-ghost" onClick={() => void restoreMaster(m)}>
                          {t.admin.restore}
                        </button>
                      )}
                      <button aria-label={t.admin.edit} onClick={() => openEditMaster(m)}>
                        <Pencil size={15} />
                      </button>
                      {m.isActive && (
                        <button aria-label={t.admin.delete} onClick={() => void deleteMaster(m)}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'services' && (
              <div className="admin__table glass-strong">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className={`admin__row admin__row--service ${!s.isActive ? 'is-inactive' : ''}`}
                  >
                    <img src={s.image || MASTER_PLACEHOLDER} alt="" />
                    <div>
                      <strong>
                        {s.name[locale]}
                        {!s.isActive ? ` · ${t.admin.inactive}` : ''}
                        {s.isActive && s.featured ? ` · ${t.admin.featured}` : ''}
                      </strong>
                      <span>
                        €{s.price} · {s.duration} min
                      </span>
                    </div>
                    <em>€{s.price}</em>
                    <div className="admin__row-actions">
                      {!s.isActive && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => void restoreEntity(`/admin/services/${s.id}`)}
                        >
                          {t.admin.restore}
                        </button>
                      )}
                      <button aria-label={t.admin.edit} onClick={() => openEditService(s)}>
                        <Pencil size={15} />
                      </button>
                      {s.isActive && (
                        <button
                          aria-label={t.admin.delete}
                          onClick={() => void softDelete(`/admin/services/${s.id}`)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'categories' && (
              <div className="admin__cats">
                {categories.map((c) => (
                  <div key={c.id} className={`admin__cat glass ${!c.isActive ? 'is-inactive' : ''}`}>
                    <img
                      className="admin__cat-cover"
                      src={c.imageUrl || DEFAULT_CATEGORY_IMAGE}
                      alt=""
                    />
                    <span>{c.icon}</span>
                    <strong>
                      {locale === 'ru' ? c.nameRu : c.nameDe}
                      {!c.isActive ? ` · ${t.admin.inactive}` : ''}
                    </strong>
                    <div className="admin__row-actions" style={{ justifySelf: 'start' }}>
                      {!c.isActive ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem' }}
                          onClick={() => void restoreEntity(`/admin/categories/${c.id}`)}
                        >
                          {t.admin.restore}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem' }}
                            onClick={() => openEditCategory(c)}
                          >
                            {t.admin.edit}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem' }}
                            onClick={() => void softDelete(`/admin/categories/${c.id}`)}
                          >
                            {t.admin.delete}
                          </button>
                        </>
                      )}
                    </div>
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
                      {masters.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`admin__chip admin__chip--master ${masterFilter === m.id ? 'is-active' : ''}`}
                            onClick={() => setMasterFilter(m.id)}
                          >
                            <img
                              src={m.image || MASTER_PLACEHOLDER}
                              alt=""
                              className="admin__chip-avatar"
                            />
                            {m.name.split(' ')[0] || m.email}
                            {!m.isActive ? ` · ${t.admin.inactive}` : ''}
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
                      {categories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`admin__chip ${categoryFilter === c.id ? 'is-active' : ''}`}
                            onClick={() => setCategoryFilter(c.id)}
                          >
                            {c.icon ? <span className="admin__chip-icon">{c.icon}</span> : null}
                            {locale === 'de' ? c.nameDe : c.nameRu}
                            {!c.isActive ? ` · ${t.admin.inactive}` : ''}
                          </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="admin__table glass-strong">
                  {filteredBookings.length === 0 && <p className="portal__empty">{t.admin.empty}</p>}
                  {filteredBookings.map((b) => (
                    <div key={b.id} className="admin__row admin__row--booking">
                      <div className="admin__booking-avatar">{b.client.slice(0, 1)}</div>
                      <div>
                        <strong>
                          {b.client}
                          {b.isGuest ? (
                            <em className="admin__guest-tag"> · {t.admin.walkInGuest}</em>
                          ) : null}
                        </strong>
                        <span>
                          {b.service.name[locale]} · {b.master.name}
                          {b.price != null ? ` · €${b.price}` : ''}
                        </span>
                        {(b.clientPhone || b.clientEmail) && (
                          <span className="admin__booking-contact">
                            {b.clientPhone ? (
                              <a href={`tel:${b.clientPhone}`}>{b.clientPhone}</a>
                            ) : null}
                            {b.clientPhone && b.clientEmail ? ' · ' : null}
                            {b.clientEmail ? (
                              <a href={`mailto:${b.clientEmail}`}>{b.clientEmail}</a>
                            ) : null}
                          </span>
                        )}
                      </div>
                      <em>
                        {b.date} {b.time}
                      </em>
                      <select
                        className="admin__status-select"
                        value={b.status}
                        onChange={(e) => void setBookingStatus(b.id, e.target.value)}
                      >
                        {(
                          [
                            ['pending', t.admin.statusPending],
                            ['confirmed', t.admin.statusConfirmed],
                            ['completed', t.admin.statusCompleted],
                            ['cancelled', t.admin.statusCancelled],
                            ['no_show', t.admin.statusNoShow],
                          ] as const
                        ).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
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
                    placeholder={t.admin.search}
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
                  <div key={p.id} className={`admin__row ${!p.isActive ? 'is-inactive' : ''}`}>
                    <div className="admin__booking-avatar">%</div>
                    <div>
                      <strong>
                        {p.headline[locale]}
                        {!p.isActive ? ` · ${t.admin.inactive}` : ''}
                      </strong>
                      <span>{p.body[locale]}</span>
                      <span className="portal__hint">
                        {p.startsAt || p.endsAt
                          ? `${t.admin.promoPeriod}: ${toDateInputValue(p.startsAt) || '…'} → ${toDateInputValue(p.endsAt) || '…'}`
                          : t.admin.promoNoPeriod}
                      </span>
                    </div>
                    <em>
                      {p.discountPct ?? 0}% · {p.isActive ? t.admin.statusOn : t.admin.statusOff}
                    </em>
                    <div className="admin__row-actions">
                      {!p.isActive && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => void restoreEntity(`/admin/promos/${p.id}`)}
                        >
                          {t.admin.restore}
                        </button>
                      )}
                      <button aria-label={t.admin.edit} onClick={() => openEditPromo(p)}>
                        <Pencil size={15} />
                      </button>
                      {p.isActive && (
                        <button
                          aria-label={t.admin.delete}
                          onClick={() => void softDelete(`/admin/promos/${p.id}`)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
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
          {masterModal === 'create' && <p className="portal__hint">{t.admin.optionalHint}</p>}
          <div className="admin__form-grid">
            <label>
              {t.admin.firstName}
              <input
                value={masterForm.firstName}
                onChange={(e) => setMasterForm({ ...masterForm, firstName: e.target.value })}
              />
            </label>
            <label>
              {t.admin.lastName}
              <input
                value={masterForm.lastName}
                onChange={(e) => setMasterForm({ ...masterForm, lastName: e.target.value })}
              />
            </label>
            {masterModal === 'create' && (
              <>
                <label>
                  {t.admin.email}
                  <input
                    type="email"
                    required
                    value={masterForm.email}
                    onChange={(e) => setMasterForm({ ...masterForm, email: e.target.value })}
                  />
                </label>
                <label>
                  {t.admin.password}
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
              {t.admin.roleRu}
              <input
                value={masterForm.roleRu}
                onChange={(e) => setMasterForm({ ...masterForm, roleRu: e.target.value })}
              />
            </label>
            <label>
              {t.admin.roleDe}
              <input
                value={masterForm.roleDe}
                onChange={(e) => setMasterForm({ ...masterForm, roleDe: e.target.value })}
              />
            </label>
          </div>
          <label>
            {t.admin.bioRu}
            <textarea
              rows={2}
              value={masterForm.bioRu}
              onChange={(e) => setMasterForm({ ...masterForm, bioRu: e.target.value })}
            />
          </label>
          <label>
            {t.admin.bioDe}
            <textarea
              rows={2}
              value={masterForm.bioDe}
              onChange={(e) => setMasterForm({ ...masterForm, bioDe: e.target.value })}
            />
          </label>
          <ImageUpload
            label={t.admin.photoOptional}
            value={masterForm.imageUrl}
            onChange={(url) => setMasterForm({ ...masterForm, imageUrl: url })}
          />
          <label className="admin__check" style={{ alignItems: 'flex-start', textTransform: 'none', letterSpacing: 0 }}>
            <input
              type="checkbox"
              checked={masterForm.showOnHome}
              onChange={(e) => setMasterForm({ ...masterForm, showOnHome: e.target.checked })}
            />
            <span>
              <strong>{t.admin.showOnHome}</strong>
              <br />
              <em style={{ fontStyle: 'normal', opacity: 0.75, fontSize: '0.8rem' }}>
                {t.admin.showOnHomeHint}
              </em>
            </span>
          </label>
          <div>
            <p className="eyebrow">{t.admin.services}</p>
            <div className="admin__checkboxes">
              {services
                .filter((s) => s.isActive || masterForm.specialtyIds.includes(s.id))
                .map((s) => (
                <label key={s.id} className="admin__check">
                  <input
                    type="checkbox"
                    checked={masterForm.specialtyIds.includes(s.id)}
                    onChange={() => toggleSpecialty(s.id)}
                  />
                  {s.name[locale]}
                  {!s.isActive ? ` (${t.admin.inactive})` : ''}
                </label>
              ))}
            </div>
          </div>
          <div className="admin__form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setMasterModal(null)}>
              {t.admin.cancel}
            </button>
            <button className="btn btn-primary" disabled={saving}>
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
              {t.admin.category}
              <select
                required
                value={serviceForm.categoryId}
                onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
              >
                {categories
                  .filter((c) => c.isActive || c.id === serviceForm.categoryId)
                  .map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === 'ru' ? c.nameRu : c.nameDe}
                    {!c.isActive ? ` (${t.admin.inactive})` : ''}
                  </option>
                ))}
              </select>
            </label>
            {serviceModal === 'create' && (
              <label>
                {t.admin.slug}
                <input
                  required
                  value={serviceForm.slug}
                  onChange={(e) => setServiceForm({ ...serviceForm, slug: e.target.value })}
                />
              </label>
            )}
            <label>
              {t.admin.nameRu}
              <input
                value={serviceForm.nameRu}
                onChange={(e) => setServiceForm({ ...serviceForm, nameRu: e.target.value })}
              />
            </label>
            <label>
              {t.admin.nameDe}
              <input
                value={serviceForm.nameDe}
                onChange={(e) => setServiceForm({ ...serviceForm, nameDe: e.target.value })}
              />
            </label>
            <label>
              {t.admin.priceEuro}
              <input
                type="number"
                required
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
              />
            </label>
            <label>
              {t.admin.durationMin}
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
            {t.admin.descriptionRu}
            <textarea
              rows={2}
              value={serviceForm.descriptionRu}
              onChange={(e) => setServiceForm({ ...serviceForm, descriptionRu: e.target.value })}
            />
          </label>
          <label>
            {t.admin.descriptionDe}
            <textarea
              rows={2}
              value={serviceForm.descriptionDe}
              onChange={(e) => setServiceForm({ ...serviceForm, descriptionDe: e.target.value })}
            />
          </label>
          <ImageUpload
            label={t.admin.photoOptional}
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
              <strong>{t.admin.featured}</strong>
              <br />
              <em style={{ fontStyle: 'normal', opacity: 0.75, fontSize: '0.8rem' }}>
                {t.admin.featuredHint}
              </em>
            </span>
          </label>
          <div>
            <p className="eyebrow">{t.admin.mastersForService}</p>
            <div className="admin__checkboxes">
              {masters
                .filter((m) => m.isActive)
                .map((m) => (
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
              {t.admin.cancel}
            </button>
            <button className="btn btn-primary" disabled={saving}>
              {t.admin.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={categoryModal}
        title={editingCategoryId ? t.admin.edit : t.admin.add}
        onClose={() => {
          setCategoryModal(false)
          setEditingCategoryId(null)
        }}
      >
        <form className="admin__form" onSubmit={saveCategory}>
          {!editingCategoryId && (
          <label>
            {t.admin.slug}
            <input
              required
              value={categoryForm.slug}
              onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
            />
          </label>
          )}
          <label>
            {t.admin.icon}
            <input
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
            />
          </label>
          <ImageUpload
            label={t.admin.photoOptional}
            value={categoryForm.imageUrl}
            onChange={(url) => setCategoryForm({ ...categoryForm, imageUrl: url })}
          />
          <label>
            {t.admin.nameRu}
            <input
              required
              value={categoryForm.nameRu}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameRu: e.target.value })}
            />
          </label>
          <label>
            {t.admin.nameDe}
            <input
              required
              value={categoryForm.nameDe}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameDe: e.target.value })}
            />
          </label>
          <div className="admin__form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCategoryModal(false)
                setEditingCategoryId(null)
              }}
            >
              {t.admin.cancel}
            </button>
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
                {clientDetail.totalVisits} {t.admin.visitsSpent}
                {clientDetail.totalSpent}
              </span>
            </div>
            <form className="admin__form" onSubmit={saveClientCrm}>
              <label>
                {t.admin.crmNotes}
                <textarea
                  rows={2}
                  value={clientCrm.crmNotes}
                  onChange={(e) => setClientCrm({ ...clientCrm, crmNotes: e.target.value })}
                />
              </label>
              <label>
                {t.admin.allergies}
                <input
                  value={clientCrm.allergies}
                  onChange={(e) => setClientCrm({ ...clientCrm, allergies: e.target.value })}
                />
              </label>
              <label>
                {t.admin.preferences}
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
        open={walkInModal}
        title={t.admin.walkInTitle}
        onClose={() => setWalkInModal(false)}
        wide
      >
        <form
          className="admin__form"
          onSubmit={(e) => {
            e.preventDefault()
            void saveWalkIn()
          }}
        >
          <p className="portal__hint">{t.admin.walkInHint}</p>
          <div className="admin__form-grid admin__form-grid--2">
            <label>
              {t.admin.firstName}
              <input
                required
                value={walkInForm.firstName}
                onChange={(e) => setWalkInForm({ ...walkInForm, firstName: e.target.value })}
              />
            </label>
            <label>
              {t.admin.lastName}
              <input
                required
                value={walkInForm.lastName}
                onChange={(e) => setWalkInForm({ ...walkInForm, lastName: e.target.value })}
              />
            </label>
          </div>
          <label>
            {t.admin.phone}
            <input
              type="tel"
              value={walkInForm.phone}
              onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
            />
          </label>
          <label>
            {t.admin.pickService}
            <select
              required
              value={walkInForm.serviceId}
              onChange={(e) => {
                const serviceId = e.target.value
                const allowed = masters.filter((m) => m.isActive && m.specialties.includes(serviceId))
                setWalkInForm((prev) => ({
                  ...prev,
                  serviceId,
                  masterId: allowed.some((m) => m.id === prev.masterId) ? prev.masterId : '',
                  slot: '',
                }))
              }}
            >
              <option value="">—</option>
              {services
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name[locale]}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {t.admin.pickMaster}
            <select
              required
              value={walkInForm.masterId}
              onChange={(e) =>
                setWalkInForm({ ...walkInForm, masterId: e.target.value, slot: '' })
              }
            >
              <option value="">—</option>
              {walkInMasters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {walkInForm.masterId && walkInForm.serviceId ? (
            <div className="admin__walkin-schedule">
              <span>{t.admin.pickDate}</span>
              <DatePicker
                value={walkInForm.date}
                onChange={(date) => setWalkInForm({ ...walkInForm, date, slot: '' })}
                locale={locale}
                calendarLabel={t.booking.calendar}
                masterName={walkInMaster?.name}
                withMasterLabel={t.booking.withMaster}
                workingDays={walkInWorkingDays}
                closedLabel={t.admin.closedDay}
              />
              <span>{t.admin.pickSlot}</span>
              {walkInDayOff ? (
                <p className="admin__slot-empty">{t.admin.closedDay}</p>
              ) : walkInSlots.length === 0 ? (
                <p className="admin__slot-empty">{t.admin.noSlots}</p>
              ) : (
                <div className="admin__slot-grid">
                  {walkInSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={`admin__slot ${walkInForm.slot === time ? 'is-selected' : ''}`}
                      onClick={() => setWalkInForm({ ...walkInForm, slot: time })}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="portal__hint">{t.admin.pickServiceMaster}</p>
          )}
          <label>
            {t.admin.bookingNotes}
            <textarea
              rows={2}
              value={walkInForm.notes}
              onChange={(e) => setWalkInForm({ ...walkInForm, notes: e.target.value })}
            />
          </label>
          <div className="admin__form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setWalkInModal(false)}>
              {t.client.cancel}
            </button>
            <button
              className="btn btn-primary"
              disabled={walkInBusy || walkInDayOff || !walkInForm.slot}
            >
              {t.admin.bookWalkIn}
            </button>
          </div>
        </form>
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
              {t.admin.headlineRu}
              <input
                required
                value={promoForm.headlineRu}
                onChange={(e) => setPromoForm({ ...promoForm, headlineRu: e.target.value })}
              />
            </label>
            <label>
              {t.admin.headlineDe}
              <input
                required
                value={promoForm.headlineDe}
                onChange={(e) => setPromoForm({ ...promoForm, headlineDe: e.target.value })}
              />
            </label>
          </div>
          <label>
            {t.admin.bodyRu}
            <textarea
              rows={2}
              required
              value={promoForm.bodyRu}
              onChange={(e) => setPromoForm({ ...promoForm, bodyRu: e.target.value })}
            />
          </label>
          <label>
            {t.admin.bodyDe}
            <textarea
              rows={2}
              required
              value={promoForm.bodyDe}
              onChange={(e) => setPromoForm({ ...promoForm, bodyDe: e.target.value })}
            />
          </label>
          <label>
            {t.admin.discountPct}
            <input
              type="number"
              value={promoForm.discountPct}
              onChange={(e) => setPromoForm({ ...promoForm, discountPct: Number(e.target.value) })}
            />
          </label>
          <div className="admin__form-grid admin__form-grid--2">
            <label>
              {t.admin.promoStarts}
              <input
                type="date"
                value={promoForm.startsAt}
                onChange={(e) => setPromoForm({ ...promoForm, startsAt: e.target.value })}
              />
            </label>
            <label>
              {t.admin.promoEnds}
              <input
                type="date"
                value={promoForm.endsAt}
                min={promoForm.startsAt || undefined}
                onChange={(e) => setPromoForm({ ...promoForm, endsAt: e.target.value })}
              />
            </label>
          </div>
          <p className="portal__hint">{t.admin.promoPeriodHint}</p>
          <label className="admin__check">
            <input
              type="checkbox"
              checked={promoForm.isActive}
              onChange={(e) => setPromoForm({ ...promoForm, isActive: e.target.checked })}
            />
            {t.admin.promoActive}
          </label>
          <div className="admin__checkboxes">
            {services
              .filter((s) => s.isActive || promoForm.serviceIds.includes(s.id))
              .map((s) => (
              <label key={s.id} className="admin__check">
                <input
                  type="checkbox"
                  checked={promoForm.serviceIds.includes(s.id)}
                  onChange={() => togglePromoService(s.id)}
                />
                {s.name[locale]}
                {!s.isActive ? ` (${t.admin.inactive})` : ''}
              </label>
            ))}
          </div>
          <div className="admin__form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPromoModal(null)}>
              {t.admin.cancel}
            </button>
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
