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
    const { getOrCreateUser, prisma } = require('#services/database')
    const { colorFromRarity } = require('#polymorphia/utils')

    await interaction.deferReply()

    try {
        const [user, items] = await Promise.all([
            getOrCreateUser(interaction.user.id, interaction.guild.id, interaction.user.username),
            prisma.item.findMany({
                where: {
                    category: { in: ['defense', 'consumable'] },
                    isActive: true,
                    price: { gt: 0 }
                },
                orderBy: { price: 'asc' }
            })
        ])

        if (items.length === 0) {
            await interaction.editReply('The shop is empty right now. Check back later!')
            return
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Polymorphia Defense Shop')
            .setDescription(
                `Buy items to defend yourself in Polymorphia duels!\n\n` +
                `**Your Balance:** **${user.candies}** 🍬 candies\n` +
                `*Click a button below to make a purchase.*`
            )
            .setColor(0x9B59B6)
            .setTimestamp()

        const rows = []
        let currentRow = new ActionRowBuilder()

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const emoji = item.emoji || '📦'
            const rarityColor = colorFromRarity(item.rarity)
            const canAfford = user.candies >= item.price

            embed.addFields({
                name: `${emoji} ${item.name}`,
                value: [
                    `**Price:** ${item.price} 🍬 ${canAfford ? '✅' : '❌'}`,
                    `*${item.description || getDefaultDescription(item)}*`,
                    `**Rarity:** \`${item.rarity.toUpperCase()}\``
                ].join('\n'),
                inline: true
            })

            const btn = new ButtonBuilder()
                .setCustomId(`polymorphia_shop_buy:${item.name}`)
                .setLabel(`${canAfford ? 'Buy' : '🔒'} ${emoji}`)
                .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(!canAfford)

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
    const { progressBar, cooldownBar, relativeTimestamp } = require('#polymorphia/utils')
    const { DUEL_COOLDOWN_MS, PROTECTION_MS } = require('#polymorphia/CooldownManager')
    const { checkVeteranRole } = require('#polymorphia/handlers/duelHandler')

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

        // Check veteran role for badge display
        const veteranBonus = await checkVeteranRole(interaction.guild, discordId)
        const veteranBadge = veteranBonus > 0 ? ' 🎖️ Invocador Veterano' : ''

        const s = user.state
        const isPolymorphed = s?.isActive || false
        const totalDuels = user.polymorphiaWins + user.polymorphiaLosses
        const winRate = totalDuels > 0 ? Math.round((user.polymorphiaWins / totalDuels) * 100) : 0

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${target.username} — Polymorphia Stats${veteranBadge}`)
            .setColor(isPolymorphed ? 0xE74C3C : 0x9B59B6)
            .addFields(
                { name: '🏆 Wins', value: `**${user.polymorphiaWins}**`, inline: true },
                { name: '💀 Losses', value: `**${user.polymorphiaLosses}**`, inline: true },
                { name: '🛡️ Defended', value: `**${user.polymorphiaSaved}**`, inline: true },
                { name: '📊 Win Rate', value: `**${winRate}%** (${totalDuels} total duels)`, inline: true },
                { name: '🍬 Candies', value: `**${user.candies}** 🍬`, inline: true },
                { name: '💰 Total Earned', value: `**${user.totalEarned}** 🍬`, inline: true }
            )

        // ── Active polymorphia state ──
        if (isPolymorphed && s.endsAt) {
            const now = Date.now()
            const total = s.endsAt.getTime() - s.startedAt.getTime()
            const elapsed = now - s.startedAt.getTime()
            embed.addFields({
                name: '⚡ Currently Polymorphed!',
                value: [
                    `**Form:** ${s.currentForm}`,
                    `**Duration:** ${progressBar(elapsed, total)}`,
                    `**Expires:** ${relativeTimestamp(s.endsAt)}`,
                    `**Started:** ${s.previousNickname} → **${s.currentForm}**`
                ].join('\n'),
                inline: false
            })
        }

        // ── Cooldown status (only shown for self) ──
        if (target.id === interaction.user.id) {
            const cooldownLines = []

            if (user.lastPolymorphiaUse) {
                const elapsed = Date.now() - user.lastPolymorphiaUse.getTime()
                if (elapsed < DUEL_COOLDOWN_MS) {
                    const remaining = DUEL_COOLDOWN_MS - elapsed
                    cooldownLines.push(
                        `⏳ **Duel Cooldown:** ${cooldownBar(remaining, DUEL_COOLDOWN_MS)}`
                    )
                } else {
                    cooldownLines.push(`✅ **Duel Ready** — You can initiate a duel!`)
                }
            } else {
                cooldownLines.push(`✅ **Duel Ready** — You can initiate a duel!`)
            }

            if (user.polymorphiaProtectedUntil) {
                const remaining = user.polymorphiaProtectedUntil.getTime() - Date.now()
                if (remaining > 0) {
                    cooldownLines.push(
                        `🛡️ **Protected:** ${cooldownBar(remaining, PROTECTION_MS)}`
                    )
                }
            }

            if (cooldownLines.length > 0) {
                embed.addFields({
                    name: '⏱️ Cooldown Status',
                    value: cooldownLines.join('\n'),
                    inline: false
                })
            }
        }

        embed.setTimestamp()

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