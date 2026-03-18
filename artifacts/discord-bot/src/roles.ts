import {
  Guild,
  GuildMember,
  PermissionsBitField,
  OverwriteType,
  type TextChannel,
} from "discord.js";
import { getGuildConfig } from "./config.js";

export async function assignInactiveRole(member: GuildMember): Promise<void> {
  const config = await getGuildConfig(member.guild.id);
  if (!config.inactiveRoleId) return;

  try {
    await member.roles.add(config.inactiveRoleId);
    await removeGiveawayAccess(member, config.giveawayChannelIds);
  } catch (err) {
    console.error(`Failed to assign inactive role to ${member.user.tag}:`, err);
  }
}

export async function assignOnLeaveRole(member: GuildMember): Promise<void> {
  const config = await getGuildConfig(member.guild.id);
  if (!config.onLeaveRoleId) return;

  try {
    await member.roles.add(config.onLeaveRoleId);
    await removeGiveawayAccess(member, config.giveawayChannelIds);
  } catch (err) {
    console.error(`Failed to assign on-leave role to ${member.user.tag}:`, err);
  }
}

export async function removeInactiveRoles(member: GuildMember): Promise<void> {
  const config = await getGuildConfig(member.guild.id);

  try {
    if (config.inactiveRoleId && member.roles.cache.has(config.inactiveRoleId)) {
      await member.roles.remove(config.inactiveRoleId);
    }
    if (config.onLeaveRoleId && member.roles.cache.has(config.onLeaveRoleId)) {
      await member.roles.remove(config.onLeaveRoleId);
    }
    await restoreGiveawayAccess(member, config.giveawayChannelIds);
  } catch (err) {
    console.error(`Failed to remove inactive roles from ${member.user.tag}:`, err);
  }
}

async function removeGiveawayAccess(member: GuildMember, channelIds: string[]): Promise<void> {
  for (const channelId of channelIds) {
    try {
      const channel = member.guild.channels.cache.get(channelId) as TextChannel | undefined;
      if (!channel) continue;
      await channel.permissionOverwrites.edit(member.user, {
        ViewChannel: false,
      });
    } catch (err) {
      console.error(`Failed to remove giveaway access for ${member.user.tag} in ${channelId}:`, err);
    }
  }
}

async function restoreGiveawayAccess(member: GuildMember, channelIds: string[]): Promise<void> {
  for (const channelId of channelIds) {
    try {
      const channel = member.guild.channels.cache.get(channelId) as TextChannel | undefined;
      if (!channel) continue;
      const overwrite = channel.permissionOverwrites.cache.get(member.id);
      if (overwrite) {
        await overwrite.delete();
      }
    } catch (err) {
      console.error(`Failed to restore giveaway access for ${member.user.tag} in ${channelId}:`, err);
    }
  }
}
