const { registerSlashCommands } = require('#handlers/commandHandler')
const { startSweeper } = require('#services/polymorphiaSweeper')

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        const logger = require('#utils/logger')

        logger.info({ tag: client.user?.tag }, 'Lulu is awake!')
        logger.info({ guildCount: client.guilds.cache.size }, 'Serving guilds')

        startSweeper(client)

        const mode = process.env.COMMAND_REGISTRATION_MODE || 'guild'
        const guildId = process.env.GUILD_ID

        if (mode === 'global') {
            await registerSlashCommands(client)
            logger.info('[ready] Slash commands registered globally. Propagation can take up to 1 hour.')
            return
        }

        if (mode !== 'guild') {
            logger.warn({ mode }, 'Unknown COMMAND_REGISTRATION_MODE. Use "guild" or "global"')
            return
        }

        if (!guildId) {
            logger.warn('[ready] GUILD_ID not set. Skipping guild command registration.')
            logger.warn('[ready] Set COMMAND_REGISTRATION_MODE=global to register without GUILD_ID.')
            return
        }

        logger.info({ guildId }, '[ready] Registering slash commands in guild mode')
        await registerSlashCommands(client, guildId)
    }
}
