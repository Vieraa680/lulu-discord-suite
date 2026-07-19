const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const adminService = require('#services/admin')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Administrative commands for minigames')
    .addSubcommand(sub => sub.setName('user').setDescription('View user details').addUserOption(o => o.setName('target').setDescription('User to inspect').setRequired(true)))
    .addSubcommand(sub => sub.setName('adjust-balance').setDescription('Adjust user candies balance').addUserOption(o => o.setName('target').setDescription('Target user').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Positive to credit, negative to debit').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason for adjustment').setRequired(true)))
    .addSubcommand(sub => sub.setName('transactions').setDescription('List recent transactions for a user').addUserOption(o => o.setName('target').setDescription('Target user').setRequired(true)).addIntegerOption(o => o.setName('limit').setDescription('How many').setRequired(false)))
    .addSubcommand(sub => sub.setName('reset-cooldown').setDescription('Reset polymorphia cooldowns for a user').addUserOption(o => o.setName('target').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub => sub.setName('force-unpolymorphia').setDescription('Force remove active polymorphia for a user').addUserOption(o => o.setName('target').setDescription('Target user').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand()

    const ok = await adminService.isAdmin(interaction)
    if (!ok) {
      await interaction.reply({ content: 'No estás autorizado para usar estos comandos.', ephemeral: true })
      return
    }

    try {
      switch (sub) {
        case 'user': {
          const target = interaction.options.getUser('target')
          await interaction.deferReply({ ephemeral: true })
          const u = await adminService.viewUser(target.id, interaction.guild.id)
          if (!u) {
            await interaction.editReply('Usuario no encontrado')
            return
          }
          const lines = []
          lines.push(`Usuario: ${u.username} (${u.discordId})`)
          lines.push(`Candies: ${u.candies} — TotalEarned: ${u.totalEarned} — TotalSpent: ${u.totalSpent}`)
          lines.push(`Polymorphia Wins/Losses/Saved: ${u.polymorphiaWins}/${u.polymorphiaLosses}/${u.polymorphiaSaved}`)
          if (u.state && u.state.isActive) lines.push(`Active form: ${u.state.currentForm} until ${u.state.endsAt}`)
          await interaction.editReply(lines.join('\n'))
          break
        }

        case 'adjust-balance': {
          const target = interaction.options.getUser('target')
          const amount = interaction.options.getInteger('amount')
          const reason = interaction.options.getString('reason')
          await interaction.deferReply({ ephemeral: true })
          const res = await adminService.adjustBalance(target.id, interaction.guild.id, amount, reason, interaction.user.tag)
          if (!res.success) await interaction.editReply(`Error: ${res.error}`)
          else await interaction.editReply(`Balance actualizado. Nuevo saldo: ${res.user.candies}`)
          break
        }

        case 'transactions': {
          const target = interaction.options.getUser('target')
          const limit = interaction.options.getInteger('limit') || 20
          await interaction.deferReply({ ephemeral: true })
          const txs = await adminService.listTransactions(target.id, interaction.guild.id, limit)
          if (!txs || txs.length === 0) {
            await interaction.editReply('No transactions found')
            return
          }
          const lines = txs.map(t => `${t.createdAt.toISOString()} • ${t.type} • ${t.amount} • ${t.description}`)
          await interaction.editReply(lines.join('\n'))
          break
        }

        case 'reset-cooldown': {
          const target = interaction.options.getUser('target')
          await interaction.deferReply({ ephemeral: true })
          const res = await adminService.resetCooldown(target.id, interaction.guild.id)
          if (!res.success) await interaction.editReply(`Error: ${res.error}`)
          else await interaction.editReply(`Cooldowns reset for ${target.tag}`)
          break
        }

        case 'force-unpolymorphia': {
          const target = interaction.options.getUser('target')
          await interaction.deferReply({ ephemeral: true })
          const res = await adminService.forceUnpolymorphia(target.id, interaction.guild.id)
          if (!res.success) await interaction.editReply(`Error: ${res.error}`)
          else await interaction.editReply(`Removed polymorphia for ${target.tag}`)
          break
        }

        default:
          await interaction.reply({ content: 'Subcomando no reconocido', ephemeral: true })
      }
    } catch (err) {
      const logger = require('#utils/logger').child({ service: 'admin' })
      logger.error({ err }, 'Admin command failed')
      try {
        await interaction.editReply({ content: 'Error ejecutando comando admin' })
      } catch {
        await interaction.reply({ content: 'Error ejecutando comando admin', ephemeral: true })
      }
    }
  }
}