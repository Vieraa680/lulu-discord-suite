const { prisma } = require('#services/database')
const { rotateSeason } = require('./seasonRotationService')
const logger = require('#utils/logger')

const CHECK_INTERVAL_MS = 60_000
let schedulerIntervalId = null

async function checkExpiredSeasons(client) {
  try {
    const now = new Date()
    const expiredSeasons = await prisma.season.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: now },
      },
    })

    if (expiredSeasons.length === 0) return

    logger.info({ count: expiredSeasons.length }, '[SeasonScheduler] Found expired season(s), processing rotation...')

    for (const season of expiredSeasons) {
      try {
        await rotateSeason(client, season.guildId, season.id)
      } catch (err) {
        logger.error({ err: err.message, seasonId: season.id, guildId: season.guildId }, '[SeasonScheduler] Failed to rotate expired season')
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, '[SeasonScheduler] Error querying expired seasons')
  }
}

function startSeasonScheduler(client) {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId)
  }

  checkExpiredSeasons(client).catch(err => {
    logger.error({ err: err.message }, '[SeasonScheduler] Initial check failed')
  })

  schedulerIntervalId = setInterval(() => {
    checkExpiredSeasons(client).catch(err => {
      logger.error({ err: err.message }, '[SeasonScheduler] Interval check failed')
    })
  }, CHECK_INTERVAL_MS)

  if (schedulerIntervalId.unref) {
    schedulerIntervalId.unref()
  }

  logger.info('[SeasonScheduler] Season background scheduler started')
}

function stopSeasonScheduler() {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId)
    schedulerIntervalId = null
    logger.info('[SeasonScheduler] Season scheduler stopped')
  }
}

module.exports = {
  startSeasonScheduler,
  stopSeasonScheduler,
  checkExpiredSeasons,
}
