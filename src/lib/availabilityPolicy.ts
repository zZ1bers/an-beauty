/** Same policy as server — keep in sync with server/src/lib/availabilityPolicy.ts */
export const DEFAULT_CLOSED_FROM = '2026-10-01'

export function isDefaultClosedDate(dateStr: string) {
  return dateStr >= DEFAULT_CLOSED_FROM
}
