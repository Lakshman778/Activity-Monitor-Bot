import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getGuildConfig } from "../config.js";
import { getActiveLeaveForUser } from "../leaveRequests.js";

export const data = new SlashCommandBuilder()
  .setName("checkwinner")
  .setDescription("Check if a giveaway winner is eligible (not inactive or on leave)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The giveaway winner to check").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const target = interaction.options.getUser("user", true);
  const guildId = interaction.guildId;

  const member = interaction.guild.members.cache.get(target.id)
    ?? await interaction.guild.members.fetch(target.id).catch(() => null);

  if (!member) {
    await interaction.reply({ content: `❌ Could not find <@${target.id}> in this server.`, ephemeral: true });
    return;
  }

  const config = await getGuildConfig(guildId);

  const hasInactiveRole = config.inactiveRoleId
    ? member.roles.cache.has(config.inactiveRoleId)
    : false;

  const hasLeaveRole = config.onLeaveRoleId
    ? member.roles.cache.has(config.onLeaveRoleId)
    : false;

  const activeLease = await getActiveLeaveForUser(guildId, target.id);

  const isIneligible = hasInactiveRole || hasLeaveRole || !!activeLease;

  if (isIneligible) {
    const reasons: string[] = [];
    if (hasInactiveRole) reasons.push("🔴 Has the **Inactive** role");
    if (hasLeaveRole) reasons.push("🟡 Has the **On Leave** role");
    if (activeLease) {
      const endTs = activeLease.endDate
        ? `<t:${Math.floor(activeLease.endDate.getTime() / 1000)}:D>`
        : "unknown date";
      reasons.push(`🟡 On approved leave until ${endTs} — *${activeLease.reason}*`);
    }

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("🔄 REROLL — Winner Is Ineligible")
      .setDescription(`<@${target.id}> cannot receive this giveaway prize.\n\n**Reasons:**\n${reasons.join("\n")}`)
      .setFooter({ text: "Please reroll the giveaway for a new winner." })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("✅ Winner Is Eligible")
      .setDescription(`<@${target.id}> is active and eligible to receive the giveaway prize.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}
