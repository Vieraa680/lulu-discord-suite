const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { handleDuel } = require('#polymorphia/handlers/duelHandler')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('polymorphia')
        .setDescription('Polymorphia minigame — challenge someone to a polymorphic duel!')
        .addSubcommand(sub =>
            sub
                .setName('duel')
                .setDescription('Challenge someone to a Polymorphia duel')
                .addUserOption(opt =>
                    opt
                        .setName('target')
                        .setDescription('The user to challenge')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('shop')
                .setDescription('Browse the Polymorphia item shop')
        )
        .addSubcommand(sub =>
            sub
                .setName('inventory')
                .setDescription('View your owned items')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The user to check (defaults to yourself)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('stats')
                .setDescription('View Polymorphia duel statistics')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The user to check (defaults to yourself)')
                        .setRequired(false)
                )
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand()

        switch (subcommand) {
            case 'duel':
                // Permission check shared by all duel-related commands
                if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                    await interaction.reply({
                        content: 'I need the **Manage Nicknames** permission to run Polymorphia! Ask an admin to enable it.',
                        ephemeral: true
                    })
                    return
                }
                await handleDuel(interaction, client)
                break

            case 'shop':
                await handleShop(interaction, client)
                break

            case 'inventory':
                await handleInventory(interaction, client)
                break

            case 'stats':
                await handleStats(interaction, client)
                break

            default:
                await interaction.reply({
                    content: 'Unknown subcommand. Use `/polymorphia duel @user` to challenge someone.',
                    ephemeral: true
                })
        }
    }
}

async function handleShop(interaction) {
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
    const { getOrCreateUser } = require('#services/database')
    const { prisma } = require('#services/database')

    await interaction.deferReply()

    try {
        const items = await prisma.item.findMany({
            where: {
                category: { in: ['defense', 'consumable'] },
                isActive: true,
                price: { gt: 0 }
            },
            orderBy: { price: 'asc' }
        })

        if (items.length === 0) {
            await interaction.editReply('The shop is empty right now. Check back later!')
            return
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Polymorphia Defense Shop')
            .setDescription('Buy items to defend yourself in Polymorphia duels!')
            .setColor(0x9B59B6)
            .setTimestamp()

        const rows = []
        let currentRow = new ActionRowBuilder()

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const emoji = item.emoji || '📦'
            embed.addFields({
                name: `${emoji} ${item.name}`,
                value: `**${item.price}** 🍬 candies\n*${item.description || getDefaultDescription(item)}*\nRarity: ${item.rarity.toUpperCase()}`,
                inline: true
            })

            const btn = new ButtonBuilder()
                .setCustomId(`polymorphia_shop_buy:${item.name}`)
                .setLabel(`Buy ${emoji}`)
                .setStyle(ButtonStyle.Success)

            if (currentRow.components.length >= 3) {
                rows.push(currentRow)
                currentRow = new ActionRowBuilder()
            }
            currentRow.addComponents(btn)
        }

        if (currentRow.components.length > 0) {
            rows.push(currentRow)
        }

        await interaction.editReply({ embeds: [embed], components: rows })
    } catch (error) {
        console.error('[polymorphia:shop] Error:', error.message)
        await interaction.editReply('An error occurred while loading the shop. Try again later.')
    }
}

async function handleInventory(interaction) {
    const { EmbedBuilder } = require('discord.js')
    const { prisma } = require('#services/database')

    const target = interaction.options.getUser('user') || interaction.user
    const guildId = interaction.guild.id
    const discordId = target.id

    await interaction.deferReply()

    try {
        const user = await prisma.user.findUnique({
            where: {
                discordId_guildId: { discordId, guildId }
            },
            include: {
                items: {
                    include: { item: true },
                    where: { quantity: { gt: 0 } }
                }
            }
        })

        if (!user || user.items.length === 0) {
            await interaction.editReply(
                `${target.id === interaction.user.id ? 'You have' : `${target.username} has`} no items in inventory.`
            )
            return
        }

        const embed = new EmbedBuilder()
            .setTitle(`${target.username}'s Inventory`)
            .setColor(0x9B59B6)
            .setTimestamp()

        for (const ui of user.items) {
            const item = ui.item
            const emoji = item.emoji || '📦'
            embed.addFields({
                name: `${emoji} ${item.name} x${ui.quantity}`,
                value: `*${item.rarity} ${item.category}* — ${item.description || ''}`,
                inline: true
            })
        }

        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        console.error('[polymorphia:inventory] Error:', error.message)
        await interaction.editReply('An error occurred while loading inventory.')
    }
}

async function handleStats(interaction) {
    const { EmbedBuilder } = require('discord.js')
    const { prisma } = require('#services/database')

    const target = interaction.options.getUser('user') || interaction.user
    const guildId = interaction.guild.id
    const discordId = target.id

    await interaction.deferReply()

    try {
        const user = await prisma.user.findUnique({
            where: {
                discordId_guildId: { discordId, guildId }
            },
            include: { state: true }
        })

        if (!user) {
            await interaction.editReply(
                `${target.id === interaction.user.id ? "You don't" : `${target.username} doesn't`} have any Polymorphia stats yet.`
            )
            return
        }

        const s = user.state
        const isPolymorphed = s?.isActive || false

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${target.username} — Polymorphia Stats`)
            .setColor(isPolymorphed ? 0xE74C3C : 0x9B59B6)
            .addFields(
                { name: '🏆 Wins', value: `${user.polymorphiaWins}`, inline: true },
                { name: '💀 Losses', value: `${user.polymorphiaLosses}`, inline: true },
                { name: '🛡️ Defended', value: `${user.polymorphiaSaved}`, inline: true },
                { name: '🍬 Candies', value: `${user.candies}`, inline: true }
            )
            .setTimestamp()

        if (isPolymorphed) {
            embed.addFields({
                name: '⚡ Currently Polymorphed!',
                value: `Form: **${s.currentForm}**\nExpires: <t:${Math.floor(s.endsAt.getTime() / 1000)}:R>`,
                inline: false
            })
        }

        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        console.error('[polymorphia:stats] Error:', error.message)
        await interaction.editReply('An error occurred while loading stats.')
    }
}

function getDefaultDescription(item) {
    const descriptions = {
        'Escudo de Banshee': '50% chance to block a polymorphia nickname change. Consumed on use.',
        'Cetro de Cristal': 'Halves polymorphia duration and grants +1 to defense rolls. Passive.',
        'Poción de Polvo de Hada': 'Grants +3 to your defense roll in a polymormphia duel. Consumed on use.',
        'Red de Mariposas': 'Increases butterfly catch range.',
        'Poción de Polimorfia': 'A mysterious potion with unknown effects.'
    }
    return descriptions[item.name] || ''
}