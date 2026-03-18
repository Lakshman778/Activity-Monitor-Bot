import { db, userActivityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { UserActivity } from "@workspace/db";

export async function recordActivity(guildId: string, userId: string): Promise<void> {
  const existing = await db
    .select()
    .from(userActivityTable)
    .where(
      and(
        eq(userActivityTable.guildId, guildId),
        eq(userActivityTable.userId, userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userActivityTable)
      .set({
        lastMessageAt: new Date(),
        isInactive: false,
        warningSentAt: null,
        staffAlertSentAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userActivityTable.guildId, guildId),
          eq(userActivityTable.userId, userId)
        )
      );
  } else {
    await db.insert(userActivityTable).values({
      guildId,
      userId,
      lastMessageAt: new Date(),
    });
  }
}

export async function getUserActivity(
  guildId: string,
  userId: string
): Promise<UserActivity | null> {
  const result = await db
    .select()
    .from(userActivityTable)
    .where(
      and(
        eq(userActivityTable.guildId, guildId),
        eq(userActivityTable.userId, userId)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

export async function getAllGuildActivity(guildId: string): Promise<UserActivity[]> {
  return db
    .select()
    .from(userActivityTable)
    .where(eq(userActivityTable.guildId, guildId));
}

export async function markWarningSent(guildId: string, userId: string): Promise<void> {
  await db
    .update(userActivityTable)
    .set({ warningSentAt: new Date(), isInactive: true, updatedAt: new Date() })
    .where(
      and(
        eq(userActivityTable.guildId, guildId),
        eq(userActivityTable.userId, userId)
      )
    );
}

export async function markStaffAlertSent(guildId: string, userId: string): Promise<void> {
  await db
    .update(userActivityTable)
    .set({ staffAlertSentAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(userActivityTable.guildId, guildId),
        eq(userActivityTable.userId, userId)
      )
    );
}

export async function resetUserActivity(guildId: string, userId: string): Promise<void> {
  await db
    .update(userActivityTable)
    .set({
      lastMessageAt: new Date(),
      isInactive: false,
      warningSentAt: null,
      staffAlertSentAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userActivityTable.guildId, guildId),
        eq(userActivityTable.userId, userId)
      )
    );
}
