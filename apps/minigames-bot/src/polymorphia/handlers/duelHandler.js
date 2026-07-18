const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js')
const { findUserByDiscord, prisma, incrementDailyDuelCount } = require('#services/database')
const { resolveBestOfThree, getDefenseItemConfig, getRandomDuration } = require('../DuelEngine')
const { canInitiateDuel, canBeTargeted } = require('../CooldownManager')
const { executeRewardFlow, applyPolymorphia } = require('../RewardManager')
const { getOwnedDefenseItems, consumeItem } = require('../ItemDefense')
const { getOrCreateUser } = require('#services/database')
const { progressBar, relativeTimestamp } = require('../utils')
const {
    iconifyUrlFromColor
} = require('#services/icons')
const { detectGender, g } = require('#utils/gender')

// Active duels map: `challengerId_targetId` -> duel session data
const activeDuelRequests = new Map()

const CHALLENGE_TIMEOUT_MS = 60_000  // 60s to accept/reject
const DEFENSE_TIMEOUT_MS = 20_000    // 20s to pick defense
const VETERAN_ROLE_NAME = process.env.VETERAN_ROLE_NAME || 'Invocador Veterano'

async function handleDuel(interaction, client) {
    const target = interaction.options.getUser('target')
    const challengerGender = detectGender(interaction.member)

    // ── Basic validation ──
    if (target.id === interaction.user.id) {
        await interaction.reply({
            content: `nah ${interaction.user} no te podés desafiar a vos mism${g(challengerGender, { m: 'o', f: 'a' })} xd buscá a otro`,
            ephemeral: true
        })
        return
    }

    if (target.id === client.user.id) {
        return await handleBotDuel(interaction, client)
    }

    if (target.bot) {
        await interaction.reply({
            content: 'los bots no juegan polymorfa pa, desafiá a alguien de verdad',
            ephemeral: true
        })
        return
    }

    const guildId = interaction.guild.id
    const challengerId = interaction.user.id
    const targetId = target.id
    const betAmount = interaction.options.getInteger('bet')

    if (!betAmount || betAmount < 1) {
        await interaction.reply({
            content: 'poné una cantidad de gominolas válida (mínimo 1)',
            ephemeral: true
        })
        return
    }

    // Check for existing active duel
    const duelKey = makeDuelKey(challengerId, targetId)
    const reverseKey = makeDuelKey(targetId, challengerId)
    if (activeDuelRequests.has(duelKey) || activeDuelRequests.has(reverseKey)) {
        await interaction.reply({
            content: 'ya hay un duelo activo entre ustedes, esperen a que termine',
            ephemeral: true
        })
        return
    }

    await interaction.deferReply()

    // ── Resolve member ──
    const resolvedMembers = interaction.options.resolved?.members
    const member = resolvedMembers?.get(target.id)

    if (!member) {
        await interaction.editReply('no encontré a ese user en el server, f')
        return
    }

    // ── Resolve display names ──
    const challengerName = interaction.member.nickname || interaction.user.displayName || interaction.user.username
    const targetName = member.nickname || target.displayName || target.username

    const targetGender = detectGender(member)

    // ── Get or create user DB records ──

    const [challengerDb, targetDb] = await Promise.all([
        getOrCreateUser(challengerId, guildId, challengerName),
        getOrCreateUser(targetId, guildId, targetName)
    ])

    // ── Cooldown check (challenger) ──
    const cooldownCheck = await canInitiateDuel(challengerId, guildId)
    if (!cooldownCheck.allowed) {
        const msg = cooldownCheck.reason === 'cooldown'
            ? `tranqui ${interaction.user}, esperá **${cooldownCheck.remainingMinutes} min** más antes de tirar otro duelo`
            : 'llegaste al límite diario de duelos pa, volvé mañana'
        await interaction.editReply(msg)
        return
    }

    // ── Protection check (target) ──
    const protectionCheck = await canBeTargeted(targetId, guildId)
    if (!protectionCheck.allowed) {
        const msg = protectionCheck.reason === 'protection'
            ? `${target} tiene un hechizo de protección, podés desafiarl${g(targetGender, { m: 'o', f: 'a' })} de nuevo <t:${Math.floor(protectionCheck.until.getTime() / 1000)}:R>`
            : `${target} ya está polimorfizad${g(targetGender, { m: 'o', f: 'a' })}, esperá a que expire <t:${Math.floor(protectionCheck.until.getTime() / 1000)}:R>`
        await interaction.editReply(msg)
        return
    }

    // ── Candy check (both must have >= betAmount) ──
    if (challengerDb.candies < betAmount) {
        await interaction.editReply(
            `necesitás **${betAmount} gominolas** para esa apuesta y tenés ${challengerDb.candies} nomás, ${interaction.user}`
        )
        return
    }
    if (targetDb.candies < betAmount) {
        await interaction.editReply(
            `${target} necesita **${betAmount} gominolas** y solo tiene ${targetDb.candies}, no le da`
        )
        return
    }

    // ── Fetch veteran role status ──
    const [challengerVetBonus, targetVetBonus] = await Promise.all([
        checkVeteranRole(interaction.guild, challengerId),
        checkVeteranRole(interaction.guild, targetId)
    ])
    const challengerVetSuffix = challengerVetBonus > 0 ? ' — Veterano' : ''
    const targetVetSuffix = targetVetBonus > 0 ? ' — Veterano' : ''

    const challengerLabel = g(challengerGender, { m: 'el', f: 'la' })
    const targetLabel = g(targetGender, { m: 'al', f: 'a la' })

    // ── Send challenge embed ──
    const totalPot = betAmount * 2
    const challengeEmbed = new EmbedBuilder()
        .setAuthor({ name: 'Duelo de Polymorphia', iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }) })
        .setTitle('¡Duelo Polymorphia!')
        .setDescription(
            `${interaction.user} desafió a ${target} a un duelo de Polymorphia!\n\n` +
            `**Formato:** al mejor de **3 rondas** — el que gane 2 se lleva todo\n` +
            `**Apuesta:** **${betAmount}** gominolas cada uno\n` +
            `**Premio:** **${totalPot}** gominolas\n` +
            `**Perdedor:** pierde todo (-${betAmount})\n\n` +
            `*el que pierda queda polimorfizad@ en un campeón de League of Legends*`
        )
        .addFields(
            {
                name: `⚔️ ${challengerLabel} retador${g(challengerGender, { m: '', f: 'a' })}${challengerVetSuffix}`,
                value: `Wins: **${challengerDb.polymorphiaWins}** | Derrotas: **${challengerDb.polymorphiaLosses}** | **${challengerDb.candies}** 🍬`,
                inline: true
            },
            {
                name: `🛡️ ${targetLabel} objetiv${g(targetGender, { m: 'o', f: 'a' })}${targetVetSuffix}`,
                value: `Wins: **${targetDb.polymorphiaWins}** | Derrotas: **${targetDb.polymorphiaLosses}** | **${targetDb.candies}** 🍬`,
                inline: true
            }
        )
        .setColor(0x9B59B6)
        .setThumbnail(iconifyUrlFromColor('SWORDS', 0x9B59B6))
        .setFooter({ text: `${target.username} tiene 60 segundos para aceptar o rechazar` })
        .setTimestamp()

    const acceptBtn = new ButtonBuilder()
        .setCustomId(`polymorphia_accept:${challengerId}:${targetId}`)
        .setLabel('Aceptar')
        .setStyle(ButtonStyle.Success)

    const rejectBtn = new ButtonBuilder()
        .setCustomId(`polymorphia_reject:${challengerId}:${targetId}`)
        .setLabel('Rechazar')
        .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn)

    const challengeMsg = await interaction.editReply({
        embeds: [challengeEmbed],
        components: [row]
    })

    // Store duel request
    const duelSession = {
        challengerId,
        targetId,
        challengerDb,
        targetDb,
        guildId,
        betAmount,
        challengeMsg,
        interaction,
        status: 'pending', // pending | accepted | rejected | expired
        defenseItem: null
    }

    activeDuelRequests.set(duelKey, duelSession)

    // Auto-expire after 60s
    setTimeout(() => {
        const session = activeDuelRequests.get(duelKey)
        if (session && session.status === 'pending') {
            session.status = 'expired'
            activeDuelRequests.delete(duelKey)

            const expiredEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Expirado', iconURL: iconifyUrlFromColor('ALARM', 0x95A5A6) })
                .setTitle('Desafío Expirado')
                .setDescription(`${target} no respondió a tiempo, el duelo expiró`)
                .setColor(0x95A5A6)
                .setThumbnail(iconifyUrlFromColor('CROSS', 0x95A5A6))
                .setTimestamp()

            interaction.editReply({ embeds: [expiredEmbed], components: [] }).catch(() => {})
        }
    }, CHALLENGE_TIMEOUT_MS)
}

/**
 * Handle a button interaction during the duel flow.
 * Called from polymorphiaInteractions.js
 */
async function handleDuelButton(interaction) {
    const { customId } = interaction
    const parts = customId.split(':')
    const action = parts[0]
    const challengerId = parts[1]
    const targetId = parts[2]

    const duelKey = makeDuelKey(challengerId, targetId)
    const session = activeDuelRequests.get(duelKey)

    if (!session) {
        await interaction.reply({
            content: 'ese duelo ya expiró o no existe',
            ephemeral: true
        })
        return
    }

    if (interaction.user.id !== targetId) {
        await interaction.reply({
            content: 'solo la persona desafiada puede responder a este duelo',
            ephemeral: true
        })
        return
    }

    if (session.status !== 'pending') {
        await interaction.reply({
            content: 'este duelo ya fue resuelto',
            ephemeral: true
        })
        return
    }

    if (action === 'polymorphia_reject') {
        session.status = 'rejected'
        activeDuelRequests.delete(duelKey)

        const rejectedEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Rechazado', iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }) })
            .setTitle('Duelo Rechazado')
            .setDescription(`${interaction.user} rechazó el duelo. No se perdió nada.`)
            .setColor(0xE74C3C)
            .setThumbnail(iconifyUrlFromColor('CROSS', 0xE74C3C))
            .setTimestamp()

        await interaction.update({ embeds: [rejectedEmbed], components: [] })
        return
    }

    if (action === 'polymorphia_accept') {
        session.status = 'accepted'
        await showDefenseSelection(interaction, session)
    }
}

/**
 * Show defense item selection to the defender.
 */
async function showDefenseSelection(interaction, session) {
    const { challengerId, targetId, guildId } = session
    const defenderId = targetId

    const ownedItems = await getOwnedDefenseItems(defenderId, guildId)

    const defenseEmbed = new EmbedBuilder()
        .setAuthor({ name: 'Fase de Defensa', iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }) })
        .setTitle('Elegí tu Defensa')
        .setDescription(
            `${interaction.user}, ¡duelo aceptado!\n\n` +
            'elegí cómo defenderte, tenés **20 segundos**'
        )
        .setColor(0x3498DB)
        .setThumbnail(iconifyUrlFromColor('SHIELD', 0x3498DB))
        .setTimestamp()

    const row = new ActionRowBuilder()
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`polymorphia_defense:none:${challengerId}:${targetId}`)
            .setLabel('Sin Defensa')
            .setStyle(ButtonStyle.Secondary)
    )

    // Add owned defense items as buttons
    // ItemDefense returns items the user actually owns
    for (const item of ownedItems) {
        if (row.components.length >= 5) break
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`polymorphia_defense:${item.name}:${challengerId}:${targetId}`)
                .setLabel(item.name)
                .setStyle(ButtonStyle.Primary)
        )
    }

    await interaction.update({ embeds: [defenseEmbed], components: [row] })

    // Auto-resolve after timeout
    setTimeout(async () => {
        const currentSession = activeDuelRequests.get(makeDuelKey(challengerId, targetId))
        if (currentSession && currentSession.status === 'accepted' && currentSession.defenseItem === null) {
            currentSession.defenseItem = null // No defense
            await resolveAndComplete(interaction, currentSession)
        }
    }, DEFENSE_TIMEOUT_MS)
}

/**
 * Handle defense selection button.
 */
async function handleDefenseButton(interaction) {
    const parts = interaction.customId.split(':')
    const defenseName = parts[1] === 'none' ? null : parts[1]
    const challengerId = parts[2]
    const targetId = parts[3]

    const duelKey = makeDuelKey(challengerId, targetId)
    const session = activeDuelRequests.get(duelKey)

    if (!session || session.status !== 'accepted') {
        await interaction.reply({
            content: 'esa defensa ya no es válida',
            ephemeral: true
        })
        return
    }

    if (interaction.user.id !== targetId) {
        await interaction.reply({
            content: 'solo el defensor elige la defensa',
            ephemeral: true
        })
        return
    }

    session.defenseItem = defenseName

    await interaction.deferUpdate()

    await resolveAndComplete(interaction, session)
}

/**
 * Resolve the best-of-3 duel and execute the reward flow.
 */
async function resolveAndComplete(interaction, session) {
    const { challengerId, targetId, challengerDb, targetDb, guildId, defenseItem, betAmount } = session
    const duelKey = makeDuelKey(challengerId, targetId)

    // Mark as resolved
    session.status = 'resolved'
    activeDuelRequests.delete(duelKey)

    // Get fresh user records with current stats
    const [freshAttacker, freshDefender] = await Promise.all([
        findUserByDiscord(challengerId, guildId),
        findUserByDiscord(targetId, guildId)
    ])

    // Fetch veteran status for both players
    const [challengerVet, targetVet] = await Promise.all([
        checkVeteranRole(interaction.guild, challengerId),
        checkVeteranRole(interaction.guild, targetId)
    ])

    // Attach veteran bonus to stats objects for DuelEngine
    const attackerStats = { ...(freshAttacker || challengerDb), veteranBonus: challengerVet }
    const defenderStats = { ...(freshDefender || targetDb), veteranBonus: targetVet }

    // ── Resolve best-of-3 duel ──
    const duelResult = resolveBestOfThree(
        attackerStats,
        defenderStats,
        defenseItem
    )

    // Execute reward flow (uses winner + blockedByShield from duelResult)
    const summary = await executeRewardFlow(
        interaction,
        duelResult,
        freshAttacker || challengerDb,
        freshDefender || targetDb,
        guildId,
        betAmount
    )

    // Consume defense item if used
    if (defenseItem) {
        const config = getDefenseItemConfig(defenseItem)
        if (config && config.consumed) {
            await consumeItem(targetId, guildId, defenseItem)
        }
    }

    // ── Resolve gender for both players ──
    const winnerId = summary.isAttackerWinner ? challengerId : targetId
    const loserId = summary.isAttackerWinner ? targetId : challengerId
    const winnerMember = interaction.guild.members.cache.get(winnerId)
    const loserMember = interaction.guild.members.cache.get(loserId)
    const winnerGender = detectGender(winnerMember)
    const loserGender = detectGender(loserMember)

    // ── Build rich best-of-3 result embed ──
    const resultColor = summary.isAttackerWinner ? 0x9B59B6 : 0x2ECC71
    const resultIcon = summary.isAttackerWinner ? 'TROPHY' : 'SHIELD'
    const winnerUser = winnerMember?.user || interaction.client.users.cache.get(winnerId)
    const loserUser = loserMember?.user || interaction.client.users.cache.get(loserId)
    const winnerAvatar = winnerUser ? winnerUser.displayAvatarURL({ dynamic: true, size: 128 }) : iconifyUrlFromColor(resultIcon, resultColor)

    // Build round-by-round display
    const challengerUser = interaction.client.users.cache.get(challengerId)
    const targetUser = interaction.client.users.cache.get(targetId)
    const roundLines = duelResult.rounds.map((r, i) => {
        const roundWinner = r.winner === 'attacker'
            ? challengerUser?.username || 'Atacante'
            : targetUser?.username || 'Defensor'
        const emoji = r.winner === 'attacker' ? '⚔️' : '🛡️'
        return [
            `**Ronda ${i + 1}:**`,
            `${emoji} Atacante: \`${r.attackerRoll}\``,
            `🛡️ Defensor: \`${r.defenderRoll}\``,
            `→ **${roundWinner}**`
        ].join(' ')
    }).join('\n')

    const scoreText = `**${duelResult.attackerWins}** - **${duelResult.defenderWins}**`

    const winnerLabel = g(winnerGender, { m: 'el', f: 'la' })
    const loserLabel = g(loserGender, { m: 'el', f: 'la' })

    const resultEmbed = new EmbedBuilder()
        .setAuthor({
            name: summary.isAttackerWinner ? '⚔️ Atacante Victorioso' : '🛡️ Defensor Prevalece',
            iconURL: winnerAvatar
        })
        .setTitle(
            summary.isAttackerWinner
                ? `Polymorphia — ${winnerLabel} atacante gana ${scoreText}!`
                : `Polymorphia — ${winnerLabel} defensor prevalece ${scoreText}!`
        )
        .setColor(resultColor)
        .setThumbnail(iconifyUrlFromColor(resultIcon, resultColor))
        .addFields(
            {
                name: `📊 Serie al mejor de 3 (${scoreText})`,
                value: roundLines,
                inline: false
            },
            {
                name: '💰 Recompensas',
                value: [
                    `**Ganador:** **+${betAmount * 2}** 🍬 (neto +${betAmount})`,
                    `**Perdedor:** **-${betAmount}** 🍬 (pierde todo)`
                ].join('\n'),
                inline: false
            }
        )
        .setTimestamp()

    // ── Description based on outcome ──
    if (summary.isAttackerWinner) {
        if (summary.blockedByShield) {
            resultEmbed.setDescription(
                `**${winnerUser}** ganó ${scoreText}!\n\n` +
                `pero **${loserUser}** tenía **Escudo de Banshee** ` +
                `y bloqueó el cambio de nombre 🛡️ el escudo se hace trizas pero ${loserLabel} salvó\n\n` +
                `*las gominolas igual van para ${winnerLabel} vencedor${g(winnerGender, { m: '', f: 'a' })}*`
            )
        } else if (summary.polymorphiaApplied) {
            resultEmbed.setDescription(
                `**${winnerUser}** ganó ${scoreText}!\n\n` +
                `polimorfia lanzada sobre **${loserUser}**\n\n` +
                `*${loserLabel} perdedor${g(loserGender, { m: '', f: 'a' })} fue transformad${g(loserGender, { m: 'o', f: 'a' })} en un campeón de League of Legends xd*`
            )
        } else {
            const failDescription = summary.polymorphiaFailureReason
                ? `*${summary.polymorphiaFailureReason}.*`
                : '*se bugeó la magia y no se pudo cambiar el nombre*'
            resultEmbed.setDescription(
                `**${winnerUser}** ganó ${scoreText}!\n\n` +
                `${failDescription}\n\n` +
                `las gominolas igual fueron entregadas`
            )
        }
    } else {
        resultEmbed.setDescription(
            `**${winnerUser}** resistió la Polymorphia!\n\n` +
            `la magia rebota, nadie fue transformado\n\n` +
            `*${loserLabel} atacante perdió ${betAmount} gominolas, F*`
        )
    }

    await interaction.editReply({ embeds: [resultEmbed], components: [] })
}

async function handleBotDuel(interaction, client) {
    const betAmount = interaction.options.getInteger('bet')
    const guildId = interaction.guild.id
    const playerId = interaction.user.id
    const playerGender = detectGender(interaction.member)

    if (!betAmount || betAmount < 1) {
        await interaction.reply({
            content: 'poné una cantidad de gominolas válida (mínimo 1)',
            ephemeral: true
        })
        return
    }

    await interaction.deferReply()

    const playerName = interaction.member.nickname || interaction.user.displayName || interaction.user.username
    const playerDb = await getOrCreateUser(playerId, guildId, playerName)

    if (playerDb.candies < betAmount) {
        await interaction.editReply(
            `necesitás **${betAmount} gominolas** y tenés ${playerDb.candies} nomás, ${interaction.user}`
        )
        return
    }

    const cooldownCheck = await canInitiateDuel(playerId, guildId)
    if (!cooldownCheck.allowed) {
        const msg = cooldownCheck.reason === 'cooldown'
            ? `tranqui ${interaction.user}, esperá **${cooldownCheck.remainingMinutes} min** más antes de otro duelo`
            : 'llegaste al límite diario, volvé mañana'
        await interaction.editReply(msg)
        return
    }

    const playerVet = await checkVeteranRole(interaction.guild, playerId)

    // Get or create the bot's own User record so stats persist across duels
    const botDiscordId = client.user.id
    const botUsername = client.user.username
    const botDb = await getOrCreateUser(botDiscordId, guildId, botUsername)

    const botStats = { ...botDb, veteranBonus: 0 }
    const playerStats = { ...playerDb, veteranBonus: playerVet }

    const duelResult = resolveBestOfThree(playerStats, botStats, null)
    const isPlayerWinner = duelResult.winner === 'attacker'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isNewDay = !playerDb.dailyDuelDate || playerDb.dailyDuelDate < today

    if (isPlayerWinner) {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: playerDb.id },
                data: {
                    candies: { increment: betAmount },
                    totalEarned: { increment: betAmount },
                    polymorphiaWins: { increment: 1 }
                }
            }),
            prisma.transaction.create({
                data: {
                    userId: playerDb.id,
                    type: 'earn',
                    amount: betAmount * 2,
                    balanceAfter: playerDb.candies + betAmount,
                    description: `Ganó duelo de Polymorphia vs el Bot (+${betAmount} neto)`
                }
            }),
            prisma.user.update({
                where: { id: playerDb.id },
                data: {
                    dailyDuelCount: isNewDay ? 1 : { increment: 1 },
                    dailyDuelDate: new Date()
                }
            }),
            prisma.user.update({
                where: { id: botDb.id },
                data: { polymorphiaLosses: { increment: 1 } }
            })
        ])
    } else {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: playerDb.id },
                data: {
                    candies: { decrement: betAmount },
                    totalSpent: { increment: betAmount },
                    polymorphiaLosses: { increment: 1 }
                }
            }),
            prisma.transaction.create({
                data: {
                    userId: playerDb.id,
                    type: 'spend',
                    amount: -betAmount,
                    balanceAfter: playerDb.candies - betAmount,
                    description: `Perdió duelo de Polymorphia vs el Bot (-${betAmount})`
                }
            }),
            prisma.user.update({
                where: { id: playerDb.id },
                data: {
                    dailyDuelCount: isNewDay ? 1 : { increment: 1 },
                    dailyDuelDate: new Date()
                }
            }),
            prisma.user.update({
                where: { id: botDb.id },
                data: { polymorphiaWins: { increment: 1 } }
            })
        ])
    }

    let polymorphiaApplied = false
    let polymorphiaFailureReason = null

    if (!isPlayerWinner) {
        try {
            await applyPolymorphia(interaction, playerId, guildId)
            polymorphiaApplied = true
        } catch (error) {
            polymorphiaFailureReason = error.message
            console.error(`[Bot Duel] ❌ Error aplicando polimorfia a ${playerName}:`, error.message)
        }
    }

    const botUser = client.user
    const playerUser = interaction.user

    const resultColor = isPlayerWinner ? 0x9B59B6 : 0xE74C3C
    const resultIcon = isPlayerWinner ? 'TROPHY' : 'CROSS'

    const playerArt = g(playerGender, { m: 'el', f: 'la' })

    // Build round-by-round display for bot duel
    const roundLines = duelResult.rounds.map((r, i) => {
        const emoji = r.winner === 'attacker' ? '⚔️' : '🛡️'
        return [
            `**Ronda ${i + 1}:**`,
            `${emoji} Vos: \`${r.attackerRoll}\``,
            `🤖 Bot: \`${r.defenderRoll}\``,
            `→ **${r.winner === 'attacker' ? 'Vos' : '🤖 Bot'}**`
        ].join(' ')
    }).join('\n')

    const scoreText = `**${duelResult.attackerWins}** - **${duelResult.defenderWins}**`

    const resultEmbed = new EmbedBuilder()
        .setAuthor({
            name: isPlayerWinner ? '¡Ganaste!' : 'Perdiste...',
            iconURL: playerUser.displayAvatarURL({ dynamic: true, size: 128 })
        })
        .setTitle(isPlayerWinner ? '¡Le ganaste al Bot!' : 'El Bot te ganó')
        .setColor(resultColor)
        .setThumbnail(iconifyUrlFromColor(resultIcon, resultColor))
        .addFields(
            {
                name: `📊 Serie al mejor de 3 (${scoreText})`,
                value: roundLines,
                inline: false
            },
            {
                name: 'Resultado',
                value: isPlayerWinner
                    ? `🎉 **Ganaste +${betAmount} gominolas**!`
                    : `💔 **Perdiste -${betAmount} gominolas**...`,
                inline: false
            }
        )
        .setFooter({ text: isPlayerWinner ? 'el bot se rinde ante vos' : 'la próxima sale, confianza' })
        .setTimestamp()

    if (!isPlayerWinner) {
        if (polymorphiaApplied) {
            resultEmbed.setDescription(
                `**${botUser}** te tiró la Polymorphia encima!\n\n` +
                `*${playerArt} transformaron en un campeón de League of Legends... F*`
            )
        } else {
            const failReason = polymorphiaFailureReason
                ? `*${polymorphiaFailureReason}.*`
                : '*se bugeó la magia y no te pudieron cambiar el nombre*'
            resultEmbed.setDescription(
                `**${botUser}** ganó ${scoreText}!\n\n` +
                `${failReason}\n\n` +
                `las gominolas igual te las cobraron`
            )
        }
    } else {
        resultEmbed.setDescription(
            `**${playerUser}** demostró ser más fuert${g(playerGender, { m: 'e', f: 'e' })} que el bot!\n\n` +
            `la magia rebota y el bot se salva — tu nombre está a salvo`
        )
    }

    await interaction.editReply({ embeds: [resultEmbed] })
}

/**
 * Check if a Discord member has the veteran role.
 * @param {import('discord.js').Guild} guild
 * @param {string} discordId
 * @returns {Promise<number>} 2 if veteran, 0 otherwise
 */
async function checkVeteranRole(guild, discordId) {
    try {
        const member = await guild.members.fetch(discordId)
        if (member.roles.cache.some(role => role.name === VETERAN_ROLE_NAME)) {
            return 2
        }
    } catch {
        // Member not found or not in guild, no bonus
    }
    return 0
}

function makeDuelKey(id1, id2) {
    return `${id1}_${id2}`
}

module.exports = {
    handleDuel,
    handleDuelButton,
    handleDefenseButton,
    checkVeteranRole,
    activeDuelRequests
}