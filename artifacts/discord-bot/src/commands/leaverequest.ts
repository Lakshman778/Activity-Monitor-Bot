import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import {
  createLeaveRequest,
  getUserLeaveRequests,
  getActiveLeaveForUser,
  cancelLeaveRequest,
  getLeaveRequestById,
} from "../leaveRequests.js";
import { getGuildConfig } from "../config.js";
import { removeInactiveRoles } from "../roles.js";

export const data = new SlashCommandBuilder()
  .setName("leaverequest")
  .setDescription("Submit or manage your inactivity leave request")
  .addSubcommand((sub) =>
    sub
      .setName("submit")
      .setDescription("Submit a new leave request")
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason for your absence").setRequired(true).setMaxLength(500)
      )
      .addIntegerOption((opt) =>
        opt.setName("days").setDescription("How many days will you be away?").setRequired(true).setMinValue(1).setMaxValue(365)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("cancel")
      .setDescription("Cancel your own pending leave request")
      .addIntegerOption((opt) =>
        opt.setName("id").setDescription("Leave request ID (shown when you submitted it)").setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  if (sub === "submit") {
    const reason = interaction.options.getString("reason", true);
    const days = interaction.options.getInteger("days", true);

    const activeLease = await getActiveLeaveForUser(guildId, userId);
    if (activeLease) {
      const endDate = activeLease.endDate!;
      await interaction.reply({
        content: `You already have an active approved leave until <t:${Math.floor(endDate.getTime() / 1000)}:D>. You cannot submit another request while one is active.`,
        ephemeral: true,
      });
      return;
    }

    const request = await createLeaveRequest(guildId, userId, reason, days);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📋 Leave Request Submitted")
      .setDescription("Your leave request has been submitted and is pending staff review.")
      .addFields(
        { name: "Reason", value: reason },
        { name: "Duration", value: `${days} day(s)` },
        { name: "Request ID", value: `#${request.id}` },
        { name: "Status", value: "⏳ Pending" }
      )
      .setFooter({ text: "You will continue to be tracked until your request is approved. To cancel: /leaverequest cancel" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    const config = await getGuildConfig(guildId);
    if (config.staffChannelId) {
      const staffChannel = interaction.client.channels.cache.get(config.staffChannelId) as TextChannel | undefined;
      if (staffChannel) {
        const staffEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📋 New Leave Request")
          .setDescription(`<@${userId}> has submitted a leave request.`)
          .addFields(
            { name: "User", value: `<@${userId}>`, inline: true },
            { name: "Request ID", value: `#${request.id}`, inline: true },
            { name: "Duration", value: `${days} day(s)`, inline: true },
            { name: "Reason", value: reason }
          )
          .setFooter({ text: `Use /review approve ${request.id} or /review reject ${request.id}` })
          .setTimestamp();

        await staffChannel.send({ embeds: [staffEmbed] });
      }
    }

  } else if (sub === "cancel") {
    const id = interaction.options.getInteger("id", true);
    const request = await getLeaveRequestById(id);

    if (!request || request.guildId !== guildId || request.userId !== userId) {
      await interaction.reply({ content: `❌ Leave request #${id} not found or it doesn't belong to you.`, ephemeral: true });
      return;
    }

    if (request.status !== "pending") {
      await interaction.reply({
        content: `❌ Request #${id} is **${request.status}** — only pending requests can be cancelled.\n\nIf you have an approved leave you'd like to end early, ask staff to use \`/review revoke\`.`,
        ephemeral: true,
      });
      return;
    }

    await cancelLeaveRequest(id, userId);

    const embed = new EmbedBuilder()
      .setColor(0x6b7280)
      .setTitle("🚫 Leave Request Cancelled")
      .setDescription(`Your leave request **#${id}** has been cancelled. You are still being tracked for activity.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
