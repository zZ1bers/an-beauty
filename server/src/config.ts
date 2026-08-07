import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3001}`,
  /** SPA origin for email links (Impressum, login, etc.) */
  frontendUrl: (
    process.env.FRONTEND_URL ||
    (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',')[0] ||
    'http://localhost:5173'
  ).replace(/\/$/, ''),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') !== 'production',
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'AN.Beauty <noreply@an-beauty.com>',
  },
  /** Twilio SMS (optional — logged in dev if missing) */
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_FROM || '',
  },
  salon: {
    addressShort: process.env.SALON_ADDRESS || 'Rückerstr. 4, 90419 Nürnberg',
  },
  /** Obfuscated staff portal path (must match frontend PORTAL_STAFF) */
  staffPortalPath: process.env.STAFF_PORTAL_PATH || '/b3Fh6tY1cJ9sD5uA',
}
