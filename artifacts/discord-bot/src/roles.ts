import { Guild, GuildMember, PermissionsBitField, type TextChannel } from "discord.js";
import { getGuildConfig } from "./config.js";

export async function assignInactiveRole(member: GuildMember): Promise<void> {
  const config = await getGuildConfig(member.guild.id);
  if (!config.inactiveRoleId) return;

  try {
    await member.roles.add(config.inactiveRoleId);
  } catch (err) {
    console.error(`Failed to assign inactive role to ${member.user.tag}:`, err);
  }
}

export async function assignOnLeaveRole(member: GuildMember): Promise<void> {
  const config = await getGuildConfig(member.guild.id);
  if (!config.onLeaveRoleId) return;

  try {
    await member.roles.add(config.onLeaveRoleId);
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
  } catch (err) {
    console.error(`Failed to remove inactive roles from ${member.user.tag}:`, err);
  }
}

export async function syncGiveawayChannelRestrictions(guild: Guild): Promise<{ success: boolean; errors: string[] }> {
  const config = await getGuildConfig(guild.id);
  const errors: string[] = [];

  if (config.giveawayChannelIds.length === 0) {
    return { success: true, errors: [] };
  }

  const roleIds = [config.inactiveRoleId, config.onLeaveRoleId].filter(Boolean) as string[];

  if (roleIds.length === 0) {
    return { success: false, errors: ["No inactive or on-leave roles configured. Use /setup inactive-role and /setup leave-role first."] };
  }

  for (const channelId of config.giveawayChannelIds) {
    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      errors.push(`Channel ${channelId} not found in cache.`);
      continue;
    }

    for (const roleId of roleIds) {
      try {
        await channel.permissionOverwrites.edit(roleId, {
          ViewChannel: false,
        });
      } catch (err) {
        const msg = `Failed to set deny on role ${roleId} for channel ${channel.name}: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }
  }

  return { success: errors.length === 0, errors };
}

export async function removeGiveawayChannelRestriction(guild: Guild, channelId: string): Promise<void> {
  const config = await getGuildConfig(guild.id);
  const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) return;

  const roleIds = [config.inactiveRoleId, config.onLeaveRoleId].filter(Boolean) as string[];

  for (const roleId of roleIds) {
    try {
      const overwrite = channel.permissionOverwrites.cache.get(roleId);
      if (overwrite) {
        await overwrite.delete();
      }
    } catch (err) {
      console.error(`Failed to remove overwrite for role ${roleId} on channel ${channel.name}:`, err);
    }
  }
}
