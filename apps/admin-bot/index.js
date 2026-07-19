require('dotenv').config()
const validateEnv = require('./src/utils/validateEnv')
validateEnv()
const { Client, GatewayIntentBits } = require('discord.js')
const { loadCommands } = require('#handlers/commandHandler')
const { loadEvents } = require('#handlers/eventHandler')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
})

loadCommands(client)
loadEvents(client)

client.login(process.env.DISCORD_TOKEN_ADMIN)
