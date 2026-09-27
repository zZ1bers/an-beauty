/** Strip phones and emails so master-facing text cannot leak client contacts. */
export function redactContactText(text: string | null | undefined): string | null {
  if (!text) return null
  const cleaned = text
    .split('\n')
    .filter((line) => !/^\s*(e-?mail|email|телефон|phone|tel)\s*:/i.test(line))
    .join('\n')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '')
    .replace(/(?:\+|00)?\d[\d\s().\-/]{6,}\d/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return cleaned || null
}
