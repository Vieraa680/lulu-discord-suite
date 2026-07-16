const {
    SlashCommandBuilder,
    EmbedBuilder,
    escapeMarkdown
} = require('discord.js')
const {
    getServerStats,
    getLeaderboard,
    getButterflyCaughtCount
} = require('#services/database')
const { iconifyUrlFromColor } = require('#services/icons')
const { formatNumber } = require('#polymorphia/utils')

// ── Category display metadata ──
const LEADERBOARD_CATEGORIES = {
    candies: {
        label: 'Gominolas',
        emoji: '🍬',
        description: 'Usuarios con más gominolas en su saldo'
    },
    totalEarned: {
        label: 'Ganado (Total)',
        emoji: '💰',
        description: 'Usuarios que más gominolas han ganado en total'
    },
    polymorphiaWins: {
        label: 'Victorias Polymorphia',
        emoji: '🏆',
        description: 'Usuarios con más victorias en duelos de Polymorphia'
    },
    polymorphiaSaved: {
        label: 'Defensas Exitosas',
        emoji: '🛡️',
        description: 'Usuarios con más defensas exitosas en Polymorphia'
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Estadísticas globales del servidor y leaderboards.')
        .addSubcommand(sub =>
            sub
                .setName('server')
                .setDescription('Muestra estadísticas generales del servidor en Lulu.')
        )
        .addSubcommand(sub =>
            sub
                .setName('leaderboard')
                .setDescription('Muestra el top de usuarios por categoría.')
                .addStringOption(opt =>
                    opt
                        .setName('categoria')
                        .setDescription('Categoría del leaderboard')
                        .setRequired(true)
                        .addChoices(
                            { name: '🍬 Gominolas', value: 'candies' },
                            { name: '💰 Total Ganado', value: 'totalEarned' },
                            { name: '🏆 Victorias Polymorphia', value: 'polymorphiaWins' },
                            { name: '🛡️ Defensas Exitosas', value: 'polymorphiaSaved' }
                        )
                )
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand()

        switch (subcommand) {
            case 'server':
                await handleServerStats(interaction)
                break
            case 'leaderboard':
                await handleLeaderboard(interaction)
                break
            default:
                await interaction.reply({
                    content: 'Subcomando desconocido. Usa `/stats server` o `/stats leaderboard`.',
                    ephemeral: true
                })
        }
    }
}

async function handleServerStats(interaction) {
    await interaction.deferReply()

    const guildId = interaction.guild.id

    try {
        const [stats, butterflyCount] = await Promise.all([
            getServerStats(guildId),
            getButterflyCaughtCount(guildId)
        ])

        // ── Economy overview ──
        const economyLines = [
            `**Total en Circulación:** ${formatNumber(stats.totalCandiesInEconomy)} 🍬`,
            `**Total Ganado:** ${formatNumber(stats.totalEarned)} 🍬`,
            `**Total Gastado:** ${formatNumber(stats.totalSpent)} 🍬`,
            `**Transacciones Registradas:** ${formatNumber(stats.totalTransactions)}`
        ].join('\n')

        // ── Polymorphia overview ──
        const totalDuels = stats.totalPolymorphiaWins + stats.totalPolymorphiaLosses
        const polymorphiaLines = [
            `**Duelos Totales:** ${formatNumber(totalDuels)}`,
            `**Victorias (total):** ${formatNumber(stats.totalPolymorphiaWins)} 🏆`,
            `**Derrotas (total):** ${formatNumber(stats.totalPolymorphiaLosses)} 💔`,
            `**Defensas Exitosas:** ${formatNumber(stats.totalPolymorphiaSaved)} 🛡️`,
            `**Actualmente Polimorfizados:** ${formatNumber(stats.activePolymorphiaCount)} ⚡`
        ].join('\n')

        // ── Activity overview ──
        const activityLines = [
            `**Usuarios Registrados:** ${formatNumber(stats.totalUsers)} 👥`,
            `**Mariposas Atrapadas:** ${formatNumber(butterflyCount)} 🦋`
        ].join('\n')

        const embed = new EmbedBuilder()
            .setAuthor({
                name: 'Estadísticas del Servidor',
            })
            .setColor(0x9B59B6)
            .setThumbnail(iconifyUrlFromColor('CHART', 0x9B59B6))
            .addFields(
                { name: '👥 Actividad', value: activityLines, inline: false },
                { name: '💰 Economía', value: economyLines, inline: false },
                { name: '⚔️ Polymorphia', value: polymorphiaLines, inline: false }
            )
            .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        console.error('[stats:server] Error:', error.message)
        await interaction.editReply('Ocurrió un error al obtener las estadísticas del servidor.')
    }
}

async function handleLeaderboard(interaction) {
    await interaction.deferReply()

    const guildId = interaction.guild.id
    const category = interaction.options.getString('categoria')
    const meta = LEADERBOARD_CATEGORIES[category]

    if (!meta) {
        await interaction.editReply('Categoría de leaderboard inválida.')
        return
    }

    try {
        const topUsers = await getLeaderboard(guildId, category, 10)

        if (topUsers.length === 0) {
            await interaction.editReply(
                `No hay suficientes datos para mostrar el leaderboard de **${meta.label}** todavía. ` +
                '¡Participa en los minijuegos para aparecer aquí!'
            )
            return
        }

        // Build ranking list with medals for top 3
        const medals = ['🥇', '🥈', '🥉']

        const leaderboardLines = topUsers.map((entry, index) => {
            const rank = medals[index] || `\`#${index + 1}\``
            const name = escapeMarkdown(entry.username)
            const val = category === 'candies' || category === 'totalEarned'
                ? `${formatNumber(entry.value)} 🍬`
                : `${entry.value}`
            return `${rank} **${name}** — ${val}`
        })

        const embed = new EmbedBuilder()
            .setAuthor({
                name: `Leaderboard: ${meta.label}`,
                iconURL: iconifyUrlFromColor('TROPHY', 0xF1C40F)
            })
            .setTitle(`🏅 Top ${topUsers.length} — ${meta.emoji} ${meta.label}`)
            .setDescription(meta.description)
            .setColor(0xF1C40F)
            .setThumbnail(iconifyUrlFromColor('TROPHY', 0xF1C40F))
            .addFields(
                { name: 'Clasificación', value: leaderboardLines.join('\n'), inline: false }
            )
            .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        console.error('[stats:leaderboard] Error:', error.message)
        await interaction.editReply('Ocurrió un error al cargar el leaderboard.')
    }
}