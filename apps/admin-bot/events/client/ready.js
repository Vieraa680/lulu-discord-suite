const { registerSlashCommands } = require('#handlers/commandHandler')

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        console.log(`[AdminBot] Logged in as ${client.user.tag}`)
        console.log(`[AdminBot] Serving ${client.guilds.cache.size} guild(s)`)

        const mode = process.env.COMMAND_REGISTRATION_MODE || 'guild'
        const guildId = process.env.GUILD_ID

        if (mode === 'global') {
            await registerSlashCommands(client)
            console.log('[AdminBot] Slash commands registered globally.')
            return
        }

        if (mode !== 'guild') {
            console.warn(`[AdminBot] Unknown COMMAND_REGISTRATION_MODE="${mode}". Use "guild" or "global".`)
            return
        }

        if (!guildId) {
            console.warn('[AdminBot] GUILD_ID not set. Skipping guild command registration.')
            return
        }

        await registerSlashCommands(client, guildId)
    }
}
