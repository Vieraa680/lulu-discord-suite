;(async () => {
  try {
    const path = require('path')
    const gm = require(path.join(process.cwd(), 'apps/minigames-bot', 'src', 'services', 'EventManager.js'))

    const guildId = '1480484763784446027'
    console.log('Creating event double_candies multiplier=3 for guild', guildId)
    const ev = await gm.createEvent(guildId, 'double_candies', 5, { multiplier: 3 })
    console.log('Created event:', ev.id, ev.type, 'multiplier=', ev.payload && ev.payload.multiplier)

    const active = await gm.isEventActive(guildId, 'double_candies')
    console.log('isEventActive double_candies?', active)

    const activeList = await gm.getActiveEvents(guildId)
    console.log('Active events for guild:', activeList.map(e => ({ id: e.id, type: e.type, multiplier: e.payload?.multiplier })))

    console.log('Stopping event', ev.id)
    await gm.stopEvent(ev.id)

    const activeAfter = await gm.isEventActive(guildId, 'double_candies')
    console.log('isEventActive after stop?', activeAfter)

    process.exit(0)
  } catch (err) {
    console.error('Test failed:', err)
    process.exit(1)
  }
})()
