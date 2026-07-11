module.exports = {
    name: 'ready',
    once: true,

    /**
     * Executes when the Discord client becomes ready.
     * @param {import('discord.js').Client} client
     */
    execute(client) {
        console.log(`Lulu is awake! Logged in as ${client.user.tag}`)
        console.log(`Serving ${client.guilds.cache.size} guild(s)`)
    }
}