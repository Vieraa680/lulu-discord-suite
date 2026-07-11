const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js')

const MIN_REWARD = 5
const MAX_REWARD = 15
const BUTTERFLY_LIFETIME_MS = 30_000
const MIN_MESSAGES = 2
const MAX_MESSAGES = 5

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeButtonId(channelId) {
    return `butterfly_catch:${channelId}`
}

function buildButterflyMessage() {
    const reward = randomInt(MIN_REWARD, MAX_REWARD)

    const embed = new EmbedBuilder()
        .setTitle('Mariposa Morada Avistada!')
        .setDescription(
            'Una mariposa morada aparecio volando!\n\n' +
            'Rapido, atrapala antes de que **Pix** se la coma!\n\n' +
            `La primera persona que la atrape ganara **${reward} Gominolas Moradas**`
        )
        .setColor(0xA020F0)
        .setFooter({
            text: 'Presiona el boton o escribe /catch para atraparla — tienes 2 minutos!'
        })
        .setTimestamp()

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('PLACEHOLDER')
            .setLabel('Atrapar!')
            .setStyle(ButtonStyle.Primary)
    )

    return { embed, row, reward }
}

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        if (message.author.bot) return
        if (!message.guild) return

        if (!client._butterflyCounters) client._butterflyCounters = new Map()
        if (!client._activeButterflies) client._activeButterflies = new Map()

        const guildId = message.guild.id

        if (!client._butterflyCounters.has(guildId)) {
            client._butterflyCounters.set(guildId, {
                count: 0,
                threshold: randomInt(MIN_MESSAGES, MAX_MESSAGES)
            })
        }

        const counter = client._butterflyCounters.get(guildId)
        counter.count++

        if (counter.count < counter.threshold) return

        counter.count = 0
        counter.threshold = randomInt(MIN_MESSAGES, MAX_MESSAGES)

        if (client._activeButterflies.has(message.channel.id)) return

        const { embed, row, reward } = buildButterflyMessage()

        const customId = makeButtonId(message.channel.id)
        row.components[0].setCustomId(customId)

        try {
            const sent = await message.channel.send({ embeds: [embed], components: [row] })

            const butterfly = {
                messageId: sent.id,
                channelId: message.channel.id,
                guildId,
                reward,
                customId,
                caught: false,
                timestamp: Date.now()
            }
            client._activeButterflies.set(message.channel.id, butterfly)

            setTimeout(async () => {
                const active = client._activeButterflies.get(message.channel.id)
                if (!active || active.caught) return

                client._activeButterflies.delete(message.channel.id)

                try {
                    const msg = await message.channel.messages.fetch(active.messageId)

                    const escapedEmbed = new EmbedBuilder()
                        .setTitle('La Mariposa Volo...')
                        .setDescription(
                            'Demasiado lento! **Pix** tuvo hambre y se comio la mariposa ' +
                            'antes de que alguien pudiera mover un dedo.'
                        )
                        .setColor(0xA020F0)
                        .setFooter({ text: 'La proxima vez sera mas rapida...' })
                        .setTimestamp()

                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(active.customId)
                            .setLabel('Atrapar!')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    )

                    await msg.edit({ embeds: [escapedEmbed], components: [disabledRow] })
                } catch {
                    // message may have been deleted
                }
            }, BUTTERFLY_LIFETIME_MS)
        } catch (error) {
            console.error('[butterflySpawner] Failed to send butterfly message:', error.message)
        }
    }
}
