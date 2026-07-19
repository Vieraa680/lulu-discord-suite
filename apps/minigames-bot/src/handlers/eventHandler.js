const fs = require('fs')
const path = require('path')
const baseLogger = require('#utils/logger')

function loadEvents(client) {
    const logger = baseLogger.child({ service: 'eventHandler' })
    const eventsPath = path.join(__dirname, '..', '..', 'events')

    if (!fs.existsSync(eventsPath)) {
        logger.warn({ eventsPath }, 'Events directory not found. Skipping event loading.')
        return
    }

    const categories = fs.readdirSync(eventsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

    let loadedCount = 0

    for (const category of categories) {
        const categoryPath = path.join(eventsPath, category)
        const eventFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'))

        for (const file of eventFiles) {
            const filePath = path.join(categoryPath, file)
            try {
                const event = require(filePath)

                if (!event.name || !event.execute) {
                    logger.warn({ filePath }, 'Skipping file: missing required "name" or "execute" export.')
                    continue
                }

                const listener = (...args) => event.execute(...args, client)

                if (event.once) {
                    client.once(event.name, listener)
                } else {
                    client.on(event.name, listener)
                }

                loadedCount++
                logger.info({ event: event.name, category, once: !!event.once }, 'Registered event')
            } catch (error) {
                logger.error({ err: error, filePath }, 'Failed to load event')
            }
        }
    }
    logger.info({ loadedCount }, 'Total events registered')
}

module.exports = { loadEvents }