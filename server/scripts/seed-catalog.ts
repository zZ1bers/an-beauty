/**
 * Upsert AN.Beauty price list (categories + services). Safe to re-run.
 * Does not wipe bookings/users. Photos stay empty — add later in admin.
 *
 *   npm run db:seed-catalog
 *   # or in Docker:
 *   docker compose ... exec api npm run db:seed-catalog
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Cat = {
  slug: string
  icon: string
  nameRu: string
  nameDe: string
  sortOrder: number
}

type Svc = {
  slug: string
  nameRu: string
  nameDe: string
  descriptionRu: string
  descriptionDe: string
  price: number
  durationMin: number
  sortOrder: number
  featured?: boolean
}

const catalog: { category: Cat; services: Svc[] }[] = [
  {
    category: {
      slug: 'haarstyling',
      icon: '💇',
      nameRu: 'Укладка волос',
      nameDe: 'Haarstyling',
      sortOrder: 1,
    },
    services: [
      {
        slug: 'brushing',
        nameRu: 'Брашинг',
        nameDe: 'Brushing (Föhnen mit Rundbürste)',
        descriptionRu:
          'Мытьё головы, термозащита, стайлинговые средства, укладка круглой щеткой, финиш. Цена 45–80 € · 60–90 мин.',
        descriptionDe:
          'Haarwäsche, Hitzeschutz, Stylingprodukte, Föhnen mit der Rundbürste, Finish. Preis 45–80 € · 60–90 Min.',
        price: 45,
        durationMin: 90,
        sortOrder: 1,
        featured: true,
      },
      {
        slug: 'waschen-foehnen-styling',
        nameRu: 'Мытьё головы, сушка феном и укладка',
        nameDe: 'Waschen, Föhnen & Styling',
        descriptionRu: 'Мытьё головы, сушка феном, финиш. Цена 35–65 € · 45–60 мин.',
        descriptionDe: 'Haarwäsche, Föhnen, Finish. Preis 35–65 € · 45–60 Min.',
        price: 35,
        durationMin: 60,
        sortOrder: 2,
      },
      {
        slug: 'abendfrisur',
        nameRu: 'Вечерняя прическа',
        nameDe: 'Abendfrisur',
        descriptionRu: 'От 70 € · 60–90 мин.',
        descriptionDe: 'Ab 70 € · 60–90 Min.',
        price: 70,
        durationMin: 90,
        sortOrder: 3,
        featured: true,
      },
    ],
  },
  {
    category: {
      slug: 'make-up',
      icon: '💄',
      nameRu: 'Макияж',
      nameDe: 'Make-up',
      sortOrder: 2,
    },
    services: [
      {
        slug: 'tages-make-up',
        nameRu: 'Дневной макияж',
        nameDe: 'Tages-Make-up',
        descriptionRu: '45–60 мин.',
        descriptionDe: '45–60 Min.',
        price: 55,
        durationMin: 60,
        sortOrder: 1,
        featured: true,
      },
      {
        slug: 'abend-make-up',
        nameRu: 'Вечерний макияж',
        nameDe: 'Abend-Make-up',
        descriptionRu: '60 мин.',
        descriptionDe: '60 Min.',
        price: 70,
        durationMin: 60,
        sortOrder: 2,
      },
      {
        slug: 'braut-make-up',
        nameRu: 'Свадебный макияж',
        nameDe: 'Braut-Make-up',
        descriptionRu: '60–90 мин.',
        descriptionDe: '60–90 Min.',
        price: 120,
        durationMin: 90,
        sortOrder: 3,
        featured: true,
      },
    ],
  },
  {
    category: {
      slug: 'manikuere',
      icon: '💅',
      nameRu: 'Маникюр',
      nameDe: 'Maniküre',
      sortOrder: 3,
    },
    services: [
      {
        slug: 'hygienische-manikuere',
        nameRu: 'Гигиенический маникюр',
        nameDe: 'Hygienische Maniküre',
        descriptionRu: '1 час',
        descriptionDe: '1 Stunde',
        price: 35,
        durationMin: 60,
        sortOrder: 1,
        featured: true,
      },
      {
        slug: 'naturnagelverstaerkung-kurz',
        nameRu: 'Укрепление коротких ногтей',
        nameDe: 'Naturnagelverstärkung – kurze Nägel',
        descriptionRu: '2 часа',
        descriptionDe: '2 Stunden',
        price: 50,
        durationMin: 120,
        sortOrder: 2,
      },
      {
        slug: 'naturnagelverstaerkung-mittel',
        nameRu: 'Укрепление средней длины',
        nameDe: 'Naturnagelverstärkung – mittlere Länge',
        descriptionRu: '2 часа',
        descriptionDe: '2 Stunden',
        price: 55,
        durationMin: 120,
        sortOrder: 3,
      },
      {
        slug: 'naturnagelverstaerkung-lang',
        nameRu: 'Укрепление длинных ногтей',
        nameDe: 'Naturnagelverstärkung – lange Nägel',
        descriptionRu: '2 часа',
        descriptionDe: '2 Stunden',
        price: 60,
        durationMin: 120,
        sortOrder: 4,
      },
      {
        slug: 'nagelverlaengerung-kurz',
        nameRu: 'Наращивание коротких ногтей',
        nameDe: 'Nagelverlängerung – kurze Nägel',
        descriptionRu: '2,5 часа',
        descriptionDe: '2,5 Stunden',
        price: 70,
        durationMin: 150,
        sortOrder: 5,
      },
      {
        slug: 'nagelverlaengerung-lang',
        nameRu: 'Наращивание длинных ногтей',
        nameDe: 'Nagelverlängerung – lange Nägel',
        descriptionRu: '2,5 часа',
        descriptionDe: '2,5 Stunden',
        price: 80,
        durationMin: 150,
        sortOrder: 6,
      },
      {
        slug: 'nagel-design',
        nameRu: 'Дизайн',
        nameDe: 'Design',
        descriptionRu: 'Доплата к маникюру +5 €',
        descriptionDe: 'Aufpreis zur Maniküre +5 €',
        price: 5,
        durationMin: 15,
        sortOrder: 7,
      },
    ],
  },
  {
    category: {
      slug: 'pedikuere',
      icon: '🦶',
      nameRu: 'Педикюр',
      nameDe: 'Pediküre',
      sortOrder: 4,
    },
    services: [
      {
        slug: 'hygienische-pedikuere',
        nameRu: 'Гигиенический педикюр',
        nameDe: 'Hygienische Pediküre',
        descriptionRu: '1 час',
        descriptionDe: '1 Stunde',
        price: 50,
        durationMin: 60,
        sortOrder: 1,
      },
      {
        slug: 'pedikuere-gel-lack',
        nameRu: 'Педикюр с покрытием',
        nameDe: 'Pediküre mit Gel-Lack',
        descriptionRu: '2 часа',
        descriptionDe: '2 Stunden',
        price: 65,
        durationMin: 120,
        sortOrder: 2,
        featured: true,
      },
    ],
  },
]

async function main() {
  let cats = 0
  let svcs = 0

  for (const block of catalog) {
    const category = await prisma.serviceCategory.upsert({
      where: { slug: block.category.slug },
      create: {
        slug: block.category.slug,
        icon: block.category.icon,
        nameRu: block.category.nameRu,
        nameDe: block.category.nameDe,
        sortOrder: block.category.sortOrder,
        isActive: true,
      },
      update: {
        icon: block.category.icon,
        nameRu: block.category.nameRu,
        nameDe: block.category.nameDe,
        sortOrder: block.category.sortOrder,
        isActive: true,
      },
    })
    cats += 1

    for (const s of block.services) {
      await prisma.service.upsert({
        where: { slug: s.slug },
        create: {
          categoryId: category.id,
          slug: s.slug,
          nameRu: s.nameRu,
          nameDe: s.nameDe,
          descriptionRu: s.descriptionRu,
          descriptionDe: s.descriptionDe,
          price: s.price,
          durationMin: s.durationMin,
          imageUrl: '',
          featured: s.featured ?? false,
          sortOrder: s.sortOrder,
          isActive: true,
        },
        update: {
          categoryId: category.id,
          nameRu: s.nameRu,
          nameDe: s.nameDe,
          descriptionRu: s.descriptionRu,
          descriptionDe: s.descriptionDe,
          price: s.price,
          durationMin: s.durationMin,
          featured: s.featured ?? false,
          sortOrder: s.sortOrder,
          isActive: true,
          // imageUrl not overwritten — keep photos once uploaded
        },
      })
      svcs += 1
    }
  }

  console.log(`Catalog seeded: ${cats} categories, ${svcs} services (photos left empty).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
