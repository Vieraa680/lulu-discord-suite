const { clearDisableById } = require('#services/eventPagination')

module.exports = {
  name: 'messageDelete',
  once: false,

  async execute(message, client) {
    try {
      if (!message || !message.id) return
      // clear any pagination timers tied to this message
      clearDisableById(message.id)
    } catch (err) {
      try { const logger = require('#utils/logger').child({ service: 'events' }); logger.warn({ err }, 'Failed to clear pagination timer on messageDelete') } catch (e) {}
    }
  }
}
