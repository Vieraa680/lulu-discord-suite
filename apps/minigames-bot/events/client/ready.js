const { registerSlashCommands } = require('#handlers/commandHandler')
const { startSweeper } = require('#services/polymorphiaSweeper')

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        console.log(`Lulu is awake! Logged in as ${client.user.tag}`)
        console.log(`Serving ${client.guilds.cache.size} guild(s)`)

        startSweeper(client)

        const guildId = process.env.GUILD_ID

        if (!guildId) {
            console.warn('[ready] GUILD_ID not set in .env. Skipping slash command registration.')
            console.warn('[ready] Set GUILD_ID to register commands instantly to a specific guild.')
            return
        }

        await registerSlashCommands(client, guildId)
    }
}