const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { handleDuel } = require('#polymorphia/handlers/duelHandler')
const { iconifyUrlFromColor } = require('#services/icons')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('polymorphia')
        .setDescription('Minijuego Polymorphia — desafía a alguien a un duelo polimórfico.')
        .addSubcommand(sub =>
            sub
                .setName('duel')
                .setDescription('Desafía a alguien a un duelo de Polymorphia')
                .addUserOption(opt =>
                    opt
                        .setName('target')
                        .setDescription('El usuario a desafiar')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('shop')
                .setDescription('Navega por la tienda de objetos de Polymorphia')
        )
        .addSubcommand(sub =>
            sub
                .setName('inventory')
                .setDescription('Ver tus objetos en posesión')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('El usuario a consultar (por defecto tú mismo)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('stats')
                .setDescription('Ver estadísticas de duelos de Polymorphia')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('El usuario a consultar (por defecto tú mismo)')
                        .setRequired(false)
                )
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand()

        switch (subcommand) {
            case 'duel':
                if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                    await interaction.reply({
                        content: '¡Necesito el permiso **Gestionar Apodos** para ejecutar Polymorphia! Pide a un administrador que lo habilite.',
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
                    content: 'Subcomando desconocido. Usa `/polymorphia duel @usuario` para desafiar a alguien.',
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
            await interaction.editReply('La tienda está vacía ahora mismo. ¡Vuelve más tarde!')
            return
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Tienda de Objetos', iconURL: iconifyUrlFromColor('CANDY', 0x9B59B6) })
            .setTitle('Tienda de Defensa Polymorphia')
            .setDescription(
                `¡Compra objetos para defenderte en duelos de Polymorphia!\n\n` +
                `**Tu Saldo:** **${user.candies}** gominolas\n` +
                `*Haz clic en un botón para realizar una compra.*`
            )
            .setColor(0x9B59B6)
            .setThumbnail(iconifyUrlFromColor('SHIELD', 0x9B59B6))
            .setTimestamp()

        const rows = []
        let currentRow = new ActionRowBuilder()

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const rarityColor = colorFromRarity(item.rarity)
            const canAfford = user.candies >= item.price

            embed.addFields({
                name: item.name,
                value: [
                    `**Precio:** ${item.price} gominolas`,
                    `*${item.description || getDefaultDescription(item)}*`,
                    `**Rareza:** \`${item.rarity.toUpperCase()}\``
                ].join('\n'),
                inline: true
            })

            const btn = new ButtonBuilder()
                .setCustomId(`polymorphia_shop_buy:${item.name}`)
                .setLabel(`${canAfford ? 'Comprar' : 'Bloqueado'}`)
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
        await interaction.editReply('Ocurrió un error al cargar la tienda. Intenta de nuevo más tarde.')
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
                `${target.id === interaction.user.id ? 'No tienes' : `${target.username} no tiene`} objetos en el inventario.`
            )
            return
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Inventario', iconURL: target.displayAvatarURL({ dynamic: true, size: 128 }) })
            .setTitle(`Inventario de ${target.username}`)
            .setColor(0x9B59B6)
            .setThumbnail(iconifyUrlFromColor('PACKAGE', 0x9B59B6))
            .setTimestamp()

        for (const ui of user.items) {
            const item = ui.item
            embed.addFields({
                name: `${item.name} x${ui.quantity}`,
                value: `*${item.rarity} ${item.category}* — ${item.description || ''}`,
                inline: true
            })
        }

        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        console.error('[polymorphia:inventory] Error:', error.message)
        await interaction.editReply('Ocurrió un error al cargar el inventario.')
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
                `${target.id === interaction.user.id ? 'No tienes' : `${target.username} no tiene`} estadísticas de Polymorphia todavía.`
            )
            return
        }

        // Check veteran role for badge display
        const veteranBonus = await checkVeteranRole(interaction.guild, discordId)
        const veteranSuffix = veteranBonus > 0 ? ' — Invocador Veterano' : ''

        const s = user.state
        const isPolymorphed = s?.isActive || false
        const totalDuels = user.polymorphiaWins + user.polymorphiaLosses
        const winRate = totalDuels > 0 ? Math.round((user.polymorphiaWins / totalDuels) * 100) : 0

        const statsColor = isPolymorphed ? 0xE74C3C : 0x9B59B6
        const embed = new EmbedBuilder()
            .setAuthor({ name: `Estadísticas de Polymorphia${veteranSuffix}`, iconURL: iconifyUrlFromColor('CHART', statsColor) })
            .setTitle(target.username)
            .setColor(statsColor)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: 'Victorias', value: `**${user.polymorphiaWins}**`, inline: true },
                { name: 'Derrotas', value: `**${user.polymorphiaLosses}**`, inline: true },
                { name: 'Defensas', value: `**${user.polymorphiaSaved}**`, inline: true },
                { name: 'Win Rate', value: `**${winRate}%** (${totalDuels} total)`, inline: true },
                { name: 'Gominolas', value: `**${user.candies}**`, inline: true },
                { name: 'Total Ganado', value: `**${user.totalEarned}**`, inline: true }
            )

        // ── Active polymorphia state ──
        if (isPolymorphed && s.endsAt) {
            const now = Date.now()
            const total = s.endsAt.getTime() - s.startedAt.getTime()
            const elapsed = now - s.startedAt.getTime()
            embed.addFields({
                name: '⚡ Actualmente Polimorfizado',
                value: [
                    `**Forma:** ${s.currentForm}`,
                    `**Duración:** ${progressBar(elapsed, total)}`,
                    `**Expira:** ${relativeTimestamp(s.endsAt)}`,
                    `**Inicio:** ${s.previousNickname} → **${s.currentForm}**`
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
                        `**Enfriamiento de Duelo:** ${cooldownBar(remaining, DUEL_COOLDOWN_MS)}`
                    )
                } else {
                    cooldownLines.push('**Duelo Listo** — ¡Puedes iniciar un duelo!')
                }
            } else {
                cooldownLines.push('**Duelo Listo** — ¡Puedes iniciar un duelo!')
            }

            if (user.polymorphiaProtectedUntil) {
                const remaining = user.polymorphiaProtectedUntil.getTime() - Date.now()
                if (remaining > 0) {
                    cooldownLines.push(
                        `**Protegido:** ${cooldownBar(remaining, PROTECTION_MS)}`
                    )
                }
            }

            if (cooldownLines.length > 0) {
                embed.addFields({
                    name: 'Estado de Enfriamiento',
                    value: cooldownLines.join('\n'),
                    inline: false
                })
            }
        }

        embed.setTimestamp()

        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        console.error('[polymorphia:stats] Error:', error.message)
        await interaction.editReply('Ocurrió un error al cargar las estadísticas.')
    }
}

function getDefaultDescription(item) {
    const descriptions = {
        'Escudo de Banshee': '50% de probabilidad de bloquear el cambio de apodo por polimorfia. Se consume al usarlo.',
        'Cetro de Cristal': 'Reduce a la mitad la duración de la polimorfia y otorga +1 a las tiradas de defensa. Pasivo.',
        'Poción de Polvo de Hada': 'Otorga +3 a tu tirada de defensa en un duelo de Polymorphia. Se consume al usarlo.',
        'Red de Mariposas': 'Aumenta el rango de captura de mariposas.',
        'Poción de Polimorfia': 'Una poción misteriosa con efectos desconocidos.'
    }
    return descriptions[item.name] || ''
}

