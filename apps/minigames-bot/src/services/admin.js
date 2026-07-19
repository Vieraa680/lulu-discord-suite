const { prisma, getOrCreateUser } = require('#services/database')
const { addCandies, spendCandies } = require('#services/database')
const { expirePolymorphiaState } = require('#services/database/polymorphia')
const { getGuildConfig } = require('#services/guildConfig')

async function adjustBalance(targetDiscordId, guildId, amount, reason, byUser) {
  // amount can be positive (credit) or negative (debit)
  const user = await getOrCreateUser(targetDiscordId, guildId, 'unknown')

  if (amount === 0) return { success: false, error: 'Amount must be non-zero' }

  if (amount > 0) {
    const updated = await addCandies(targetDiscordId, guildId, user.username || 'unknown', amount, `Admin adjustment by ${byUser}: ${reason}`)
    return { success: true, user: updated }
  } else {
    const amt = Math.abs(amount)
    const updated = await spendCandies(targetDiscordId, guildId, user.username || 'unknown', amt, `Admin adjustment by ${byUser}: ${reason}`)
    return { success: true, user: updated }
  }
}

async function viewUser(discordId, guildId) {
  const user = await prisma.user.findUnique({
    where: { discordId_guildId: { discordId, guildId } },
    include: { items: { include: { item: true } }, transactions: { take: 25, orderBy: { createdAt: 'desc' } }, state: true }
  })
  return user
}

async function listTransactions(targetDiscordId, guildId, limit = 50) {
  const user = await prisma.user.findUnique({ where: { discordId_guildId: { discordId: targetDiscordId, guildId } } })
  if (!user) return []
  return prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: limit })
}

async function resetCooldown(targetDiscordId, guildId) {
  const user = await prisma.user.findUnique({ where: { discordId_guildId: { discordId: targetDiscordId, guildId } } })
  if (!user) return { success: false, error: 'User not found' }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { lastPolymorphiaUse: null, polymorphiaProtectedUntil: null } })
  return { success: true, user: updated }
}

async function forceUnpolymorphia(targetDiscordId, guildId) {
  // Find the state and expire it
  const state = await prisma.polymorphiaState.findFirst({ where: { guildId, user: { discordId: targetDiscordId } } })
  if (!state) return { success: false, error: 'No polymorphia state found for user' }
  await expirePolymorphiaState(state.id)
  return { success: true }
}

async function isAdmin(interaction) {
  // Check guild config adminRoleId or Administrator permission
  const guildId = interaction.guild.id
  const cfg = await getGuildConfig(guildId)
  const member = interaction.member
  // If adminRoleId configured, require role
  if (cfg && cfg.adminRoleId) {
    try {
      return member.roles.cache.has(cfg.adminRoleId) || member.permissions.has(require('discord.js').PermissionFlagsBits.Administrator)
    } catch {
      return member.permissions.has(require('discord.js').PermissionFlagsBits.Administrator)
    }
  }
  return member.permissions.has(require('discord.js').PermissionFlagsBits.Administrator)
}

module.exports = { adjustBalance, viewUser, listTransactions, resetCooldown, forceUnpolymorphia, isAdmin }
