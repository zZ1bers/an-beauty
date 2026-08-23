/**
 * From this salon calendar date (Europe/Berlin), master time is CLOSED by default.
 * Masters must explicitly open days/slots (MasterOpen). Before this date, the old
 * model applies: WorkingHours open minus TimeOff.
 */
export const DEFAULT_CLOSED_FROM = '2026-10-01'

export function isDefaultClosedDate(dateStr: string) {
  return dateStr >= DEFAULT_CLOSED_FROM
}
