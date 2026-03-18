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
} from "../leaveRequests.js";
import { getGuildConfig } from "../config.js";
import { assignOnLeaveRole } from "../roles.js";

export const data = new SlashCommandBuilder()
  .setName("leaverequest")
  .setDescription("Submit an inactivity leave request")
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
    .setDescription(`Your leave request has been submitted and is pending staff review.`)
    .addFields(
      { name: "Reason", value: reason },
      { name: "Duration", value: `${days} day(s)` },
      { name: "Request ID", value: `#${request.id}` },
      { name: "Status", value: "⏳ Pending" }
    )
    .setFooter({ text: "You will continue to be tracked until your request is approved." })
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
}
