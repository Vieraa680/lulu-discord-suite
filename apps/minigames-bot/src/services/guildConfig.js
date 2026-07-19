// Re-export from shared bot-utils package to centralize guild config logic.
const { getGuildConfig, setGuildConfig, invalidateCache } = require('@lulu-discord/bot-utils').guildConfig

module.exports = { getGuildConfig, setGuildConfig, invalidateCache }
