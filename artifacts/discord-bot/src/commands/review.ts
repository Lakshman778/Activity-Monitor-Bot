import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import {
  approveLeaveRequest,
  rejectLeaveRequest,
  getPendingRequests,
  getLeaveRequestById,
} from "../leaveRequests.js";
import { getGuildConfig } from "../config.js";
import { assignOnLeaveRole, removeInactiveRoles } from "../roles.js";
import { resetUserActivity } from "../activity.js";

export const data = new SlashCommandBuilder()
  .setName("review")
  .setDescription("Review leave requests (staff only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List all pending leave requests")
  )
  .addSubcommand((sub) =>
    sub
      .setName("approve")
      .setDescription("Approve a leave request")
      .addIntegerOption((opt) =>
        opt.setName("id").setDescription("Leave request ID").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("reject")
      .setDescription("Reject a leave request")
      .addIntegerOption((opt) =>
        opt.setName("id").setDescription("Leave request ID").setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === "list") {
    const pending = await getPendingRequests(guildId);

    if (pending.length === 0) {
      await interaction.reply({ content: "✅ No pending leave requests.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📋 Pending Leave Requests (${pending.length})`)
      .setTimestamp();

    for (const req of pending.slice(0, 10)) {
      embed.addFields({
        name: `#${req.id} — <@${req.userId}>`,
        value: `**Reason:** ${req.reason}\n**Duration:** ${req.durationDays} day(s)\n**Submitted:** <t:${Math.floor(req.createdAt.getTime() / 1000)}:R>`,
      });
    }

    if (pending.length > 10) {
      embed.setFooter({ text: `Showing 10 of ${pending.length} requests.` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } else if (sub === "approve") {
    const id = interaction.options.getInteger("id", true);
    const request = await getLeaveRequestById(id);

    if (!request || request.guildId !== guildId) {
      await interaction.reply({ content: `❌ Leave request #${id} not found.`, ephemeral: true });
      return;
    }

    if (request.status !== "pending") {
      await interaction.reply({ content: `❌ Request #${id} is already **${request.status}**.`, ephemeral: true });
      return;
    }

    await approveLeaveRequest(id, interaction.user.id);

    const member = interaction.guild.members.cache.get(request.userId)
      ?? await interaction.guild.members.fetch(request.userId).catch(() => null);

    if (member) {
      await removeInactiveRoles(member);
      await assignOnLeaveRole(member);
    }

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("✅ Leave Request Approved")
      .addFields(
        { name: "Request ID", value: `#${id}`, inline: true },
        { name: "User", value: `<@${request.userId}>`, inline: true },
        { name: "Duration", value: `${request.durationDays} day(s)`, inline: true },
        { name: "Reason", value: request.reason },
        { name: "Approved by", value: `<@${interaction.user.id}>` }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    try {
      const user = await interaction.client.users.fetch(request.userId);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("✅ Leave Request Approved")
            .setDescription(`Your leave request (#${id}) has been **approved** for ${request.durationDays} day(s).\n\nYou are temporarily exempt from inactivity tracking. You will be automatically tracked again when your leave period ends.`)
            .setTimestamp()
        ]
      });
    } catch {
      // DMs may be closed
    }

  } else if (sub === "reject") {
    const id = interaction.options.getInteger("id", true);
    const request = await getLeaveRequestById(id);

    if (!request || request.guildId !== guildId) {
      await interaction.reply({ content: `❌ Leave request #${id} not found.`, ephemeral: true });
      return;
    }

    if (request.status !== "pending") {
      await interaction.reply({ content: `❌ Request #${id} is already **${request.status}**.`, ephemeral: true });
      return;
    }

    await rejectLeaveRequest(id, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("❌ Leave Request Rejected")
      .addFields(
        { name: "Request ID", value: `#${id}`, inline: true },
        { name: "User", value: `<@${request.userId}>`, inline: true },
        { name: "Reason", value: request.reason },
        { name: "Rejected by", value: `<@${interaction.user.id}>` }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    try {
      const user = await interaction.client.users.fetch(request.userId);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("❌ Leave Request Rejected")
            .setDescription(`Your leave request (#${id}) has been **rejected**. You will continue to be monitored for activity. Please become active in the server.`)
            .setTimestamp()
        ]
      });
    } catch {
      // DMs may be closed
    }
  }
}
