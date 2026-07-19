const fs = require('fs')
const path = require('path')
const { Collection, REST, Routes } = require('discord.js')

function loadCommands(client) {
    client.commands = new Collection()

    const commandsPath = path.join(__dirname, '..', '..', 'commands')

    if (!fs.existsSync(commandsPath)) {
        console.warn(`[AdminCommandHandler] Commands directory not found at ${commandsPath}.`)
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

                if (!command.data || !command.execute || !command.data.name) {
                    console.warn(`[AdminCommandHandler] Skipping ${filePath}: invalid command export.`)
                    continue
                }

                command.category = category
                client.commands.set(command.data.name, command)
                console.log(`[AdminCommandHandler] Loaded slash command: ${command.data.name} (${category})`)
            } catch (error) {
                console.error(`[AdminCommandHandler] Failed to load command ${filePath}:`, error.message)
            }
        }
    }

    console.log(`[AdminCommandHandler] Total slash commands loaded: ${client.commands.size}`)
    return client.commands
}

async function registerSlashCommands(client, guildId) {
    if (!client.commands || client.commands.size === 0) {
        console.warn('[AdminCommandHandler] No slash commands to register.')
        return
    }

    const commandData = client.commands.map(cmd => cmd.data.toJSON())
    const rest = new REST({ version: '10' }).setToken(client.token)

    try {
        if (guildId) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commandData }
            )
            console.log(`[AdminCommandHandler] Registered ${commandData.length} guild slash command(s).`)
            return
        }

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandData }
        )
        console.log(`[AdminCommandHandler] Registered ${commandData.length} global slash command(s).`)
    } catch (error) {
        console.error('[AdminCommandHandler] Failed to register slash commands:', error)
    }
}

module.exports = { loadCommands, registerSlashCommands }
