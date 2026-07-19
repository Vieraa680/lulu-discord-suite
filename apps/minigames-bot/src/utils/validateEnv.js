const REQUIRED = [
  'DISCORD_TOKEN',
  'DATABASE_URL',
  'GUILD_ID'
]

function validateEnv() {
  const missing = []
  for (const k of REQUIRED) {
    if (!process.env[k]) missing.push(k)
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}

module.exports = validateEnv
