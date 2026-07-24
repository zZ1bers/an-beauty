import { prisma } from '../db.js'

export type PromoPrice = {
  original: number
  price: number
  discountPct: number | null
}

export async function resolvePromoPrice(
  serviceId: string,
  basePrice: { toString(): string } | number,
): Promise<PromoPrice> {
  const original = Number(basePrice)
  const now = new Date()

  const promos = await prisma.promo.findMany({
    where: {
      isActive: true,
      discountPct: { gt: 0 },
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    include: { services: { select: { serviceId: true } } },
  })

  let bestPct = 0
  for (const p of promos) {
    const pct = p.discountPct ?? 0
    if (pct <= 0) continue
    const ids = p.services.map((s) => s.serviceId)
    if (ids.length === 0 || ids.includes(serviceId)) {
      bestPct = Math.max(bestPct, pct)
    }
  }

  if (bestPct <= 0) {
    return { original, price: original, discountPct: null }
  }

  const price = Math.round((original * (100 - bestPct)) / 100)
  return { original, price, discountPct: bestPct }
}
