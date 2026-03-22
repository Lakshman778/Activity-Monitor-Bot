const guildConfig: Record<string, any> = {};

export async function getGuildConfig(guildId: string) {
  return guildConfig[guildId] || { guildId, giveawayChannelIds: [] };
}

export async function updateGuildConfig(guildId: string, updates: any) {
  guildConfig[guildId] = { ...guildConfig[guildId], ...updates, updatedAt: new Date() };
}
