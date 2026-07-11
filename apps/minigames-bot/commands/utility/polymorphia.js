const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { generatePolymorphiaNickname } = require('#services/deepseek')
const { prisma, getOrCreateUser } = require('#services/database')

// Duration a polymorphia form lasts before auto-revert (24 hours)
const POLYMORPHIA_DURATION_MS = 24 * 60 * 60 * 1000

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

    async execute(interaction, client) {
        const target = interaction.options.getUser('target')

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
                    'No pude encontrar a ese usuario en este servidor. Todavia esta aqui?'
                )
                return
            }

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                await interaction.editReply(
                    'Necesito el permiso **Gestionar Apodos** para lanzar Polymorphia! ' +
                    'Pidele a un admin que lo active.'
                )
                return
            }

            const botMember = interaction.guild.members.me
            if (botMember.roles.highest.comparePositionTo(member.roles.highest) < 0) {
                await interaction.editReply(
                    `${target}, tu aura es demasiado poderosa! No puedo polimorfarte ` +
                    'porque tu rol mas alto esta por encima del mio.'
                )
                return
            }

            const displayName = member.nickname || member.user.displayName || member.user.username
            const polymorphNickname = await generatePolymorphiaNickname(displayName)

            // Persist the original display name before changing
            const originalNickname = member.nickname || null

            await member.setNickname(polymorphNickname)

            // Persist polymorphia state in the database
            try {
                const dbUser = await getOrCreateUser(
                    target.id,
                    interaction.guildId,
                    target.username
                )

                const now = new Date()
                const endsAt = new Date(now.getTime() + POLYMORPHIA_DURATION_MS)

                await prisma.polymorphiaState.upsert({
                    where: { userId: dbUser.id },
                    update: {
                        guildId: interaction.guildId,
                        isActive: true,
                        currentForm: polymorphNickname,
                        previousNickname: originalNickname ?? '',
                        startedAt: now,
                        endsAt
                    },
                    create: {
                        userId: dbUser.id,
                        guildId: interaction.guildId,
                        isActive: true,
                        currentForm: polymorphNickname,
                        previousNickname: originalNickname ?? '',
                        startedAt: now,
                        endsAt
                    }
                })

                console.log(
                    `[polymorphia] State persisted for ${target.id} ` +
                    `until ${endsAt.toISOString()}`
                )
            } catch (dbError) {
                console.error('[polymorphia] Failed to persist state:', dbError.message)
                // Non-critical: nickname was already changed, sweeper just wont auto-revert
            }

            await interaction.editReply(
                `**Polymorphia** ha sido lanzada!\n\n` +
                `${interaction.user} desafio a ${target} y gano!\n\n` +
                `${target} ha sido transformado en **"${polymorphNickname}"**\n\n` +
                `*Que esta nueva forma traiga gloria a la Grieta!*\n\n` +
                `_La transformacion se revertira automaticamente en 24 horas._`
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
