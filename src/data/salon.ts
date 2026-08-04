export type ServiceCategory = {
  id: string
  icon: string
  name: { ru: string; de: string }
}

export type Service = {
  id: string
  categoryId: string
  name: { ru: string; de: string }
  description: { ru: string; de: string }
  price: number
  duration: number
  image: string
  featured?: boolean
}

export type Master = {
  id: string
  name: string
  role: { ru: string; de: string }
  bio: { ru: string; de: string }
  image: string
  rating: number
  openSlots: number
  specialties: string[]
}

export type Booking = {
  id: string
  client: string
  serviceId: string
  masterId: string
  date: string
  time: string
  status: 'confirmed' | 'completed' | 'cancelled'
  notes?: string
}

export const categories: ServiceCategory[] = [
  { id: 'face', icon: '✦', name: { ru: 'Лицо', de: 'Gesicht' } },
  { id: 'body', icon: '◎', name: { ru: 'Тело', de: 'Körper' } },
  { id: 'nails', icon: '◇', name: { ru: 'Ногти', de: 'Nägel' } },
  { id: 'brows', icon: '✧', name: { ru: 'Брови & Ресницы', de: 'Brauen & Wimpern' } },
  { id: 'inject', icon: '◈', name: { ru: 'Инъекции', de: 'Injektionen' } },
  { id: 'spa', icon: '○', name: { ru: 'SPA & Wellness', de: 'SPA & Wellness' } },
]

export const services: Service[] = [
  {
    id: 'hydrafacial',
    categoryId: 'face',
    name: { ru: 'HydraFacial Platinum', de: 'HydraFacial Platinum' },
    description: {
      ru: 'Глубокое очищение, экстракция и интенсивная гидратация с сыворотками премиум-класса.',
      de: 'Tiefenreinigung, Extraktion und intensive Hydration mit Premium-Seren.',
    },
    price: 180,
    duration: 75,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80',
    featured: true,
  },
  {
    id: 'peel',
    categoryId: 'face',
    name: { ru: 'Химический пилинг Soft Glow', de: 'Chemisches Peeling Soft Glow' },
    description: {
      ru: 'Мягкое обновление кожи с контролируемой кислотностью и пост-уходом.',
      de: 'Sanfte Hauterneuerung mit kontrollierter Säure und Aftercare.',
    },
    price: 140,
    duration: 60,
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1200&q=80',
  },
  {
    id: 'massage',
    categoryId: 'body',
    name: { ru: 'Скульптурный массаж тела', de: 'Skulpturalmassage' },
    description: {
      ru: 'Авторская техника моделирования силуэта и лимфодренажа.',
      de: 'Autorentechnik zur Silhouette und Lymphdrainage.',
    },
    price: 160,
    duration: 90,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80',
    featured: true,
  },
  {
    id: 'manicure',
    categoryId: 'nails',
    name: { ru: 'Japanese Manicure Ritual', de: 'Japanese Manicure Ritual' },
    description: {
      ru: 'Уходовый японский маникюр с полировкой и питательными маслами.',
      de: 'Japanische Pflege-Maniküre mit Politur und Nährölen.',
    },
    price: 75,
    duration: 60,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80',
  },
  {
    id: 'spa',
    categoryId: 'spa',
    name: { ru: 'AN Signature SPA', de: 'AN Signature SPA' },
    description: {
      ru: '90 минут сенсорного отдыха: ароматы, тепло, массаж и уход за лицом.',
      de: '90 Minuten sensorische Erholung: Düfte, Wärme, Massage und Gesichtspflege.',
    },
    price: 240,
    duration: 90,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80',
    featured: true,
  },
  {
    id: 'botox',
    categoryId: 'inject',
    name: { ru: 'Коррекция мимических морщин', de: 'Mimikfalten-Korrektur' },
    description: {
      ru: 'Точная работа с мимикой под контролем врача-косметолога.',
      de: 'Präzise Mimikarbeit unter ärztlicher Kontrolle.',
    },
    price: 320,
    duration: 45,
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1200&q=80',
  },
  {
    id: 'brows',
    categoryId: 'brows',
    name: { ru: 'Архитектура бровей', de: 'Brauenarchitektur' },
    description: {
      ru: 'Коррекция формы, окрашивание и ламинирование в едином ритуале.',
      de: 'Formkorrektur, Färbung und Lamination in einem Ritual.',
    },
    price: 95,
    duration: 75,
    image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=1200&q=80',
    featured: true,
  },
  {
    id: 'lash',
    categoryId: 'brows',
    name: { ru: 'Ламинирование ресниц', de: 'Wimpernlifting' },
    description: {
      ru: 'Лифтинг, питание и окрашивание для открытого взгляда.',
      de: 'Lifting, Pflege und Färbung für einen offenen Blick.',
    },
    price: 85,
    duration: 60,
    image: 'https://images.unsplash.com/photo-1583003879557-c4756ea09f4d?w=1200&q=80',
  },
]

export const masters: Master[] = [
  {
    id: 'm1',
    name: 'Elena Voss',
    role: { ru: 'Косметолог-эстетист', de: 'Kosmetologin' },
    bio: {
      ru: 'Специалист по аппаратной косметологии и anti-age протоколам.',
      de: 'Spezialistin für Geräte-Kosmetik und Anti-Age-Protokolle.',
    },
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
    rating: 4.98,
    openSlots: 6,
    specialties: ['hydrafacial', 'peel', 'botox'],
  },
  {
    id: 'm2',
    name: 'Mara Klein',
    role: { ru: 'SPA & Body Expert', de: 'SPA & Body Expertin' },
    bio: {
      ru: 'Автор скульптурных техник массажа и wellness-ритуалов.',
      de: 'Autorin skulpturaler Massage- und Wellness-Rituale.',
    },
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
    rating: 4.95,
    openSlots: 4,
    specialties: ['massage', 'spa'],
  },
  {
    id: 'm3',
    name: 'Sofia Ren',
    role: { ru: 'Brows & Lash Artist', de: 'Brows & Lash Artist' },
    bio: {
      ru: 'Архитектура бровей и выразительный взгляд — её подпись.',
      de: 'Brauenarchitektur und ausdrucksstarker Blick — ihre Signatur.',
    },
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
    rating: 5.0,
    openSlots: 8,
    specialties: ['brows', 'lash', 'manicure'],
  },
]

export const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const total = 8 * 60 + i * 30
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

export const bookings: Booking[] = [
  {
    id: 'b1',
    client: 'Anna M.',
    serviceId: 'hydrafacial',
    masterId: 'm1',
    date: '2026-07-21',
    time: '10:30',
    status: 'confirmed',
    notes: 'Чувствительная кожа, без кислот',
  },
  {
    id: 'b2',
    client: 'Lisa K.',
    serviceId: 'brows',
    masterId: 'm3',
    date: '2026-07-21',
    time: '14:15',
    status: 'confirmed',
  },
  {
    id: 'b3',
    client: 'Nina P.',
    serviceId: 'spa',
    masterId: 'm2',
    date: '2026-07-18',
    time: '16:30',
    status: 'completed',
  },
  {
    id: 'b4',
    client: 'You',
    serviceId: 'manicure',
    masterId: 'm3',
    date: '2026-07-25',
    time: '12:00',
    status: 'confirmed',
  },
  {
    id: 'b5',
    client: 'You',
    serviceId: 'hydrafacial',
    masterId: 'm1',
    date: '2026-06-12',
    time: '11:15',
    status: 'completed',
  },
]

export const promoTexts = {
  ru: {
    headline: 'Summer Glow Ritual',
    body: '−20% на HydraFacial + Brow Architecture до конца июля',
  },
  de: {
    headline: 'Summer Glow Ritual',
    body: '−20% auf HydraFacial + Brow Architecture bis Ende Juli',
  },
}
