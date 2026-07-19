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
                .addIntegerOption(opt =>
                    opt
                        .setName('bet')
                        .setDescription('Cantidad de gominolas a apostar')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('shop')
                .setDescription('Navega por la tienda de objetos de Polymorphia')
        )
        .addSubcommand(sub =>
            sub
                .setName('buy')
                .setDescription('Compra un objeto de la tienda por nombre')
                .addStringOption(opt =>
                    opt
                        .setName('item')
                        .setDescription('Nombre del objeto a comprar (exacto)')
                        .setRequired(true)
                )
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
                        content: 'necesito permiso **Gestionar Apodos** para que funcione Polymorphia, avisale a un admin',
                        ephemeral: true
                    })
                    return
                }
                await handleDuel(interaction, client)
                break

            case 'shop':
                await handleShop(interaction, client)
                break
            case 'buy':
                await handleBuy(interaction, client)
                break

            case 'inventory':
                await handleInventory(interaction, client)
                break

            case 'stats':
                await handleStats(interaction, client)
                break

            default:
                await interaction.reply({
                    content: 'subcomando desconocido, usá `/polymorphia duel @usuario` para desafiar a alguien',
                    ephemeral: true
                })
        }
    }
}

async function handleShop(interaction) {
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
    const { getOrCreateUser, prisma } = require('#services/database')
    const { colorFromRarity } = require('#polymorphia/utils')
    const { detectGender, g } = require('#utils/gender')

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

        const gender = detectGender(interaction.member)

        if (items.length === 0) {
            await interaction.editReply('la tienda está vacía ahora, volvé más tarde')
            return
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Tienda de Objetos', iconURL: iconifyUrlFromColor('CANDY', 0x9B59B6) })
            .setTitle('Tienda de Defensa Polymorphia')
            .setDescription(
                `comprá objetos para defenderte en los duelos!\n\n` +
                `**Tu saldo:** **${user.candies}** 🍬\n` +
                `*clic en un botón para comprar*`
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
                    `**Precio:** ${item.price} 🍬`,
                    `*${item.description || getDefaultDescription(item)}*`,
                    `**Rareza:** \`${item.rarity.toUpperCase()}\``
                ].join('\n'),
                inline: true
            })

            const btn = new ButtonBuilder()
                .setCustomId(`polymorphia_shop_buy:${item.name}`)
                .setLabel(`${canAfford ? 'Comprar' : 'Sin saldo'}`)
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
        const logger = require('#utils/logger').child({ command: 'polymorphia', subcommand: 'shop' })
        logger.error({ err: error }, 'Error loading shop data')
        await interaction.editReply('error al cargar la tienda, intentá de nuevo')
    }
}

async function handleBuy(interaction) {
    const itemName = interaction.options.getString('item')
    const guildId = interaction.guild.id
    const discordId = interaction.user.id

    if (!itemName) {
        await interaction.reply({ content: 'debes indicar el nombre del objeto a comprar', ephemeral: true })
        return
    }

    await interaction.deferReply({ ephemeral: true })

    const result = await require('#services/database').purchaseItem(discordId, guildId, itemName)

    if (!result.success) {
        await interaction.editReply({ content: result.error || 'compra fallida' })
        return
    }

    await interaction.editReply({ content: `Has comprado **${itemName}**. Revisa tu inventario o usa /polymorphia inventory.` })

    // Apply voluntary form if it's a form item (same flow as button handler)
    try {
        const item = result.item || await require('#services/database').prisma.item.findUnique({ where: { name: itemName } })
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

// Export a test hook for the handler to allow unit testing without full Discord Interaction
if (process.env.NODE_ENV === 'test') {
    module.exports.__testHandleBuy = handleBuy
}

async function handleInventory(interaction) {
    const { EmbedBuilder } = require('discord.js')
    const { prisma } = require('#services/database')
    const { detectGender, g } = require('#utils/gender')

    const target = interaction.options.getUser('user') || interaction.user
    const guildId = interaction.guild.id
    const discordId = target.id

    const targetMember = interaction.options.getMember('user') || interaction.member

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
            const isSelf = target.id === interaction.user.id
            const gender = detectGender(targetMember)
            await interaction.editReply(
                isSelf
                    ? `no tenés nada en el inventario, ${target}`
                    : `${target} no tiene nada en el inventario`
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
        const logger = require('#utils/logger').child({ command: 'polymorphia', subcommand: 'inventory' })
        logger.error({ err: error }, 'Error loading inventory')
        await interaction.editReply('error al cargar el inventario')
    }
}

async function handleStats(interaction) {
    const { EmbedBuilder } = require('discord.js')
    const { prisma } = require('#services/database')
    const { progressBar, cooldownBar, relativeTimestamp } = require('#polymorphia/utils')
    const { DUEL_COOLDOWN_MS, PROTECTION_MS } = require('#services/database')
    const { checkVeteranRole } = require('#polymorphia/handlers/duelHandler')
    const { detectGender, g } = require('#utils/gender')

    const target = interaction.options.getUser('user') || interaction.user
    const guildId = interaction.guild.id
    const discordId = target.id

    // Resolve member for gender detection
    const targetMember = interaction.options.getMember('user') || interaction.member

    await interaction.deferReply()

    try {
        const user = await prisma.user.findUnique({
            where: {
                discordId_guildId: { discordId, guildId }
            },
            include: { state: true }
        })

        const gender = detectGender(targetMember)

        if (!user) {
            await interaction.editReply(
                `${target.id === interaction.user.id ? 'todavía no tenés' : `${target} todavía no tiene`} stats de Polymorphia`
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
            .setAuthor({ name: `Stats de Polymorphia${veteranSuffix}`, iconURL: iconifyUrlFromColor('CHART', statsColor) })
            .setTitle(target.username)
            .setColor(statsColor)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: 'Wins', value: `**${user.polymorphiaWins}**`, inline: true },
                { name: 'Derrotas', value: `**${user.polymorphiaLosses}**`, inline: true },
                { name: 'Defensas', value: `**${user.polymorphiaSaved}**`, inline: true },
                { name: 'Win Rate', value: `**${winRate}%** (${totalDuels} total)`, inline: true },
                { name: '🍬 Gominolas', value: `**${user.candies}**`, inline: true },
                { name: 'Total Ganado', value: `**${user.totalEarned}** 🍬`, inline: true }
            )

        // ── Active polymorphia state ──
        if (isPolymorphed && s.endsAt) {
            const now = Date.now()
            const total = s.endsAt.getTime() - s.startedAt.getTime()
            const elapsed = now - s.startedAt.getTime()
            embed.addFields({
                name: '⚡ Polimorfizad@',
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
                        `**Enfriamiento:** ${cooldownBar(remaining, DUEL_COOLDOWN_MS)}`
                    )
                } else {
                    cooldownLines.push('**Listo** — ¡podés iniciar un duelo!')
                }
            } else {
                cooldownLines.push('**Listo** — ¡podés iniciar un duelo!')
            }

            if (user.polymorphiaProtectedUntil) {
                const remaining = user.polymorphiaProtectedUntil.getTime() - Date.now()
                if (remaining > 0) {
                    cooldownLines.push(
                        `**Protegid@:** ${cooldownBar(remaining, PROTECTION_MS)}`
                    )
                }
            }

            if (cooldownLines.length > 0) {
                embed.addFields({
                    name: 'Estado',
                    value: cooldownLines.join('\n'),
                    inline: false
                })
            }
        }

        embed.setTimestamp()

        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        const logger = require('#utils/logger').child({ command: 'polymorphia', subcommand: 'stats' })
        logger.error({ err: error }, 'Error loading polymorphia stats')
        await interaction.editReply('error al cargar las stats')
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
