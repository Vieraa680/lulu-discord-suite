const fs = require('fs')
const path = require('path')

function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', '..', 'events')

    if (!fs.existsSync(eventsPath)) {
        console.warn(`[AdminEventHandler] Events directory not found at ${eventsPath}.`)
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
                    console.warn(`[AdminEventHandler] Skipping ${filePath}: invalid event export.`)
                    continue
                }

                const listener = (...args) => event.execute(...args, client)
                if (event.once) {
                    client.once(event.name, listener)
                } else {
                    client.on(event.name, listener)
                }

                loadedCount++
                console.log(`[AdminEventHandler] Registered event: ${event.name} (${category})`)
            } catch (error) {
                console.error(`[AdminEventHandler] Failed to load event ${filePath}:`, error.message)
            }
        }
    }

    console.log(`[AdminEventHandler] Total events registered: ${loadedCount}`)
}

module.exports = { loadEvents }
