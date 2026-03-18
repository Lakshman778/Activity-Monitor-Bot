import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getAllGuildActivity } from "../activity.js";
import { getActiveLeaveForUser } from "../leaveRequests.js";

export const data = new SlashCommandBuilder()
  .setName("inactive")
  .setDescription("View inactive members (staff only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List all members who are inactive or flagged")
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const activities = await getAllGuildActivity(guildId);
  const now = new Date();

  const inactiveUsers: { userId: string; daysSince: number; onLeave: boolean; warned: boolean; alerted: boolean }[] = [];

  for (const activity of activities) {
    const daysSince = (now.getTime() - activity.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 1) continue;

    const activeLease = await getActiveLeaveForUser(guildId, activity.userId);

    inactiveUsers.push({
      userId: activity.userId,
      daysSince: Math.floor(daysSince),
      onLeave: !!activeLease,
      warned: !!activity.warningSentAt,
      alerted: !!activity.staffAlertSentAt,
    });
  }

  inactiveUsers.sort((a, b) => b.daysSince - a.daysSince);

  if (inactiveUsers.length === 0) {
    await interaction.editReply({ content: "✅ No inactive members tracked yet." });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`🔍 Inactive Members (${inactiveUsers.length})`)
    .setTimestamp();

  const lines = inactiveUsers.slice(0, 20).map((u) => {
    const tags: string[] = [];
    if (u.onLeave) tags.push("🏖️ On Leave");
    if (u.alerted) tags.push("🚨 Staff Alerted");
    else if (u.warned) tags.push("⚠️ Warned");
    const tagStr = tags.length > 0 ? ` — ${tags.join(", ")}` : "";
    return `<@${u.userId}> — **${u.daysSince}d inactive**${tagStr}`;
  });

  embed.setDescription(lines.join("\n"));

  if (inactiveUsers.length > 20) {
    embed.setFooter({ text: `Showing 20 of ${inactiveUsers.length} members.` });
  }

  await interaction.editReply({ embeds: [embed] });
}
