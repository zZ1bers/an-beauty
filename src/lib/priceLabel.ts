/** "70" or "70-180" / "70–180" → from + optional to. */
export function parsePriceInput(raw: string): { price: number; priceMax: number | null } | null {
  const cleaned = raw.trim().replace(/€/g, '').replace(/\s/g, '').replace(',', '.')
  const m = cleaned.match(/^(\d+(?:\.\d+)?)(?:[-–—](\d+(?:\.\d+)?))?$/)
  if (!m) return null
  const price = Number(m[1])
  if (!Number.isFinite(price) || price < 0) return null
  if (m[2] == null) return { price, priceMax: null }
  const priceMax = Number(m[2])
  if (!Number.isFinite(priceMax) || priceMax < price) return null
  if (priceMax === price) return { price, priceMax: null }
  return { price, priceMax }
}

export function formatPriceInput(price: number, priceMax?: number | null) {
  if (priceMax != null && priceMax > price) return `${trimNum(price)}-${trimNum(priceMax)}`
  return trimNum(price)
}

export function formatPriceLabel(price: number, priceMax?: number | null) {
  if (priceMax != null && priceMax > price) return `€${trimNum(price)}–${trimNum(priceMax)}`
  return `€${trimNum(price)}`
}

function trimNum(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
}
