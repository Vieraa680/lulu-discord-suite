export interface AllowedCheckResult {
  allowed: boolean
  isConfigured: boolean
}

/**
 * Validates if a Discord user snowflake ID is authorized to access the CRM Dashboard.
 * 
 * If ALLOWED_DISCORD_IDS is not configured in the environment, returns { allowed: true, isConfigured: false }
 * to allow the developer to perform initial setup without being locked out.
 */
export function isDiscordIdAllowed(discordId?: string | null): AllowedCheckResult {
  const rawAllowed = process.env.ALLOWED_DISCORD_IDS?.trim()
  
  if (!rawAllowed) {
    return { allowed: true, isConfigured: false }
  }

  const allowedList = rawAllowed
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)

  if (allowedList.length === 0) {
    return { allowed: true, isConfigured: false }
  }

  if (!discordId) {
    return { allowed: false, isConfigured: true }
  }

  return {
    allowed: allowedList.includes(discordId),
    isConfigured: true,
  }
}
