const fs = require('fs')
const path = require('path')
const { Collection } = require('discord.js')

/**
 * Dynamically loads all command files from the commands/ directory.
 * Commands are organized in subdirectories (categories) like commands/utility/.
 * Each file must export: { name, description, execute(message, args, client) }
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

                if (!command.name || !command.execute) {
                    console.warn(
                        `[CommandHandler] Skipping ${filePath}: missing required "name" or "execute" export.`
                    )
                    continue
                }

                command.category = category
                client.commands.set(command.name, command)
                console.log(`[CommandHandler] Loaded command: ${command.name} (${category})`)
            } catch (error) {
                console.error(`[CommandHandler] Failed to load command ${filePath}:`, error.message)
            }
        }
    }

    console.log(`[CommandHandler] Total commands loaded: ${client.commands.size}`)
    return client.commands
}

module.exports = { loadCommands }