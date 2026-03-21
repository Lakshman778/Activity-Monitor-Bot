import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getAllGuildActivity } from "../activity.js";
import { getAllActiveLeaves, getActiveLeaveForUser } from "../leaveRequests.js";
import { getGuildConfig } from "../config.js";

export const data = new SlashCommandBuilder()
  .setName("inactive")
  .setDescription("View inactive members and people on leave (staff only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List all inactive members AND members currently on leave")
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const config = await getGuildConfig(guildId);
  const now = new Date();

  const activities = await getAllGuildActivity(guildId);
  const activeLeaves = await getAllActiveLeaves(guildId);

  const onLeaveUserIds = new Set(activeLeaves.map((l) => l.userId));

  const inactiveRows: { userId: string; minutesSince: number; warned: boolean; alerted: boolean }[] = [];

  for (const activity of activities) {
    if (onLeaveUserIds.has(activity.userId)) continue;
    const minutesSince = (now.getTime() - activity.lastMessageAt.getTime()) / (1000 * 60);
    if (minutesSince < config.inactivityDays) continue;

    inactiveRows.push({
      userId: activity.userId,
      minutesSince: Math.floor(minutesSince),
      warned: !!activity.warningSentAt,
      alerted: !!activity.staffAlertSentAt,
    });
  }

  inactiveRows.sort((a, b) => b.minutesSince - a.minutesSince);

  const hasInactive = inactiveRows.length > 0;
  const hasLeaves = activeLeaves.length > 0;

  if (!hasInactive && !hasLeaves) {
    await interaction.editReply({ content: "✅ No inactive members or active leaves at the moment." });
    return;
  }

  const embeds: EmbedBuilder[] = [];

  if (hasInactive) {
    const inactiveEmbed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(`❌ Inactive Members (${inactiveRows.length})`)
      .setTimestamp();

    const lines = inactiveRows.slice(0, 20).map((u) => {
      const tags: string[] = [];
      if (u.alerted) tags.push("🚨 Staff Alerted");
      else if (u.warned) tags.push("⚠️ Warned");
      const tagStr = tags.length > 0 ? ` — ${tags.join(", ")}` : "";
      return `<@${u.userId}> — **${u.minutesSince}min** inactive${tagStr}`;
    });

    inactiveEmbed.setDescription(lines.join("\n"));

    if (inactiveRows.length > 20) {
      inactiveEmbed.setFooter({ text: `Showing 20 of ${inactiveRows.length} inactive members.` });
    }

    embeds.push(inactiveEmbed);
  }

  if (hasLeaves) {
    const leaveEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🏖️ Members On Leave (${activeLeaves.length})`)
      .setTimestamp();

    const leaveLines = activeLeaves.slice(0, 20).map((l) => {
      const endTs = l.endDate ? `<t:${Math.floor(l.endDate.getTime() / 1000)}:R>` : "Unknown";
      return `<@${l.userId}> — expires ${endTs} — *${l.reason}*`;
    });

    leaveEmbed.setDescription(leaveLines.join("\n"));

    if (activeLeaves.length > 20) {
      leaveEmbed.setFooter({ text: `Showing 20 of ${activeLeaves.length} leave entries.` });
    }

    embeds.push(leaveEmbed);
  }

  await interaction.editReply({ embeds });
}
