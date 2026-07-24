import bcrypt from 'bcryptjs'
import { PrismaClient, BookingStatus, Role, Locale } from '@prisma/client'

const prisma = new PrismaClient()

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

function at(date: string, time: string) {
  return new Date(`${date}T${time}:00`)
}

function endAt(start: Date, durationMin: number) {
  return new Date(start.getTime() + durationMin * 60_000)
}

async function main() {
  await prisma.notification.deleteMany()
  await prisma.clientNote.deleteMany()
  await prisma.promoService.deleteMany()
  await prisma.promo.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.timeOff.deleteMany()
  await prisma.workingHours.deleteMany()
  await prisma.masterService.deleteMany()
  await prisma.service.deleteMany()
  await prisma.serviceCategory.deleteMany()
  await prisma.clientProfile.deleteMany()
  await prisma.masterProfile.deleteMany()
  await prisma.user.deleteMany()

  const categories = await Promise.all(
    [
      { slug: 'face', icon: '✦', nameRu: 'Лицо', nameDe: 'Gesicht', sortOrder: 1 },
      { slug: 'body', icon: '◎', nameRu: 'Тело', nameDe: 'Körper', sortOrder: 2 },
      { slug: 'nails', icon: '◇', nameRu: 'Ногти', nameDe: 'Nägel', sortOrder: 3 },
      { slug: 'brows', icon: '✧', nameRu: 'Брови & Ресницы', nameDe: 'Brauen & Wimpern', sortOrder: 4 },
      { slug: 'inject', icon: '◈', nameRu: 'Инъекции', nameDe: 'Injektionen', sortOrder: 5 },
      { slug: 'spa', icon: '○', nameRu: 'SPA & Wellness', nameDe: 'SPA & Wellness', sortOrder: 6 },
    ].map((c) => prisma.serviceCategory.create({ data: c })),
  )

  const cat = Object.fromEntries(categories.map((c) => [c.slug, c.id]))

  const serviceDefs = [
    {
      slug: 'hydrafacial',
      categoryId: cat.face,
      nameRu: 'HydraFacial Platinum',
      nameDe: 'HydraFacial Platinum',
      descriptionRu: 'Глубокое очищение, экстракция и интенсивная гидратация с сыворотками премиум-класса.',
      descriptionDe: 'Tiefenreinigung, Extraktion und intensive Hydration mit Premium-Seren.',
      price: 180,
      durationMin: 75,
      imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80',
      featured: true,
      sortOrder: 1,
    },
    {
      slug: 'peel',
      categoryId: cat.face,
      nameRu: 'Химический пилинг Soft Glow',
      nameDe: 'Chemisches Peeling Soft Glow',
      descriptionRu: 'Мягкое обновление кожи с контролируемой кислотностью и пост-уходом.',
      descriptionDe: 'Sanfte Hauterneuerung mit kontrollierter Säure und Aftercare.',
      price: 140,
      durationMin: 60,
      imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1200&q=80',
      sortOrder: 2,
    },
    {
      slug: 'massage',
      categoryId: cat.body,
      nameRu: 'Скульптурный массаж тела',
      nameDe: 'Skulpturalmassage',
      descriptionRu: 'Авторская техника моделирования силуэта и лимфодренажа.',
      descriptionDe: 'Autorentechnik zur Silhouette und Lymphdrainage.',
      price: 160,
      durationMin: 90,
      imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80',
      featured: true,
      sortOrder: 3,
    },
    {
      slug: 'manicure',
      categoryId: cat.nails,
      nameRu: 'Japanese Manicure Ritual',
      nameDe: 'Japanese Manicure Ritual',
      descriptionRu: 'Уходовый японский маникюр с полировкой и питательными маслами.',
      descriptionDe: 'Japanische Pflege-Maniküre mit Politur und Nährölen.',
      price: 75,
      durationMin: 60,
      imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80',
      sortOrder: 4,
    },
    {
      slug: 'spa',
      categoryId: cat.spa,
      nameRu: 'AN Signature SPA',
      nameDe: 'AN Signature SPA',
      descriptionRu: '90 минут сенсорного отдыха: ароматы, тепло, массаж и уход за лицом.',
      descriptionDe: '90 Minuten sensorische Erholung: Düfte, Wärme, Massage und Gesichtspflege.',
      price: 240,
      durationMin: 90,
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80',
      featured: true,
      sortOrder: 5,
    },
    {
      slug: 'botox',
      categoryId: cat.inject,
      nameRu: 'Коррекция мимических морщин',
      nameDe: 'Mimikfalten-Korrektur',
      descriptionRu: 'Точная работа с мимикой под контролем врача-косметолога.',
      descriptionDe: 'Präzise Mimikarbeit unter ärztlicher Kontrolle.',
      price: 320,
      durationMin: 45,
      imageUrl: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1200&q=80',
      sortOrder: 6,
    },
    {
      slug: 'brows',
      categoryId: cat.brows,
      nameRu: 'Архитектура бровей',
      nameDe: 'Brauenarchitektur',
      descriptionRu: 'Коррекция формы, окрашивание и ламинирование в едином ритуале.',
      descriptionDe: 'Formkorrektur, Färbung und Lamination in einem Ritual.',
      price: 95,
      durationMin: 75,
      imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=1200&q=80',
      featured: true,
      sortOrder: 7,
    },
    {
      slug: 'lash',
      categoryId: cat.brows,
      nameRu: 'Ламинирование ресниц',
      nameDe: 'Wimpernlifting',
      descriptionRu: 'Лифтинг, питание и окрашивание для открытого взгляда.',
      descriptionDe: 'Lifting, Pflege und Färbung für einen offenen Blick.',
      price: 85,
      durationMin: 60,
      imageUrl: 'https://images.unsplash.com/photo-1583003879557-c4756ea09f4d?w=1200&q=80',
      sortOrder: 8,
    },
  ]

  const services = await Promise.all(serviceDefs.map((s) => prisma.service.create({ data: s })))
  const svc = Object.fromEntries(services.map((s) => [s.slug, s]))

  const admin = await prisma.user.create({
    data: {
      email: 'admin@an.beauty',
      passwordHash: await hashPassword('admin123'),
      role: Role.ADMIN,
      firstName: 'AN',
      lastName: 'Admin',
      locale: Locale.ru,
    },
  })

  const masterUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'elena@an.beauty',
        passwordHash: await hashPassword('master123'),
        role: Role.MASTER,
        firstName: 'Elena',
        lastName: 'Voss',
        phone: '+49 170 1000001',
        locale: Locale.de,
        masterProfile: {
          create: {
            roleRu: 'Косметолог-эстетист',
            roleDe: 'Kosmetologin',
            bioRu: 'Специалист по аппаратной косметологии и anti-age протоколам.',
            bioDe: 'Spezialistin für Geräte-Kosmetik und Anti-Age-Protokolle.',
            imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
            rating: 4.98,
            sortOrder: 1,
          },
        },
      },
      include: { masterProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'mara@an.beauty',
        passwordHash: await hashPassword('master123'),
        role: Role.MASTER,
        firstName: 'Mara',
        lastName: 'Klein',
        phone: '+49 170 1000002',
        locale: Locale.de,
        masterProfile: {
          create: {
            roleRu: 'SPA & Body Expert',
            roleDe: 'SPA & Body Expertin',
            bioRu: 'Автор скульптурных техник массажа и wellness-ритуалов.',
            bioDe: 'Autorin skulpturaler Massage- und Wellness-Rituale.',
            imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
            rating: 4.95,
            sortOrder: 2,
          },
        },
      },
      include: { masterProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'sofia@an.beauty',
        passwordHash: await hashPassword('master123'),
        role: Role.MASTER,
        firstName: 'Sofia',
        lastName: 'Ren',
        phone: '+49 170 1000003',
        locale: Locale.ru,
        masterProfile: {
          create: {
            roleRu: 'Brows & Lash Artist',
            roleDe: 'Brows & Lash Artist',
            bioRu: 'Архитектура бровей и выразительный взгляд — её подпись.',
            bioDe: 'Brauenarchitektur und ausdrucksstarker Blick — ihre Signatur.',
            imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
            rating: 5.0,
            sortOrder: 3,
          },
        },
      },
      include: { masterProfile: true },
    }),
  ])

  const [elena, mara, sofia] = masterUsers.map((u) => u.masterProfile!)

  await prisma.masterService.createMany({
    data: [
      { masterId: elena.id, serviceId: svc.hydrafacial.id },
      { masterId: elena.id, serviceId: svc.peel.id },
      { masterId: elena.id, serviceId: svc.botox.id },
      { masterId: mara.id, serviceId: svc.massage.id },
      { masterId: mara.id, serviceId: svc.spa.id },
      { masterId: sofia.id, serviceId: svc.brows.id },
      { masterId: sofia.id, serviceId: svc.lash.id },
      { masterId: sofia.id, serviceId: svc.manicure.id },
    ],
  })

  // Mon–Sat 09:00–18:00 for all masters
  for (const master of [elena, mara, sofia]) {
    await prisma.workingHours.createMany({
      data: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        masterId: master.id,
        dayOfWeek,
        startTime: '09:00',
        endTime: '18:00',
      })),
    })
  }

  const clients = await Promise.all([
    prisma.user.create({
      data: {
        email: 'you@an.beauty',
        passwordHash: await hashPassword('client123'),
        role: Role.CLIENT,
        firstName: 'You',
        lastName: 'Client',
        phone: '+49 170 2000000',
        locale: Locale.ru,
        clientProfile: {
          create: {
            crmNotes: 'Демо-клиент кабинета',
            totalVisits: 2,
            totalSpent: 255,
          },
        },
      },
      include: { clientProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'anna@example.com',
        passwordHash: await hashPassword('client123'),
        role: Role.CLIENT,
        firstName: 'Anna',
        lastName: 'M.',
        locale: Locale.ru,
        clientProfile: {
          create: {
            allergies: 'Чувствительная кожа',
            totalVisits: 1,
            totalSpent: 180,
          },
        },
      },
      include: { clientProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'lisa@example.com',
        passwordHash: await hashPassword('client123'),
        role: Role.CLIENT,
        firstName: 'Lisa',
        lastName: 'K.',
        locale: Locale.de,
        clientProfile: { create: { totalVisits: 1, totalSpent: 95 } },
      },
      include: { clientProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'nina@example.com',
        passwordHash: await hashPassword('client123'),
        role: Role.CLIENT,
        firstName: 'Nina',
        lastName: 'P.',
        locale: Locale.ru,
        clientProfile: { create: { totalVisits: 1, totalSpent: 240 } },
      },
      include: { clientProfile: true },
    }),
  ])

  const [you, anna, lisa, nina] = clients.map((c) => c.clientProfile!)

  const bookingDefs = [
    {
      clientId: anna.id,
      masterId: elena.id,
      service: svc.hydrafacial,
      startsAt: at('2026-07-21', '10:30'),
      status: BookingStatus.CONFIRMED,
      notes: 'Чувствительная кожа, без кислот',
    },
    {
      clientId: lisa.id,
      masterId: sofia.id,
      service: svc.brows,
      startsAt: at('2026-07-21', '14:15'),
      status: BookingStatus.CONFIRMED,
    },
    {
      clientId: nina.id,
      masterId: mara.id,
      service: svc.spa,
      startsAt: at('2026-07-18', '16:30'),
      status: BookingStatus.COMPLETED,
    },
    {
      clientId: you.id,
      masterId: sofia.id,
      service: svc.manicure,
      startsAt: at('2026-07-25', '12:00'),
      status: BookingStatus.CONFIRMED,
    },
    {
      clientId: you.id,
      masterId: elena.id,
      service: svc.hydrafacial,
      startsAt: at('2026-06-12', '11:15'),
      status: BookingStatus.COMPLETED,
    },
  ]

  for (const b of bookingDefs) {
    await prisma.booking.create({
      data: {
        clientId: b.clientId,
        masterId: b.masterId,
        serviceId: b.service.id,
        startsAt: b.startsAt,
        endsAt: endAt(b.startsAt, b.service.durationMin),
        status: b.status,
        priceSnapshot: b.service.price,
        notes: b.notes,
        createdBy: admin.id,
      },
    })
  }

  await prisma.clientNote.create({
    data: {
      clientId: anna.id,
      authorId: elena.userId,
      masterId: elena.id,
      body: 'Чувствительная кожа — избегать кислот, предпочитает HydraFacial.',
    },
  })

  const promo = await prisma.promo.create({
    data: {
      headlineRu: 'Summer Glow Ritual',
      headlineDe: 'Summer Glow Ritual',
      bodyRu: '−20% на HydraFacial + Brow Architecture до конца июля',
      bodyDe: '−20% auf HydraFacial + Brow Architecture bis Ende Juli',
      discountPct: 20,
      startsAt: new Date('2026-07-01'),
      endsAt: new Date('2026-07-31'),
      isActive: true,
    },
  })

  await prisma.promoService.createMany({
    data: [
      { promoId: promo.id, serviceId: svc.hydrafacial.id },
      { promoId: promo.id, serviceId: svc.brows.id },
    ],
  })

  await prisma.notification.createMany({
    data: [
      {
        userId: clients[0].id,
        type: 'BOOKING',
        title: 'Запись подтверждена',
        body: 'Japanese Manicure Ritual — 25 Jul, 12:00',
      },
      {
        userId: clients[0].id,
        type: 'PROMO',
        title: 'Summer Glow Ritual',
        body: '−20% на HydraFacial + Brow Architecture',
      },
    ],
  })

  console.log('Seed OK')
  console.log('  admin@an.beauty / admin123')
  console.log('  elena@an.beauty (mara/sofia) / master123')
  console.log('  you@an.beauty / client123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
