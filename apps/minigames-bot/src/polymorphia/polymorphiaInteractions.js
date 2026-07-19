const { handleDuelButton, handleDefenseButton } = require('./handlers/duelHandler')
const { purchaseItem } = require('#services/database')
const { EmbedBuilder } = require('discord.js')
const { iconifyUrlFromColor } = require('#services/icons')

async function handlePolymorphiaInteraction(interaction) {
    const { customId } = interaction

    try {
        // ── Duel flow buttons ──
        if (customId.startsWith('polymorphia_accept:') || customId.startsWith('polymorphia_reject:')) {
            return await handleDuelButton(interaction)
        }

        // ── Defense selection buttons ──
        if (customId.startsWith('polymorphia_defense:')) {
            return await handleDefenseButton(interaction)
        }

        // ── Shop buy buttons ──
        if (customId.startsWith('polymorphia_shop_buy:')) {
            return await handleShopBuy(interaction)
        }

        // Unknown polymorphia interaction
        await interaction.reply({
            content: 'interacción desconocida, intentá de nuevo',
            ephemeral: true
        })
    } catch (error) {
        const logger = require('#utils/logger').child({ service: 'polymorphiaInteractions' })
        logger.error({ err: error }, 'Error in polymorphiaInteractions')
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'ups, hubo un error, intentá de nuevo', ephemeral: true })
            } else {
                await interaction.reply({ content: 'ups, hubo un error, intentá de nuevo', ephemeral: true })
            }
        } catch {
            // Ignore follow-up errors
        }
    }
}

async function handleShopBuy(interaction) {
    const itemName = interaction.customId.split(':')[1]
    const guildId = interaction.guild.id
    const discordId = interaction.user.id

    if (!itemName) {
        await interaction.reply({ content: 'objeto inválido', ephemeral: true })
        return
    }

    await interaction.deferReply({ ephemeral: true })

    const result = await purchaseItem(discordId, guildId, itemName)

    if (result.success) {
        const item = result.item || await require('#services/database').prisma.item.findUnique({ where: { name: itemName } })
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Compra en Tienda', iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }) })
            .setTitle('¡Compra Exitosa!')
            .setDescription(`compraste **${itemName}**! ya está en tu inventario`)
            .setColor(0x2ECC71)
            .setThumbnail(iconifyUrlFromColor('PACKAGE', 0x2ECC71))
            .setTimestamp()

        await interaction.editReply({ embeds: [embed] })

        try {
            if (item && item.category === 'form') {
                const { getOrCreateUser } = require('#services/database')
                const { createPolymorphiaState } = require('#services/database/polymorphia')

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

                const userDb = await getOrCreateUser(discordId, guildId, previousNickname)
                await createPolymorphiaState(userDb.id, guildId, previousNickname, newNickname, durationMinutes, true)

                await interaction.followUp({ content: `Se aplicó la forma **${item.name}** por **${durationMinutes} minutos**.`, ephemeral: true })
            }
        } catch (err) {
            const logger = require('#utils/logger').child({ service: 'polymorphiaInteractions' })
            logger.error({ err }, 'Failed to apply voluntary form after purchase')
            try { await interaction.followUp({ content: 'La compra se completó pero no se pudo aplicar la forma (permisos). Está en tu inventario.', ephemeral: true }) } catch {}
        }
    } else {
        await interaction.editReply({
            content: result.error || 'compra fallida'
        })
    }
}

module.exports = { handlePolymorphiaInteraction }