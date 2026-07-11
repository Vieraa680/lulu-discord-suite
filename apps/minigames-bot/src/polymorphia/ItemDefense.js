const { prisma } = require('#services/database')

/**
 * Get all defense/consumable items owned by a user that are usable in polymormphia duels.
 * @param {string} discordId - Discord snowflake
 * @param {string} guildId
 * @returns {Promise<Array<{name: string, quantity: number, category: string, rarity: string}>>}
 */
async function getOwnedDefenseItems(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } },
        include: {
            items: {
                where: {
                    quantity: { gt: 0 },
                    item: {
                        OR: [
                            { category: 'defense' },
                            { category: 'consumable', name: 'Poción de Polvo de Hada' }
                        ]
                    }
                },
                include: { item: true }
            }
        }
    })

    if (!user) return []

    return user.items.map(ui => ({
        name: ui.item.name,
        quantity: ui.quantity,
        category: ui.item.category,
        rarity: ui.item.rarity,
        emoji: ui.item.emoji
    }))
}

/**
 * Check if a user owns at least 1 of a specific item.
 * @param {string} discordId
 * @param {string} guildId
 * @param {string} itemName
 * @returns {Promise<boolean>}
 */
async function userOwnsItem(discordId, guildId, itemName) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } },
        include: {
            items: {
                where: {
                    quantity: { gt: 0 },
                    item: { name: itemName }
                }
            }
        }
    })

    return !!(user && user.items.length > 0)
}

/**
 * Consume one unit of an item (decrement quantity or delete if last).
 * @param {string} discordId
 * @param {string} guildId
 * @param {string} itemName
 */
async function consumeItem(discordId, guildId, itemName) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })

    if (!user) return

    const item = await prisma.item.findUnique({ where: { name: itemName } })
    if (!item) return

    const userItem = await prisma.userItem.findUnique({
        where: {
            userId_itemId: { userId: user.id, itemId: item.id }
        }
    })

    if (!userItem || userItem.quantity <= 0) return

    if (userItem.quantity <= 1) {
        await prisma.userItem.delete({
            where: { id: userItem.id }
        })
    } else {
        await prisma.userItem.update({
            where: { id: userItem.id },
            data: { quantity: { decrement: 1 } }
        })
    }
}

/**
 * Purchase an item for a user (deduct candies, add to inventory).
 * @param {string} discordId
 * @param {string} guildId
 * @param {string} itemName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function purchaseItem(discordId, guildId, itemName) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })

    if (!user) {
        return { success: false, error: 'User not found. Use the bot first to create your profile.' }
    }

    const item = await prisma.item.findUnique({ where: { name: itemName } })
    if (!item || !item.isActive) {
        return { success: false, error: 'That item does not exist or is not available.' }
    }

    if (item.price <= 0) {
        return { success: false, error: 'That item cannot be purchased.' }
    }

    if (user.candies < item.price) {
        return {
            success: false,
            error: `You need **${item.price} 🍬 candies** to buy ${item.name}. You have ${user.candies}.`
        }
    }

    // Deduct candies and add item in a transaction
    try {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    candies: { decrement: item.price },
                    totalSpent: { increment: item.price }
                }
            }),
            prisma.transaction.create({
                data: {
                    userId: user.id,
                    type: 'spend',
                    amount: item.price,
                    balanceAfter: user.candies - item.price,
                    description: `Purchased ${item.name}`,
                    referenceId: item.id
                }
            }),
            // Upsert the UserItem
            prisma.userItem.upsert({
                where: {
                    userId_itemId: { userId: user.id, itemId: item.id }
                },
                update: {
                    quantity: { increment: 1 }
                },
                create: {
                    userId: user.id,
                    itemId: item.id,
                    quantity: 1
                }
            })
        ])

        return { success: true }
    } catch (error) {
        console.error('[ItemDefense:purchase] Error:', error.message)
        return { success: false, error: 'An error occurred during purchase. Please try again.' }
    }
}

module.exports = {
    getOwnedDefenseItems,
    userOwnsItem,
    consumeItem,
    purchaseItem
}