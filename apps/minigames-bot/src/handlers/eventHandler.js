const fs = require('fs')
const path = require('path')

/**
 * Dynamically loads all event files from the events/ directory.
 * Events are organized in subdirectories like events/client/.
 * Each file must export: { name, once (optional), execute(...args) }
 *
 * @param {import('discord.js').Client} client
 */
function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', '..', 'events')

    if (!fs.existsSync(eventsPath)) {
        console.warn(`[EventHandler] Events directory not found at ${eventsPath}. Skipping event loading.`)
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
                    console.warn(
                        `[EventHandler] Skipping ${filePath}: missing required "name" or "execute" export.`
                    )
                    continue
                }

                const listener = (...args) => event.execute(...args, client)

                if (event.once) {
                    client.once(event.name, listener)
                } else {
                    client.on(event.name, listener)
                }

                loadedCount++
                console.log(`[EventHandler] Registered event: ${event.name} (${category}, once: ${!!event.once})`)
            } catch (error) {
                console.error(`[EventHandler] Failed to load event ${filePath}:`, error.message)
            }
        }
    }

    console.log(`[EventHandler] Total events registered: ${loadedCount}`)
}

module.exports = { loadEvents }