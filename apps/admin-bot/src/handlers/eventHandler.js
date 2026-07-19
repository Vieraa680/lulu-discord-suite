const fs = require('fs')
const path = require('path')
const { logger } = require('@lulu-discord/bot-utils')
const base = logger.child({ service: 'eventHandler' })

function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', '..', 'events')

    if (!fs.existsSync(eventsPath)) {
        base.warn({ eventsPath }, 'Events directory not found. Skipping event loading.')
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
                    base.warn({ filePath }, 'Skipping invalid event export.')
                    continue
                }

                const listener = (...args) => event.execute(...args, client)
                if (event.once) {
                    client.once(event.name, listener)
                } else {
                    client.on(event.name, listener)
                }

                loadedCount++
                base.info({ event: event.name, category }, 'Registered event')
            } catch (error) {
                base.error({ err: error, filePath }, 'Failed to load event')
            }
        }
    }

    base.info({ total: loadedCount }, 'Total events registered')
}

module.exports = { loadEvents }
