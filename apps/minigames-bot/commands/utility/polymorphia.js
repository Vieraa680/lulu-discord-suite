const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { generatePolymorphiaNickname } = require('../../src/services/deepseek')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('polymorphia')
        .setDescription('League of Legends themed minigame — Polymorphia.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('El usuario a desafiar a un duelo de Polymorphia')
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
                content: 'No puedes desafiarte a ti mismo a Polymorphia! Elige otro invocador.',
                ephemeral: true
            })
            return
        }

        if (target.bot) {
            await interaction.reply({
                content: 'Los bots no pueden participar en Polymorphia. Desafia a un invocador de verdad!',
                ephemeral: true
            })
            return
        }

        await interaction.deferReply()

        try {
            const resolvedMembers = interaction.options.resolved?.members
            const member = resolvedMembers?.get(target.id)

            if (!member) {
                await interaction.editReply(
                    'No pude encontrar a ese usuario en este servidor. Todavia esta aqui? 🤔'
                )
                return
            }

            // Check if bot has permission to manage nicknames
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                await interaction.editReply(
                    'Necesito el permiso **Gestionar Apodos** para lanzar Polymorphia! ' +
                    'Pidele a un admin que lo active.'
                )
                return
            }

            // Check role hierarchy (Discord blocks nickname changes when target's highest role is above the bot's)
            const botMember = interaction.guild.members.me
            if (botMember.roles.highest.comparePositionTo(member.roles.highest) < 0) {
                await interaction.editReply(
                    `${target}, tu aura es demasiado poderosa! No puedo polimorfarte ` +
                    'porque tu rol mas alto esta por encima del mio. 👑'
                )
                return
            }

            const displayName = member.nickname || member.user.displayName || member.user.username
            const polymorphNickname = await generatePolymorphiaNickname(displayName)

            await member.setNickname(polymorphNickname)

            await interaction.editReply(
                `**Polymorphia** ha sido lanzada!\n\n` +
                `${interaction.user} desafio a ${target} y gano!\n\n` +
                `${target} ha sido transformado en **"${polymorphNickname}"**\n\n` +
                `*Que esta nueva forma traiga gloria a la Grieta!*`
            )
        } catch (error) {
            console.error('[polymorphia] Error durante la ejecucion:', error)

            const errorMessage =
                error.message?.includes('DeepSeek')
                    ? 'El reino magico esta inestable. No se pudo contactar a DeepSeek. Intenta de nuevo mas tarde!'
                    : 'Algo salio mal al lanzar Polymorphia. Intenta de nuevo mas tarde!'

            await interaction.editReply(errorMessage)
        }
    }
}