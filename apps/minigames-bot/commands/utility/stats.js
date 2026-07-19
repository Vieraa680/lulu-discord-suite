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

const LEADERBOARD_CATEGORIES = {
    candies: {
        label: 'Gominolas',
        emoji: '🍬',
        description: 'Users con más gominolas en su saldo'
    },
    totalEarned: {
        label: 'Ganado (Total)',
        emoji: '💰',
        description: 'Users que más gominolas ganaron'
    },
    polymorphiaWins: {
        label: 'Wins Polymorphia',
        emoji: '🏆',
        description: 'Users con más wins en duelos de Polymorphia'
    },
    polymorphiaSaved: {
        label: 'Defensas Exitosas',
        emoji: '🛡️',
        description: 'Users con más defensas exitosas en Polymorphia'
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Stats del server y leaderboards.')
        .addSubcommand(sub =>
            sub
                .setName('server')
                .setDescription('Muestra stats generales del server.')
        )
        .addSubcommand(sub =>
            sub
                .setName('leaderboard')
                .setDescription('Muestra el top de users por categoría.')
                .addStringOption(opt =>
                    opt
                        .setName('categoria')
                        .setDescription('Categoría')
                        .setRequired(true)
                        .addChoices(
                            { name: '🍬 Gominolas', value: 'candies' },
                            { name: '💰 Total Ganado', value: 'totalEarned' },
                            { name: '🏆 Wins Polymorphia', value: 'polymorphiaWins' },
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
                    content: 'subcomando desconocido, usá `/stats server` o `/stats leaderboard`',
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
            `**Transacciones:** ${formatNumber(stats.totalTransactions)}`
        ].join('\n')

        // ── Polymorphia overview ──
        const totalDuels = stats.totalPolymorphiaWins + stats.totalPolymorphiaLosses
        const polymorphiaLines = [
            `**Duelos Totales:** ${formatNumber(totalDuels)}`,
            `**Wins:** ${formatNumber(stats.totalPolymorphiaWins)} 🏆`,
            `**Derrotas:** ${formatNumber(stats.totalPolymorphiaLosses)} 💔`,
            `**Defensas Exitosas:** ${formatNumber(stats.totalPolymorphiaSaved)} 🛡️`,
            `**Polimorfizad@s:** ${formatNumber(stats.activePolymorphiaCount)} ⚡`
        ].join('\n')

        // ── Activity overview ──
        const activityLines = [
            `**Users Registrados:** ${formatNumber(stats.totalUsers)} 👥`,
            `**Mariposas Atrapadas:** ${formatNumber(butterflyCount)} 🦋`
        ].join('\n')

        const embed = new EmbedBuilder()
            .setAuthor({
                name: 'Stats del Server',
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
        const logger = require('#utils/logger').child({ command: 'stats', subcommand: 'server' })
        logger.error({ err: error }, 'Error fetching server stats')
        await interaction.editReply('ups, hubo un error al cargar las stats del server')
    }
}

async function handleLeaderboard(interaction) {
    await interaction.deferReply()

    const guildId = interaction.guild.id
    const category = interaction.options.getString('categoria')
    const meta = LEADERBOARD_CATEGORIES[category]

    if (!meta) {
        await interaction.editReply('categoría inválida, usá una de las opciones del comando')
        return
    }

    try {
        const topUsers = await getLeaderboard(guildId, category, 10)

        if (topUsers.length === 0) {
            await interaction.editReply(
                `todavía no hay datos para el leaderboard de **${meta.label}**. ` +
                '¡jugá minijuegos y aparecé acá!'
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
                name: `Top: ${meta.label}`,
                iconURL: iconifyUrlFromColor('TROPHY', 0xF1C40F)
            })
            .setTitle(`🏅 Top ${topUsers.length} — ${meta.emoji} ${meta.label}`)
            .setDescription(meta.description)
            .setColor(0xF1C40F)
            .setThumbnail(iconifyUrlFromColor('TROPHY', 0xF1C40F))
            .addFields(
                { name: 'Ranking', value: leaderboardLines.join('\n'), inline: false }
            )
            .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        const logger = require('#utils/logger').child({ command: 'stats', subcommand: 'leaderboard' })
        logger.error({ err: error }, 'Error fetching leaderboard')
        await interaction.editReply('ups, hubo un error al cargar el leaderboard')
    }
}