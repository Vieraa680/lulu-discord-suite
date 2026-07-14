/**
 * polymorphiaInteractions.js — Routes component interactions (buttons) for the polymorphia system.
 *
 * Handles:
 * - polymorphia_accept:challengerId:targetId    → Accept duel
 * - polymorphia_reject:challengerId:targetId    → Reject duel
 * - polymorphia_defense:itemName:challengerId:targetId → Choose defense
 * - polymorphia_shop_buy:itemName              → Buy from shop
 */

const { handleDuelButton, handleDefenseButton } = require('./handlers/duelHandler')
const { purchaseItem } = require('./ItemDefense')
const { EmbedBuilder } = require('discord.js')
const { iconifyUrlFromColor } = require('#services/icons')

/**
 * Main entry point for polymorphia-related component interactions.
 * Called from interactionCreate.js when a customId starts with "polymorphia_".
 */
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
            content: 'Interacción desconocida. Intenta de nuevo.',
            ephemeral: true
        })
    } catch (error) {
        console.error('[polymorphiaInteractions] Error:', error.message)
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Ocurrió un error. Intenta de nuevo.', ephemeral: true })
            } else {
                await interaction.reply({ content: 'Ocurrió un error. Intenta de nuevo.', ephemeral: true })
            }
        } catch {
            // Ignore follow-up errors
        }
    }
}

/**
 * Handle "Buy" button clicks from the polymorphia shop.
 */
async function handleShopBuy(interaction) {
    const itemName = interaction.customId.split(':')[1]
    const guildId = interaction.guild.id
    const discordId = interaction.user.id

    if (!itemName) {
        await interaction.reply({ content: 'Objeto inválido.', ephemeral: true })
        return
    }

    await interaction.deferReply({ ephemeral: true })

    const result = await purchaseItem(discordId, guildId, itemName)

    if (result.success) {
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Compra en Tienda', iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }) })
            .setTitle('¡Compra Exitosa!')
            .setDescription(`Has comprado **${itemName}**! Ha sido añadido a tu inventario.`)
            .setColor(0x2ECC71)
            .setThumbnail(iconifyUrlFromColor('PACKAGE', 0x2ECC71))
            .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
    } else {
        await interaction.editReply({
            content: result.error || 'Compra fallida.'
        })
    }
}

module.exports = { handlePolymorphiaInteraction }