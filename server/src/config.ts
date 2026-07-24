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
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') !== 'production',
}
