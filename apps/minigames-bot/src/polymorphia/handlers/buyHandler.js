const { EmbedBuilder } = require('discord.js')

async function handleBuy(interaction) {
    const itemName = interaction.options.getString('item')
    const guildId = interaction.guild.id
    const discordId = interaction.user.id

    if (!itemName) {
        await interaction.reply({ content: 'debes indicar el nombre del objeto a comprar', ephemeral: true })
        return
    }

    await interaction.deferReply({ ephemeral: true })

    const db = require('#services/database')
    const result = await db.purchaseItem(discordId, guildId, itemName)

    if (!result.success) {
        await interaction.editReply({ content: result.error || 'compra fallida' })
        return
    }

    await interaction.editReply({ content: `Has comprado **${itemName}**. Revisa tu inventario o usa /polymorphia inventory.` })

    // Apply voluntary form if it's a form item
    try {
        const item = result.item || await db.prisma.item.findUnique({ where: { name: itemName } })
        if (item && item.category === 'form') {
            const member = await interaction.guild.members.fetch(discordId)
            const botMember = interaction.guild.members.me
            const canManage = botMember.permissions.has(require('discord.js').PermissionFlagsBits.ManageNicknames)

            const previousNickname = member.nickname || member.displayName || member.user.username
            const newNickname = item.name
            const durationMap = { common: 15, uncommon: 30, rare: 60, epic: 120, legendary: 240 }
            const durationMinutes = durationMap[item.rarity] || 30

            if (canManage && botMember.roles.highest.comparePositionTo(member.roles.highest) > 0) {
                await member.setNickname(newNickname, 'Voluntary polymorphia purchase')
            }

            const { getOrCreateUser } = require('#services/database')
            const { createPolymorphiaState } = require('#services/database/polymorphia')
            const userDb = await getOrCreateUser(discordId, guildId, previousNickname)
            await createPolymorphiaState(userDb.id, guildId, previousNickname, newNickname, durationMinutes, true)

            await interaction.followUp({ content: `Se aplicó la forma **${item.name}** por **${durationMinutes} minutos**.`, ephemeral: true })
        }
    } catch (err) {
        const logger = require('#utils/logger').child({ service: 'polymorphia', action: 'buy' })
        logger.error({ err }, 'Failed to apply voluntary form after buy command')
        try { await interaction.followUp({ content: 'La compra se completó pero no se pudo aplicar la forma (permisos). Está en tu inventario.', ephemeral: true }) } catch {}
    }
}

module.exports = { handleBuy }
