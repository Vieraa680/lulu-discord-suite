const { registerSlashCommands } = require('#handlers/commandHandler')
const { logger } = require('@lulu-discord/bot-utils')

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        const base = logger.child({ service: 'ready' })
        base.info({ tag: client.user.tag }, 'Logged in')
        base.info({ guildCount: client.guilds.cache.size }, 'Serving guilds')

        const mode = process.env.COMMAND_REGISTRATION_MODE || 'guild'
        const guildId = process.env.GUILD_ID

        if (mode === 'global') {
            await registerSlashCommands(client)
            base.info('Slash commands registered globally')
            return
        }

        if (mode !== 'guild') {
            base.warn({ mode }, 'Unknown COMMAND_REGISTRATION_MODE. Use "guild" or "global"')
            return
        }

        if (!guildId) {
            base.warn('GUILD_ID not set. Skipping guild command registration.')
            return
        }

        await registerSlashCommands(client, guildId)
    }
}
