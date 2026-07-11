const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { generatePolymorphiaNickname } = require('../../src/services/deepseek')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('polymorphia')
        .setDescription('League of Legends themed minigame — Polymorphia.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to challenge to a Polymorphia duel')
                .setRequired(true)
        ),

    /**
     * Executes the Polymorphia minigame slash command.
     *
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
        const target = interaction.options.getUser('target')

        // ── Validation ──────────────────────────────────────────────
        if (target.id === interaction.user.id) {
            await interaction.reply({
                content: 'You cannot challenge yourself to Polymorphia! Pick another summoner.',
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

        await interaction.deferReply()

        try {
            const member = interaction.options.getMember('target')

            if (!member) {
                await interaction.editReply(
                    'Could not find that user in this server. Are they still here? 🤔'
                )
                return
            }

            // Check if bot has permission to manage nicknames
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                await interaction.editReply(
                    'I need the **Manage Nicknames** permission to cast Polymorphia! ' +
                    'Please ask an admin to grant it.'
                )
                return
            }

            // Check role hierarchy (Discord blocks nickname changes when target's highest role is above the bot's)
            const botMember = interaction.guild.members.me
            if (botMember.roles.highest.comparePositionTo(member.roles.highest) < 0) {
                await interaction.editReply(
                    `${target}, your aura is too powerful! I cannot polymorph you ` +
                    'because your highest role is above mine. 👑'
                )
                return
            }

            const displayName = member.nickname || member.user.displayName || member.user.username
            const polymorphNickname = await generatePolymorphiaNickname(displayName)

            await member.setNickname(polymorphNickname)

            await interaction.editReply(
                `**Polymorphia** has been cast!\n\n` +
                `${interaction.user} challenged ${target} and won!\n\n` +
                `${target} has been transformed into **"${polymorphNickname}"**\n\n` +
                `*May this new form bring glory to the Rift!*`
            )
        } catch (error) {
            console.error('[polymorphia] Error during execution:', error)

            const errorMessage =
                error.message?.includes('DeepSeek')
                    ? 'The magical realm is unstable right now. DeepSeek could not be reached. Try again later!'
                    : 'Something went wrong while casting Polymorphia. Try again later!'

            // Use editReply since we already deferred
            await interaction.editReply(errorMessage)
        }
    }
}