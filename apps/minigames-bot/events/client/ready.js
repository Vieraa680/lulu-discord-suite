const { registerSlashCommands } = require('#handlers/commandHandler')
const { startSweeper } = require('#services/polymorphiaSweeper')

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        console.log(`Lulu is awake! Logged in as ${client.user.tag}`)
        console.log(`Serving ${client.guilds.cache.size} guild(s)`)

        startSweeper(client)

        const mode = process.env.COMMAND_REGISTRATION_MODE || 'guild'
        const guildId = process.env.GUILD_ID

        if (mode === 'global') {
            await registerSlashCommands(client)
            console.log('[ready] Slash commands registered globally. Propagation can take up to 1 hour.')
            return
        }

        if (mode !== 'guild') {
            console.warn(`[ready] Unknown COMMAND_REGISTRATION_MODE="${mode}". Use "guild" or "global".`)
            return
        }

        if (!guildId) {
            console.warn('[ready] GUILD_ID not set. Skipping guild command registration.')
            console.warn('[ready] Set COMMAND_REGISTRATION_MODE=global to register without GUILD_ID.')
            return
        }

        console.log(`[ready] Registering slash commands in guild mode for ${guildId}.`)
        await registerSlashCommands(client, guildId)
    }
}
