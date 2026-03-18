import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getUserActivity } from "../activity.js";
import { getActiveLeaveForUser, getUserLeaveRequests } from "../leaveRequests.js";
import { getGuildConfig } from "../config.js";

export const data = new SlashCommandBuilder()
  .setName("mystatus")
  .setDescription("View your inactivity and leave request status");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  const activity = await getUserActivity(guildId, userId);
  const activeLease = await getActiveLeaveForUser(guildId, userId);
  const requests = await getUserLeaveRequests(guildId, userId);
  const config = await getGuildConfig(guildId);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📊 Your Activity Status")
    .setTimestamp();

  if (!activity) {
    embed.setDescription("No activity recorded yet. Start chatting and you'll appear here!");
  } else {
    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - activity.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    let statusLine = "✅ Active";
    if (activeLease) {
      const endDate = activeLease.endDate!;
      statusLine = `🏖️ On Approved Leave (until <t:${Math.floor(endDate.getTime() / 1000)}:D>)`;
    } else if (activity.isInactive) {
      statusLine = "❌ Inactive";
    }

    embed.addFields(
      { name: "Status", value: statusLine },
      { name: "Last Activity", value: `<t:${Math.floor(activity.lastMessageAt.getTime() / 1000)}:R>`, inline: true },
      { name: "Days Since Active", value: `${daysSince} day(s)`, inline: true },
      { name: "Warning Threshold", value: `${config.inactivityDays} day(s)`, inline: true },
    );
  }

  if (requests.length > 0) {
    const recent = requests.slice(-3).reverse();
    const reqLines = recent.map((r) => {
      const emoji = r.status === "approved" ? "✅" : r.status === "rejected" ? "❌" : "⏳";
      return `${emoji} #${r.id} — ${r.durationDays}d — ${r.status}`;
    });
    embed.addFields({ name: "Recent Leave Requests", value: reqLines.join("\n") });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
