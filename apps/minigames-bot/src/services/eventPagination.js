const timers = new Map()

function _clearTimer(id) {
  const t = timers.get(id)
  if (t) {
    clearTimeout(t)
    timers.delete(id)
  }
}

async function _disableComponents(message) {
  try {
    if (!message || !message.edit) return
    await message.edit({ components: [] })
  } catch (err) {
    try { const logger = require('#utils/logger').child({ service: 'eventPagination' }); logger.warn({ err }, 'Failed to disable pagination components') } catch (e) {}
  }
}

function scheduleDisable(message, ttlMs = 15 * 60 * 1000) {
  if (!message || !message.id) return
  const id = message.id
  _clearTimer(id)
  const t = setTimeout(() => {
    _disableComponents(message)
    timers.delete(id)
  }, ttlMs)
  timers.set(id, t)
}

async function resetDisable(message, ttlMs = 15 * 60 * 1000) {
  if (!message || !message.id) return
  scheduleDisable(message, ttlMs)
}

function clearDisableById(messageId) {
  if (!messageId) return
  _clearTimer(messageId)
}

module.exports = { scheduleDisable, resetDisable, clearDisableById }