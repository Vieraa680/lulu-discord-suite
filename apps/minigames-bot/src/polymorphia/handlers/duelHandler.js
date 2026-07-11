const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js')
const { findUserByDiscord } = require('#services/database')
const { resolveDuel, getDefenseItemConfig, getRandomDuration } = require('../DuelEngine')
const { canInitiateDuel, canBeTargeted } = require('../CooldownManager')
const { executeRewardFlow, DUEL_BET } = require('../RewardManager')
const { getOwnedDefenseItems, consumeItem } = require('../ItemDefense')
const { getOrCreateUser } = require('#services/database')
const { progressBar, relativeTimestamp } = require('../utils')

// Active duels map: `challengerId_targetId` -> duel session data
const activeDuelRequests = new Map()

const CHALLENGE_TIMEOUT_MS = 60_000  // 60s to accept/reject
const DEFENSE_TIMEOUT_MS = 20_000    // 20s to pick defense
const VETERAN_ROLE_NAME = process.env.VETERAN_ROLE_NAME || 'Invocador Veterano'

async function handleDuel(interaction, client) {
    const target = interaction.options.getUser('target')

    // ── Basic validation ──
    if (target.id === interaction.user.id) {
        await interaction.reply({
            content: 'You cannot challenge yourself to Polymorphia! Choose another summoner.',
            ephemeral: true
        })
        return
    }

    if (target.bot) {
        await interaction.reply({
            content: 'Bots cannot participate in Polymorphia. Challenge a real summoner!',
            ephemeral: true
        })
        return
    }

    const guildId = interaction.guild.id
    const challengerId = interaction.user.id
    const targetId = target.id

    // Check for existing active duel
    const duelKey = makeDuelKey(challengerId, targetId)
    const reverseKey = makeDuelKey(targetId, challengerId)
    if (activeDuelRequests.has(duelKey) || activeDuelRequests.has(reverseKey)) {
        await interaction.reply({
            content: 'There is already an active duel between you and this user! Please wait for it to resolve.',
            ephemeral: true
        })
        return
    }

    await interaction.deferReply()

    // ── Role hierarchy check ──
    const resolvedMembers = interaction.options.resolved?.members
    const member = resolvedMembers?.get(target.id)

    if (!member) {
        await interaction.editReply('Could not find that user in this server.')
        return
    }

    const botMember = interaction.guild.members.me
    if (botMember.roles.highest.comparePositionTo(member.roles.highest) < 0) {
        await interaction.editReply(
            `${target}, your aura is too powerful! I cannot polymorph you ` +
            'because your highest role is above mine.'
        )
        return
    }

    // ── Get or create user DB records ──
    const challengerName = interaction.member.nickname || interaction.user.displayName || interaction.user.username
    const targetName = member.nickname || target.displayName || target.username

    const [challengerDb, targetDb] = await Promise.all([
        getOrCreateUser(challengerId, guildId, challengerName),
        getOrCreateUser(targetId, guildId, targetName)
    ])

    // ── Cooldown check (challenger) ──
    const cooldownCheck = await canInitiateDuel(challengerId, guildId)
    if (!cooldownCheck.allowed) {
        const msg = cooldownCheck.reason === 'cooldown'
            ? `You must wait **${cooldownCheck.remainingMinutes} more minute(s)** before starting another Polymorphia duel!`
            : 'You have reached the daily limit of Polymorphia duels! Try again tomorrow.'
        await interaction.editReply(msg)
        return
    }

    // ── Protection check (target) ──
    const protectionCheck = await canBeTargeted(targetId, guildId)
    if (!protectionCheck.allowed) {
        const msg = protectionCheck.reason === 'protection'
            ? `${target} is under a protection spell! They can be challenged again <t:${Math.floor(protectionCheck.until.getTime() / 1000)}:R>.`
            : `${target} is already polymorphed! Wait until the effect expires <t:${Math.floor(protectionCheck.until.getTime() / 1000)}:R>.`
        await interaction.editReply(msg)
        return
    }

    // ── Candy check (both must have >= DUEL_BET) ──
    if (challengerDb.candies < DUEL_BET) {
        await interaction.editReply(
            `You need at least **${DUEL_BET} 🍬 candies** to start a Polymorphia duel! You have ${challengerDb.candies}.`
        )
        return
    }
    if (targetDb.candies < DUEL_BET) {
        await interaction.editReply(
            `${target} needs at least **${DUEL_BET} 🍬 candies** to accept a duel. They only have ${targetDb.candies}.`
        )
        return
    }

    // ── Fetch veteran role status ──
    const [challengerVetBonus, targetVetBonus] = await Promise.all([
        checkVeteranRole(interaction.guild, challengerId),
        checkVeteranRole(interaction.guild, targetId)
    ])
    const challengerVetBadge = challengerVetBonus > 0 ? ' 🎖️' : ''
    const targetVetBadge = targetVetBonus > 0 ? ' 🎖️' : ''

    // ── Send challenge embed ──
    const challengeEmbed = new EmbedBuilder()
        .setTitle('⚔️ Polymorphia Duel Challenge!')
        .setDescription(
            `${interaction.user} has challenged ${target} to a Polymorphia duel!\n\n` +
            `**Bet:** ${DUEL_BET} 🍬 candies each\n` +
            `**Winner takes:** **${DUEL_BET + 25} 🍬** (net +25)\n` +
            `**Loser gets back:** **25 🍬** (net -25)\n\n` +
            `*The loser will be polymorphed into a League of Legends champion!*`
        )
        .addFields(
            {
                name: `📊 Challenger Stats${challengerVetBadge}`,
                value: `Wins: **${challengerDb.polymorphiaWins}** | Losses: **${challengerDb.polymorphiaLosses}** | 🍬 **${challengerDb.candies}**`,
                inline: true
            },
            {
                name: `📊 Target Stats${targetVetBadge}`,
                value: `Wins: **${targetDb.polymorphiaWins}** | Losses: **${targetDb.polymorphiaLosses}** | 🍬 **${targetDb.candies}**`,
                inline: true
            }
        )
        .setColor(0x9B59B6)
        .setFooter({ text: `${target.username} has 60 seconds to accept or reject.` })
        .setTimestamp()

    const acceptBtn = new ButtonBuilder()
        .setCustomId(`polymorphia_accept:${challengerId}:${targetId}`)
        .setLabel('⚔️ Accept Duel')
        .setStyle(ButtonStyle.Success)

    const rejectBtn = new ButtonBuilder()
        .setCustomId(`polymorphia_reject:${challengerId}:${targetId}`)
        .setLabel('❌ Reject')
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
                .setTitle('⏰ Challenge Expired')
                .setDescription(`${target} did not respond in time. The Polymorphia challenge has expired.`)
                .setColor(0x95A5A6)
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
            content: 'This duel request has expired or is no longer valid.',
            ephemeral: true
        })
        return
    }

    if (interaction.user.id !== targetId) {
        await interaction.reply({
            content: 'Only the challenged user can respond to this duel.',
            ephemeral: true
        })
        return
    }

    if (session.status !== 'pending') {
        await interaction.reply({
            content: 'This duel has already been resolved.',
            ephemeral: true
        })
        return
    }

    if (action === 'polymorphia_reject') {
        session.status = 'rejected'
        activeDuelRequests.delete(duelKey)

        const rejectedEmbed = new EmbedBuilder()
            .setTitle('❌ Duel Rejected')
            .setDescription(`${interaction.user} has rejected the Polymorphia challenge. No candies were lost.`)
            .setColor(0xE74C3C)
            .setTimestamp()

        await interaction.update({ embeds: [rejectedEmbed], components: [] })
        return
    }

    if (action === 'polymorphia_accept') {
        session.status = 'accepted'
        // Show defense selection
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
        .setTitle('🛡️ Choose Your Defense')
        .setDescription(
            `${interaction.user}, the Polymorphia duel has been accepted!\n\n` +
            'Choose your defense strategy. You have **20 seconds**.'
        )
        .setColor(0x3498DB)
        .setTimestamp()

    const row = new ActionRowBuilder()
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`polymorphia_defense:none:${challengerId}:${targetId}`)
            .setLabel('⚔️ No Defense (flat roll)')
            .setStyle(ButtonStyle.Secondary)
    )

    // Add owned defense items as buttons
    // ItemDefense returns items the user actually owns
    for (const item of ownedItems) {
        if (row.components.length >= 5) break
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`polymorphia_defense:${item.name}:${challengerId}:${targetId}`)
                .setLabel(`🛡️ ${item.name}`)
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
            content: 'This defense selection is no longer valid.',
            ephemeral: true
        })
        return
    }

    if (interaction.user.id !== targetId) {
        await interaction.reply({
            content: 'Only the defender can choose a defense.',
            ephemeral: true
        })
        return
    }

    session.defenseItem = defenseName
    await resolveAndComplete(interaction, session)
}

/**
 * Resolve the duel and execute the reward flow.
 */
async function resolveAndComplete(interaction, session) {
    const { challengerId, targetId, challengerDb, targetDb, guildId, defenseItem } = session
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

    // Resolve duel
    const duelResult = resolveDuel(
        attackerStats,
        defenderStats,
        defenseItem
    )

    // Execute reward flow
    const summary = await executeRewardFlow(
        interaction,
        duelResult,
        freshAttacker || challengerDb,
        freshDefender || targetDb,
        guildId
    )

    // Consume defense item if used
    if (defenseItem) {
        const config = getDefenseItemConfig(defenseItem)
        if (config && config.consumed) {
            await consumeItem(targetId, guildId, defenseItem)
        }
    }

    // Build result embed
    const resultEmbed = new EmbedBuilder()
        .setTitle(summary.isAttackerWinner ? '🏆 Polymorphia — Attacker Wins!' : '🛡️ Polymorphia — Defender Prevails!')
        .setColor(summary.isAttackerWinner ? 0x9B59B6 : 0x2ECC71)
        .addFields(
            {
                name: '🎲 Rolls',
                value: [
                    `**Attacker:** \`${duelResult.attackerRoll}\` (d20 + ${duelResult.attackerModifier})`,
                    `${progressBar(duelResult.attackerRoll, 20 + duelResult.attackerModifier, 8)}`,
                    `**Defender:** \`${duelResult.defenderRoll}\` (d20 + ${duelResult.defenderModifier})`,
                    `${progressBar(duelResult.defenderRoll, 20 + duelResult.defenderModifier, 8)}`
                ].join('\n'),
                inline: false
            },
            {
                name: '🍬 Rewards',
                value: [
                    `**Winner:** **+${DUEL_BET + 25} 🍬** (net +25)`,
                    `**Loser:** **+25 🍬** refund (net -25)`
                ].join('\n'),
                inline: false
            }
        )
        .setTimestamp()

    if (summary.isAttackerWinner) {
        if (summary.blockedByShield) {
            resultEmbed.setDescription(
                `**${interaction.user}** won the Polymorphia duel!\n\n` +
                `🛡️ But **${interaction.client.users.cache.get(targetId)}'s Escudo de Banshee** ` +
                '**blocked** the nickname change! The shield shatters but the name stays safe.\n\n' +
                `*The attacker still takes the gominolas, but the defender keeps their identity.*`
            )
        } else if (summary.polymorphiaApplied) {
            resultEmbed.setDescription(
                `**${interaction.user}** won the Polymorphia duel!\n\n` +
                `✨ Polymorphia cast on **${interaction.client.users.cache.get(targetId)}**!\n\n` +
                `*The loser has been transformed into a League of Legends champion.*`
            )
        } else {
            resultEmbed.setDescription(
                `**${interaction.user}** won the Polymorphia duel!\n\n` +
                `🌪️ The nickname change failed due to a magical disturbance. ` +
                `The gominolas are still awarded.`
            )
        }
    } else {
        resultEmbed.setDescription(
            `**${interaction.client.users.cache.get(targetId)}** resisted the Polymorphia!\n\n` +
            `🛡️ The magic rebounds! No one was transformed.\n\n` +
            `*The defender's gominolas are safe!*`
        )
    }

    await interaction.editReply({ embeds: [resultEmbed], components: [] })
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