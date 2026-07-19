class CommandRateLimiter {
  constructor() {
    this.map = new Map()
    // Default cooldowns in seconds per command (base name)
    this.defaults = {
      catch: 5,
      polymorphia: 5,
      stats: 3,
      ping: 1,
    }
    // Allow overriding defaults via env var, e.g. RATE_LIMIT_OVERRIDES='{"duel":10}'
    this.overrides = this._loadOverrides()
  }

  _loadOverrides() {
    try {
      const raw = process.env.RATE_LIMIT_OVERRIDES
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null) return parsed
      return {}
    } catch {
      return {}
    }
  }

  _key(userId, commandName) {
    return `${userId}|${commandName}`
  }

  /**
   * Check if a user is rate-limited for a command.
   * @param {string} userId
   * @param {string} commandName
   * @param {boolean} isAdmin - bypass rate limiting when true
   * @returns {{ limited: boolean, remainingMs: number }}
   */
  isRateLimited(userId, commandName, isAdmin = false) {
    if (isAdmin) return { limited: false, remainingMs: 0 }

    const key = this._key(userId, commandName)
    const now = Date.now()
    const last = this.map.get(key) || 0
    const cooldown = this._getCooldownFor(commandName) * 1000
    if (now - last < cooldown) {
      const remainingMs = cooldown - (now - last)
      return { limited: true, remainingMs }
    }
    return { limited: false, remainingMs: 0 }
  }

  _getCooldownFor(commandName) {
    const base = commandName.split(' ')[0].toLowerCase()
    return this.overrides[base] ?? this.defaults[base] ?? 3
  }

  touch(userId, commandName) {
    const key = this._key(userId, commandName)
    this.map.set(key, Date.now())
  }

  /**
   * Check whether a member has an admin role configured via ADMIN_ROLE_ID.
   * @param {import('discord.js').GuildMember|null} member
   * @returns {boolean}
   */
  isAdminMember(member) {
    if (!member || !member.roles) return false
    const adminRoleId = process.env.ADMIN_ROLE_ID
    if (!adminRoleId) return false
    return member.roles.cache.has(adminRoleId)
  }
}

module.exports = new CommandRateLimiter()