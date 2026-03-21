import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { getGuildConfig } from "../config.js";
import { assignOnLeaveRole, removeInactiveRoles } from "../roles.js";
import { createAndApproveLoa, getActiveLeaveForUser } from "../leaveRequests.js";

export const data = new SlashCommandBuilder()
  .setName("loa")
  .setDescription("Put yourself on Leave of Absence — assigns the On Leave role immediately")
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason for your absence").setRequired(true).setMaxLength(500)
  )
  .addIntegerOption((opt) =>
    opt.setName("days").setDescription("How many days will you be away?").setRequired(true).setMinValue(1).setMaxValue(365)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const reason = interaction.options.getString("reason", true);
  const days = interaction.options.getInteger("days", true);
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  const config = await getGuildConfig(guildId);
  if (!config.onLeaveRoleId) {
    await interaction.reply({
      content: "❌ The On Leave role has not been configured yet. Please ask an admin to run `/setup leave-role`.",
      ephemeral: true,
    });
    return;
  }

  const activeLease = await getActiveLeaveForUser(guildId, userId);
  if (activeLease) {
    const endDate = activeLease.endDate!;
    await interaction.reply({
      content: `⚠️ You are already on leave until <t:${Math.floor(endDate.getTime() / 1000)}:D>. Use \`/leaverequest cancel\` to cancel your current leave first.`,
      ephemeral: true,
    });
    return;
  }

  const member = interaction.guild.members.cache.get(userId)
    ?? await interaction.guild.members.fetch(userId).catch(() => null);

  if (!member) {
    await interaction.reply({ content: "❌ Could not find your member info.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const request = await createAndApproveLoa(guildId, userId, reason, days);

  await removeInactiveRoles(member);
  await assignOnLeaveRole(member);

  const returnsTs = Math.floor((Date.now() + days * 86400000) / 1000);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🏖️ You Are Now On Leave")
    .setDescription(`You have been assigned the On Leave role and are now **exempt from inactivity tracking** for ${days} day(s). You will not be able to see giveaway channels while on leave.`)
    .addFields(
      { name: "Reason", value: reason },
      { name: "Duration", value: `${days} day(s)` },
      { name: "Returns", value: `<t:${returnsTs}:D>`, inline: true },
      { name: "Request ID", value: `#${request.id}`, inline: true }
    )
    .setFooter({ text: "Staff can end your leave early using /review revoke." })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  if (config.staffChannelId) {
    const staffChannel = interaction.client.channels.cache.get(config.staffChannelId) as TextChannel | undefined;
    if (staffChannel) {
      await staffChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("🏖️ Member Self-Assigned LOA")
            .setDescription(`<@${userId}> has put themselves on Leave of Absence via \`/loa\`.`)
            .addFields(
              { name: "Reason", value: reason },
              { name: "Duration", value: `${days} day(s)` },
              { name: "Returns", value: `<t:${returnsTs}:D>` },
              { name: "Request ID", value: `#${request.id}` }
            )
            .setFooter({ text: "Use /review revoke <id> to end their leave early." })
            .setTimestamp()
        ]
      });
    }
  }
}
