const REQUIRED = [
  'DATABASE_URL',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
]

export function validateEnv(): void {
  const missing: string[] = []
  for (const k of REQUIRED) {
    if (!process.env[k]) missing.push(k)
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}
