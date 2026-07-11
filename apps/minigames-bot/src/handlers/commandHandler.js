const fs = require('fs')
const path = require('path')
const { Collection, REST, Routes } = require('discord.js')

/**
 * Dynamically loads all Slash Command files from the commands/ directory.
 * Commands are organized in subdirectories (categories) like commands/utility/.
 * Each file must export: { data (SlashCommandBuilder), execute(interaction, client) }
 *
 * @param {import('discord.js').Client} client
 * @returns {Collection<string, object>}
 */
function loadCommands(client) {
    client.commands = new Collection()

    const commandsPath = path.join(__dirname, '..', '..', 'commands')

    if (!fs.existsSync(commandsPath)) {
        console.warn(`[CommandHandler] Commands directory not found at ${commandsPath}. Skipping command loading.`)
        return client.commands
    }

    const categories = fs.readdirSync(commandsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

    for (const category of categories) {
        const categoryPath = path.join(commandsPath, category)
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'))

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file)
            try {
                const command = require(filePath)

                if (!command.data || !command.execute) {
                    console.warn(
                        `[CommandHandler] Skipping ${filePath}: missing required "data" or "execute" export.`
                    )
                    continue
                }

                if (!command.data.name) {
                    console.warn(
                        `[CommandHandler] Skipping ${filePath}: "data" must have a "name" property.`
                    )
                    continue
                }

                command.category = category
                client.commands.set(command.data.name, command)
                console.log(`[CommandHandler] Loaded slash command: ${command.data.name} (${category})`)
            } catch (error) {
                console.error(`[CommandHandler] Failed to load command ${filePath}:`, error.message)
            }
        }
    }

    console.log(`[CommandHandler] Total slash commands loaded: ${client.commands.size}`)
    return client.commands
}

/**
 * Registers all loaded slash commands with the Discord API for a specific guild.
 * Uses the REST API to bulk-overwrite guild-specific commands for instant updates.
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId - The ID of the guild to register commands in
 * @returns {Promise<void>}
 */
async function registerSlashCommands(client, guildId) {
    if (!client.commands || client.commands.size === 0) {
        console.warn('[CommandHandler] No slash commands to register.')
        return
    }

    const commandData = client.commands.map(cmd => cmd.data.toJSON())

    const rest = new REST({ version: '10' }).setToken(client.token)

    try {
        console.log(`[CommandHandler] Registering ${commandData.length} slash commands to guild ${guildId}...`)

        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commandData }
        )

        console.log(`[CommandHandler] Successfully registered ${commandData.length} slash commands.`)
    } catch (error) {
        console.error('[CommandHandler] Failed to register slash commands:', error)
    }
}

module.exports = { loadCommands, registerSlashCommands }