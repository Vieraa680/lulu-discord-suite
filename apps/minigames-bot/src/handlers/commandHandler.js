const fs = require('fs')
const path = require('path')
const { Collection, REST, Routes } = require('discord.js')

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

        // Check if this category has an index.js (subcommand group router)
        const indexPath = path.join(categoryPath, 'index.js')
        if (fs.existsSync(indexPath)) {
            try {
                const command = require(indexPath)

                if (!command.data || !command.execute) {
                    console.warn(
                        `[CommandHandler] Skipping ${indexPath}: missing required "data" or "execute" export.`
                    )
                    continue
                }

                if (!command.data.name) {
                    console.warn(
                        `[CommandHandler] Skipping ${indexPath}: "data" must have a "name" property.`
                    )
                    continue
                }

                command.category = category
                client.commands.set(command.data.name, command)
                console.log(`[CommandHandler] Loaded slash command: ${command.data.name} (${category})`)
                continue
            } catch (error) {
                console.error(`[CommandHandler] Failed to load command ${indexPath}:`, error.message)
                continue
            }
        }

        // Legacy: load flat .js files from the category folder
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