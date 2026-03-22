import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getGuildConfig } from "../config.js";

export const data = new SlashCommandBuilder()
  .setName("settings")
  .setDescription("View the current bot configuration for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const config = await getGuildConfig(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚙️ Server Bot Settings")
    .addFields(
      { name: "⏱️ Inactivity Warning After", value: `${config.inactivityDays} minute(s)`, inline: true },
      { name: "🚨 Staff Alert After", value: `${config.kickThresholdDays} minute(s)`, inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "📢 Warning Channel", value: config.warningChannelId ? `<#${config.warningChannelId}>` : "Not set", inline: true },
      { name: "🔒 Staff Channel", value: config.staffChannelId ? `<#${config.staffChannelId}>` : "Not set", inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      { name: "😴 Inactive Role", value: config.inactiveRoleId ? `<@&${config.inactiveRoleId}>` : "Not set", inline: true },
      { name: "🏖️ On Leave Role", value: config.onLeaveRoleId ? `<@&${config.onLeaveRoleId}>` : "Not set", inline: true },
      { name: "\u200b", value: "\u200b", inline: true },
      {
        name: "🎉 Restricted Giveaway Channels",
        value: config.giveawayChannelIds.length > 0
          ? config.giveawayChannelIds.map((id) => `<#${id}>`).join(", ")
          : "None configured",
      }
    )
    .setFooter({ text: "Use /setup to change any of these settings (Admin only)" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
