const { prisma } = require('#services/database')
const logger = require('#utils/logger').child({ service: 'achievements' })

/**
 * Parse a simple requirement string into a predicate.
 * Supported formats:
 *   - "field >= value"
 *   - "field <= value"
 *   - "field > value"
 *   - "field < value"
 *   - "field == value"
 *   - "field = value"
 *   - "field >= value unit" (only "days" supported, e.g. "createdAt <= now - 30 days")
 * @param {string} requirement
 * @returns {{ field: string, op: string, value: number|Date, isDate: boolean }|null}
 */
function parseRequirement(requirement) {
    const dateMatch = requirement.match(
        /^(\w+)\s*(<=|>=|<|>|==|=)\s*now\s*-\s*(\d+)\s*days$/i
    )
    if (dateMatch) {
        const [, field, op, days] = dateMatch
        const value = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)
        return { field, op: normalizeOp(op), value, isDate: true }
    }

    const match = requirement.match(/^(\w+)\s*(<=|>=|<|>|==|=)\s*(\d+)$/)
    if (!match) return null
    const [, field, op, value] = match
    return { field, op: normalizeOp(op), value: Number(value), isDate: false }
}

function normalizeOp(op) {
    if (op === '=') return '=='
    return op
}

function checkPredicate(user, predicate) {
    const rawValue = user[predicate.field]
    if (rawValue === undefined) return false

    if (predicate.isDate) {
        const userDate = rawValue instanceof Date ? rawValue : new Date(rawValue)
        switch (predicate.op) {
            case '<=': return userDate <= predicate.value
            case '>=': return userDate >= predicate.value
            case '<':  return userDate < predicate.value
            case '>':  return userDate > predicate.value
            case '==': return userDate.getTime() === predicate.value.getTime()
            default:   return false
        }
    }

    const value = Number(rawValue) || 0
    switch (predicate.op) {
        case '<=': return value <= predicate.value
        case '>=': return value >= predicate.value
        case '<':  return value < predicate.value
        case '>':  return value > predicate.value
        case '==': return value === predicate.value
        default:   return false
    }
}

/**
 * Evaluate achievements for a user after a relevant event.
 * Returns newly unlocked achievements.
 * @param {string} discordId
 * @param {string} guildId
 * @returns {Promise<Array<{id:string,name:string,emoji:string,description:string}>>}
 */
async function evaluateAchievements(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })
    if (!user) return []

    const achievements = await prisma.achievement.findMany()
    const unlockedIds = new Set(
        (await prisma.userAchievement.findMany({
            where: { userId: user.id },
            select: { achievementId: true }
        })).map(ua => ua.achievementId)
    )

    const newlyUnlocked = []
    for (const achievement of achievements) {
        if (unlockedIds.has(achievement.id)) continue

        const predicate = parseRequirement(achievement.requirement)
        if (!predicate) {
            logger.warn({ achievementId: achievement.id, requirement: achievement.requirement }, 'Unparseable achievement requirement')
            continue
        }

        if (checkPredicate(user, predicate)) {
            await prisma.userAchievement.create({
                data: { userId: user.id, achievementId: achievement.id }
            })
            newlyUnlocked.push({
                id: achievement.id,
                name: achievement.name,
                emoji: achievement.emoji,
                description: achievement.description
            })
            logger.info({ userId: user.id, achievement: achievement.name }, 'Achievement unlocked')
        }
    }

    return newlyUnlocked
}

/**
 * Get all achievements for a user, including unlock status.
 * @param {string} discordId
 * @param {string} guildId
 * @returns {Promise<Array<{name:string,emoji:string,description:string,category:string,unlocked:boolean,unlockedAt:Date|null}>>}
 */
async function getUserAchievements(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } },
        include: {
            achievements: {
                include: { achievement: true }
            }
        }
    })
    if (!user) return []

    const unlockedMap = new Map(
        user.achievements.map(ua => [ua.achievementId, ua.unlockedAt])
    )

    const allAchievements = await prisma.achievement.findMany({
        orderBy: { category: 'asc' }
    })

    return allAchievements.map(achievement => ({
        name: achievement.name,
        emoji: achievement.emoji,
        description: achievement.description,
        category: achievement.category,
        unlocked: unlockedMap.has(achievement.id),
        unlockedAt: unlockedMap.get(achievement.id) || null
    }))
}

module.exports = {
    evaluateAchievements,
    getUserAchievements,
    parseRequirement,
    checkPredicate
}
