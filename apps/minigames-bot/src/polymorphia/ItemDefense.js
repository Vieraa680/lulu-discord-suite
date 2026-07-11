const {
    getUserOwnedDefenseItems,
    userOwnsItem,
    consumeUserItem,
    purchaseItem
} = require('#services/database')

/**
 * Re-exports from database.js — all DB logic lives there.
 * This file exists as a convenience module so consumers can
 * require('#polymorphia/ItemDefense') without changing their imports.
 */

module.exports = {
    getOwnedDefenseItems: getUserOwnedDefenseItems,
    userOwnsItem,
    consumeItem: consumeUserItem,
    purchaseItem
}