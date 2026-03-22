import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { updateGuildConfig, getGuildConfig } from "../config.js";
import { syncGiveawayChannelRestrictions, removeGiveawayChannelRestriction, liftGiveawayRestrictions } from "../roles.js";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure the inactivity bot for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("inactivity-minutes")
      .setDescription("Minutes of inactivity before a warning is sent to the user")
      .addIntegerOption((opt) =>
        opt.setName("minutes").setDescription("Number of minutes").setRequired(true).setMinValue(1).setMaxValue(525600)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("kick-threshold")
      .setDescription("Minutes of inactivity before staff is alerted for possible action")
      .addIntegerOption((opt) =>
        opt.setName("minutes").setDescription("Number of minutes").setRequired(true).setMinValue(1).setMaxValue(525600)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("warning-channel")
      .setDescription("Channel where inactivity warnings are sent to users")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("The channel").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("staff-channel")
      .setDescription("Staff-only channel for extended inactivity alerts")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("The channel").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("inactive-role")
      .setDescription("Role assigned to inactive members")
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("The role").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("leave-role")
      .setDescription("Role assigned to members on approved leave")
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("The role").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("add-giveaway-channel")
      .setDescription("Add a giveaway channel to be restricted for inactive users")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("The giveaway channel").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove-giveaway-channel")
      .setDescription("Remove a giveaway channel restriction")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("The giveaway channel").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("View the current configuration")
  )
  .addSubcommand((sub) =>
    sub
      .setName("giveaway-mode")
      .setDescription("Toggle giveaway mode — lifts leave/inactive restrictions so everyone can join")
      .addStringOption((opt) =>
        opt
          .setName("mode")
          .setDescription("Turn giveaway mode on or off")
          .setRequired(true)
          .addChoices(
            { name: "on — lift restrictions (giveaway starting)", value: "on" },
            { name: "off — restore restrictions (giveaway ended)", value: "off" }
          )
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === "view") {
    const config = await getGuildConfig(guildId);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("⚙️ Bot Configuration")
      .addFields(
        { name: "Inactivity Warning After", value: `${config.inactivityDays} minute(s)`, inline: true },
        { name: "Staff Alert After", value: `${config.kickThresholdDays} minute(s)`, inline: true },
        { name: "Warning Channel", value: config.warningChannelId ? `<#${config.warningChannelId}>` : "Not set", inline: true },
        { name: "Staff Channel", value: config.staffChannelId ? `<#${config.staffChannelId}>` : "Not set", inline: true },
        { name: "Inactive Role", value: config.inactiveRoleId ? `<@&${config.inactiveRoleId}>` : "Not set", inline: true },
        { name: "On Leave Role", value: config.onLeaveRoleId ? `<@&${config.onLeaveRoleId}>` : "Not set", inline: true },
        {
          name: "Giveaway Channels",
          value: config.giveawayChannelIds.length > 0
            ? config.giveawayChannelIds.map((id) => `<#${id}>`).join(", ")
            : "None",
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "inactivity-minutes") {
    const minutes = interaction.options.getInteger("minutes", true);
    await updateGuildConfig(guildId, { inactivityDays: minutes });
    await interaction.reply({ content: `✅ Inactivity warning threshold set to **${minutes}** minute(s).`, ephemeral: true });

  } else if (sub === "kick-threshold") {
    const minutes = interaction.options.getInteger("minutes", true);
    await updateGuildConfig(guildId, { kickThresholdDays: minutes });
    await interaction.reply({ content: `✅ Staff alert threshold set to **${minutes}** minute(s).`, ephemeral: true });

  } else if (sub === "warning-channel") {
    const channel = interaction.options.getChannel("channel", true);
    await updateGuildConfig(guildId, { warningChannelId: channel.id });
    await interaction.reply({ content: `✅ Warning channel set to <#${channel.id}>.`, ephemeral: true });

  } else if (sub === "staff-channel") {
    const channel = interaction.options.getChannel("channel", true);
    await updateGuildConfig(guildId, { staffChannelId: channel.id });
    await interaction.reply({ content: `✅ Staff channel set to <#${channel.id}>.`, ephemeral: true });

  } else if (sub === "inactive-role") {
    const role = interaction.options.getRole("role", true);
    if (role.id === guildId) {
      await interaction.reply({ content: "❌ You cannot use **@everyone** as the Inactive role. Please create a dedicated role (e.g. **Inactive**) and select that.", ephemeral: true });
      return;
    }
    await updateGuildConfig(guildId, { inactiveRoleId: role.id });
    await interaction.reply({ content: `✅ Inactive role set to <@&${role.id}>. Syncing giveaway channel restrictions...`, ephemeral: true });
    if (interaction.guild) {
      const result = await syncGiveawayChannelRestrictions(interaction.guild);
      if (!result.success && result.errors.length > 0) {
        await interaction.followUp({ content: `⚠️ Some channel restrictions could not be applied:\n${result.errors.join("\n")}`, ephemeral: true });
      }
    }

  } else if (sub === "leave-role") {
    const role = interaction.options.getRole("role", true);
    if (role.id === guildId) {
      await interaction.reply({ content: "❌ You cannot use **@everyone** as the On Leave role. Please create a dedicated role (e.g. **On Leave**) and select that.", ephemeral: true });
      return;
    }
    await updateGuildConfig(guildId, { onLeaveRoleId: role.id });
    await interaction.reply({ content: `✅ On Leave role set to <@&${role.id}>. Syncing giveaway channel restrictions...`, ephemeral: true });
    if (interaction.guild) {
      const result = await syncGiveawayChannelRestrictions(interaction.guild);
      if (!result.success && result.errors.length > 0) {
        await interaction.followUp({ content: `⚠️ Some channel restrictions could not be applied:\n${result.errors.join("\n")}`, ephemeral: true });
      }
    }

  } else if (sub === "add-giveaway-channel") {
    const channel = interaction.options.getChannel("channel", true);
    const config = await getGuildConfig(guildId);
    const existing = config.giveawayChannelIds ?? [];
    if (!existing.includes(channel.id)) {
      await updateGuildConfig(guildId, { giveawayChannelIds: [...existing, channel.id] });
    }
    await interaction.reply({ content: `✅ <#${channel.id}> added as a giveaway channel. Applying role restrictions...`, ephemeral: true });
    if (interaction.guild) {
      const result = await syncGiveawayChannelRestrictions(interaction.guild);
      if (result.success) {
        await interaction.followUp({ content: `🔒 Inactive and On Leave roles are now denied access to <#${channel.id}>.`, ephemeral: true });
      } else {
        await interaction.followUp({
          content: `⚠️ Could not fully apply restrictions. Make sure the bot has **Manage Channels** permission and roles are configured.\n${result.errors.join("\n")}`,
          ephemeral: true,
        });
      }
    }

  } else if (sub === "remove-giveaway-channel") {
    const channel = interaction.options.getChannel("channel", true);
    const config = await getGuildConfig(guildId);
    const updated = (config.giveawayChannelIds ?? []).filter((id) => id !== channel.id);
    await updateGuildConfig(guildId, { giveawayChannelIds: updated });
    if (interaction.guild) {
      await removeGiveawayChannelRestriction(interaction.guild, channel.id);
    }
    await interaction.reply({ content: `✅ <#${channel.id}> removed from giveaway channels. Role restrictions cleared.`, ephemeral: true });

  } else if (sub === "giveaway-mode") {
    const mode = interaction.options.getString("mode", true);
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    if (mode === "on") {
      await updateGuildConfig(guildId, { giveawayModeActive: true });
      const result = await liftGiveawayRestrictions(interaction.guild);

      if (result.success) {
        await interaction.editReply({
          content: `🎉 **Giveaway mode ON** — All restrictions on giveaway channels have been lifted. Members on leave or marked inactive can now see and join the giveaway.\n\nRun \`/setup giveaway-mode off\` when the giveaway ends to restore restrictions.`,
        });
      } else {
        await interaction.editReply({
          content: `⚠️ Giveaway mode enabled but some restrictions could not be lifted:\n${result.errors.join("\n")}`,
        });
      }

    } else {
      await updateGuildConfig(guildId, { giveawayModeActive: false });
      const result = await syncGiveawayChannelRestrictions(interaction.guild);

      if (result.success) {
        await interaction.editReply({
          content: `🔒 **Giveaway mode OFF** — Restrictions have been restored. Inactive members and members on leave can no longer see giveaway channels.`,
        });
      } else {
        await interaction.editReply({
          content: `⚠️ Giveaway mode disabled but some restrictions could not be restored:\n${result.errors.join("\n")}`,
        });
      }
    }
  }
}
