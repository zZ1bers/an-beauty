import { config } from '../config.js'

function smsConfigured() {
  return Boolean(config.sms.accountSid && config.sms.authToken && config.sms.from)
}

/** Normalize DE-friendly phones to E.164 (+49…). */
export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null
  let s = raw.trim().replace(/[\s()-]/g, '')
  if (!s) return null
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  if (s.startsWith('0') && !s.startsWith('00')) s = `+49${s.slice(1)}`
  if (!s.startsWith('+')) s = `+${s}`
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null
  return s
}

export async function sendSms(opts: { to: string; body: string }) {
  const to = normalizePhoneE164(opts.to)
  if (!to) {
    console.warn(`[sms] invalid phone, skip: ${opts.to}`)
    return { ok: false as const, reason: 'INVALID_PHONE' as const }
  }

  if (!smsConfigured()) {
    console.warn(`[sms] Twilio not configured — to ${to}: ${opts.body}`)
    if (config.isDev) return { ok: true as const, logged: true as const }
    return { ok: false as const, reason: 'SMS_NOT_CONFIGURED' as const }
  }

  const auth = Buffer.from(`${config.sms.accountSid}:${config.sms.authToken}`).toString('base64')
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.sms.accountSid}/Messages.json`
  const form = new URLSearchParams({
    To: to,
    From: config.sms.from,
    Body: opts.body,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[sms] Twilio error ${res.status}: ${text}`)
    return { ok: false as const, reason: 'SMS_SEND_FAILED' as const }
  }

  return { ok: true as const, logged: false as const }
}
