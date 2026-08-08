import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'
import { BookingStatus } from '@prisma/client'
import { prisma } from '../db.js'
import { salonDateStr, salonTimeStr } from '../lib/salonTime.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FONT_DIR = path.resolve(__dirname, '../../assets/fonts')
const FONT_REG = path.join(FONT_DIR, 'DejaVuSans.ttf')
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf')

type Locale = 'ru' | 'de'

const copy = {
  ru: {
    title: 'AN.Beauty — отчёт за месяц',
    period: 'Период',
    summary: 'Общая статистика',
    totalBookings: 'Всего записей',
    completed: 'Завершено',
    confirmed: 'Подтверждено',
    pending: 'Ожидает',
    cancelled: 'Отменено',
    noShow: 'Не пришёл',
    uniqueClients: 'Уникальных клиентов',
    revenueCompleted: 'Выручка (завершённые)',
    revenueExpected: 'Ожидаемая сумма (подтверждённые + завершённые)',
    clientsList: 'Клиенты за месяц',
    visits: 'визитов',
    byDay: 'Записи по дням',
    time: 'Время',
    client: 'Клиент',
    service: 'Услуга',
    master: 'Мастер',
    status: 'Статус',
    price: 'Сумма',
    guest: 'без аккаунта',
    empty: 'За этот месяц записей нет.',
    generated: 'Сформировано',
    statuses: {
      PENDING: 'ожидает',
      CONFIRMED: 'подтверждена',
      COMPLETED: 'завершена',
      CANCELLED: 'отменена',
      NO_SHOW: 'не пришёл',
    } as Record<string, string>,
  },
  de: {
    title: 'AN.Beauty — Monatsbericht',
    period: 'Zeitraum',
    summary: 'Gesamtstatistik',
    totalBookings: 'Termine gesamt',
    completed: 'Abgeschlossen',
    confirmed: 'Bestätigt',
    pending: 'Ausstehend',
    cancelled: 'Storniert',
    noShow: 'Nicht erschienen',
    uniqueClients: 'Einzigartige Kunden',
    revenueCompleted: 'Umsatz (abgeschlossen)',
    revenueExpected: 'Erwarteter Betrag (bestätigt + abgeschlossen)',
    clientsList: 'Kunden im Monat',
    visits: 'Besuche',
    byDay: 'Termine nach Tagen',
    time: 'Zeit',
    client: 'Kunde',
    service: 'Leistung',
    master: 'Master',
    status: 'Status',
    price: 'Betrag',
    guest: 'ohne Konto',
    empty: 'Keine Termine in diesem Monat.',
    generated: 'Erstellt',
    statuses: {
      PENDING: 'ausstehend',
      CONFIRMED: 'bestätigt',
      COMPLETED: 'abgeschlossen',
      CANCELLED: 'storniert',
      NO_SHOW: 'nicht erschienen',
    } as Record<string, string>,
  },
} as const

function monthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start, end }
}

function money(n: number) {
  return `€${n.toFixed(2)}`
}

function clientKey(b: {
  clientId: string | null
  guestFirstName: string | null
  guestLastName: string | null
  guestPhone: string | null
  clientName: string
}) {
  if (b.clientId) return `id:${b.clientId}`
  return `guest:${b.clientName.toLowerCase()}|${(b.guestPhone ?? '').trim()}`
}

export async function buildMonthlyReportPdf(input: {
  year: number
  month: number
  locale?: Locale
}): Promise<Buffer> {
  const locale: Locale = input.locale === 'de' ? 'de' : 'ru'
  const t = copy[locale]
  const { start, end } = monthBounds(input.year, input.month)

  const rows = await prisma.booking.findMany({
    where: {
      startsAt: { gte: start, lte: end },
    },
    orderBy: { startsAt: 'asc' },
    include: {
      service: true,
      client: { include: { user: { select: { firstName: true, lastName: true } } } },
      master: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  })

  const mapped = rows.map((b) => {
    const clientName = b.client
      ? `${b.client.user.firstName} ${b.client.user.lastName}`.trim()
      : `${b.guestFirstName ?? ''} ${b.guestLastName ?? ''}`.trim() || 'Walk-in'
    const serviceName = locale === 'de' ? b.service.nameDe : b.service.nameRu
    const masterName = `${b.master.user.firstName} ${b.master.user.lastName}`
    const price = Number(b.priceSnapshot)
    return {
      id: b.id,
      startsAt: b.startsAt,
      status: b.status,
      price,
      clientId: b.clientId,
      guestFirstName: b.guestFirstName,
      guestLastName: b.guestLastName,
      guestPhone: b.guestPhone,
      clientName,
      isGuest: !b.clientId,
      serviceName,
      masterName,
    }
  })

  const counts = {
    total: mapped.length,
    PENDING: 0,
    CONFIRMED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    NO_SHOW: 0,
  }
  let revenueCompleted = 0
  let revenueExpected = 0

  const clientMap = new Map<string, { name: string; isGuest: boolean; visits: number; spent: number }>()

  for (const b of mapped) {
    counts[b.status] += 1
    if (b.status === BookingStatus.COMPLETED) revenueCompleted += b.price
    if (b.status === BookingStatus.COMPLETED || b.status === BookingStatus.CONFIRMED) {
      revenueExpected += b.price
    }
    if (b.status === BookingStatus.CANCELLED) continue
    const key = clientKey(b)
    const cur = clientMap.get(key) ?? {
      name: b.clientName,
      isGuest: b.isGuest,
      visits: 0,
      spent: 0,
    }
    cur.visits += 1
    if (b.status === BookingStatus.COMPLETED) cur.spent += b.price
    clientMap.set(key, cur)
  }

  const clients = [...clientMap.values()].sort((a, b) => a.name.localeCompare(b.name, locale))

  const byDay = new Map<string, typeof mapped>()
  for (const b of mapped) {
    const day = salonDateStr(b.startsAt)
    const list = byDay.get(day) ?? []
    list.push(b)
    byDay.set(day, list)
  }

  const monthLabel = start.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'de-DE', {
    timeZone: 'Europe/Berlin',
    month: 'long',
    year: 'numeric',
  })

  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    info: {
      Title: `${t.title} — ${monthLabel}`,
      Author: 'AN.Beauty',
    },
  })

  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  doc.registerFont('Regular', FONT_REG)
  doc.registerFont('Bold', FONT_BOLD)

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

  const ensureSpace = (need: number) => {
    if (doc.y + need > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
    }
  }

  doc.font('Bold').fontSize(18).fillColor('#1a1512').text(t.title, { width: pageWidth })
  doc.moveDown(0.35)
  doc.font('Regular').fontSize(11).fillColor('#3a2f28').text(`${t.period}: ${monthLabel}`)
  doc
    .fontSize(9)
    .fillColor('#6b5f57')
    .text(`${t.generated}: ${new Date().toLocaleString(locale === 'ru' ? 'ru-RU' : 'de-DE')}`)
  doc.moveDown(1)

  doc.font('Bold').fontSize(13).fillColor('#1a1512').text(t.summary)
  doc.moveDown(0.4)
  doc.font('Regular').fontSize(10).fillColor('#3a2f28')

  const summaryLines = [
    `${t.totalBookings}: ${counts.total}`,
    `${t.completed}: ${counts.COMPLETED}`,
    `${t.confirmed}: ${counts.CONFIRMED}`,
    `${t.pending}: ${counts.PENDING}`,
    `${t.cancelled}: ${counts.CANCELLED}`,
    `${t.noShow}: ${counts.NO_SHOW}`,
    `${t.uniqueClients}: ${clients.length}`,
    `${t.revenueCompleted}: ${money(revenueCompleted)}`,
    `${t.revenueExpected}: ${money(revenueExpected)}`,
  ]
  for (const line of summaryLines) {
    doc.text(`• ${line}`)
  }

  doc.moveDown(1)
  doc.font('Bold').fontSize(13).fillColor('#1a1512').text(t.clientsList)
  doc.moveDown(0.4)

  if (clients.length === 0) {
    doc.font('Regular').fontSize(10).fillColor('#6b5f57').text(t.empty)
  } else {
    doc.font('Regular').fontSize(10).fillColor('#3a2f28')
    for (const c of clients) {
      ensureSpace(16)
      const guestTag = c.isGuest ? ` (${t.guest})` : ''
      const spent = c.spent > 0 ? ` · ${money(c.spent)}` : ''
      doc.text(`• ${c.name}${guestTag} — ${c.visits} ${t.visits}${spent}`)
    }
  }

  doc.moveDown(1)
  doc.font('Bold').fontSize(13).fillColor('#1a1512').text(t.byDay)
  doc.moveDown(0.5)

  if (byDay.size === 0) {
    doc.font('Regular').fontSize(10).fillColor('#6b5f57').text(t.empty)
  } else {
    for (const [day, items] of byDay) {
      ensureSpace(40)
      const [y, m, d] = day.split('-').map(Number)
      const dayTitle = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(
        locale === 'ru' ? 'ru-RU' : 'de-DE',
        {
          timeZone: 'UTC',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      )
      doc.font('Bold').fontSize(11).fillColor('#1a1512').text(dayTitle)
      doc.moveDown(0.25)

      for (const b of items) {
        ensureSpace(28)
        const time = salonTimeStr(b.startsAt)
        const status = t.statuses[b.status] ?? b.status
        const guestTag = b.isGuest ? ` (${t.guest})` : ''
        doc
          .font('Bold')
          .fontSize(9.5)
          .fillColor('#1a1512')
          .text(`${time}  ·  ${b.clientName}${guestTag}`, { continued: false })
        doc
          .font('Regular')
          .fontSize(9)
          .fillColor('#3a2f28')
          .text(
            `${b.serviceName} · ${b.masterName} · ${status} · ${money(b.price)}`,
            { indent: 12 },
          )
        doc.moveDown(0.2)
      }
      doc.moveDown(0.45)
    }
  }

  doc.end()
  return done
}
