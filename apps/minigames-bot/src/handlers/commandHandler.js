const fs = require('fs')
const path = require('path')
const { Collection, REST, Routes } = require('discord.js')
const baseLogger = require('#utils/logger')
const logger = baseLogger.child({ service: 'commandHandler' })

function loadCommands(client) {
    client.commands = new Collection()

    const commandsPath = path.join(__dirname, '..', '..', 'commands')

    if (!fs.existsSync(commandsPath)) {
        logger.warn({ commandsPath }, 'Commands directory not found. Skipping command loading.')
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
                    logger.warn({ indexPath }, 'Skipping command: missing required "data" or "execute" export.')
                    continue
                }

                if (!command.data.name) {
                    logger.warn({ indexPath }, 'Skipping command: "data" must have a "name" property.')
                    continue
                }

                command.category = category
                client.commands.set(command.data.name, command)
                logger.info({ command: command.data.name, category }, 'Loaded slash command')
                continue
            } catch (error) {
                logger.error({ err: error, indexPath }, 'Failed to load command')
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
                    logger.warn({ filePath }, 'Skipping command: missing required "data" or "execute" export.')
                    continue
                }

                if (!command.data.name) {
                    logger.warn({ filePath }, 'Skipping command: "data" must have a "name" property.')
                    continue
                }

                command.category = category
                client.commands.set(command.data.name, command)
                logger.info({ command: command.data.name, category }, 'Loaded slash command')
            } catch (error) {
                logger.error({ err: error, filePath }, 'Failed to load command')
            }
        }
    }

    logger.info({ total: client.commands.size }, 'Total slash commands loaded')
    return client.commands
}

async function registerSlashCommands(client, guildId) {
    if (!client.commands || client.commands.size === 0) {
        logger.warn('No slash commands to register.')
        return
    }

    const commandData = client.commands.map(cmd => cmd.data.toJSON())

    const rest = new REST({ version: '10' }).setToken(client.token)

    try {
        if (guildId) {
            logger.info({ count: commandData.length, guildId }, 'Registering slash commands to guild')
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: commandData }
            )
            logger.info({ count: commandData.length, guildId }, 'Successfully registered guild slash commands')
            return
        }
        logger.info({ count: commandData.length }, 'Registering slash commands globally')
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandData }
        )
        logger.info({ count: commandData.length }, 'Successfully registered global slash commands')
    } catch (error) {
        logger.error({ err: error }, 'Failed to register slash commands')
    }
}

module.exports = { loadCommands, registerSlashCommands }
