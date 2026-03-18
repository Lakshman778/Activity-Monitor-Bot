import { db, guildConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { GuildConfig } from "@workspace/db";

const defaultConfig = {
  inactivityDays: 2,
  kickThresholdDays: 7,
  warningChannelId: null as string | null,
  staffChannelId: null as string | null,
  inactiveRoleId: null as string | null,
  onLeaveRoleId: null as string | null,
  giveawayChannelIds: [] as string[],
};

export type Config = typeof defaultConfig;

const configCache = new Map<string, GuildConfig>();

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  if (configCache.has(guildId)) {
    return configCache.get(guildId)!;
  }

  const existing = await db
    .select()
    .from(guildConfigTable)
    .where(eq(guildConfigTable.guildId, guildId))
    .limit(1);

  if (existing.length > 0) {
    configCache.set(guildId, existing[0]);
    return existing[0];
  }

  const [newConfig] = await db
    .insert(guildConfigTable)
    .values({ guildId })
    .returning();

  configCache.set(guildId, newConfig);
  return newConfig;
}

export async function updateGuildConfig(
  guildId: string,
  updates: Partial<Omit<GuildConfig, "id" | "guildId" | "createdAt" | "updatedAt">>
): Promise<GuildConfig> {
  const [updated] = await db
    .update(guildConfigTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(guildConfigTable.guildId, guildId))
    .returning();

  if (!updated) {
    await db.insert(guildConfigTable).values({ guildId });
    return updateGuildConfig(guildId, updates);
  }

  configCache.set(guildId, updated);
  return updated;
}

export function invalidateConfigCache(guildId: string) {
  configCache.delete(guildId);
}
