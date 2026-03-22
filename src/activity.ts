const userActivity: Record<string, any> = {};

export async function recordActivity(guildId: string, userId: string) {
  userActivity[`${guildId}-${userId}`] = { 
    lastMessageAt: new Date(), 
    updatedAt: new Date(),
    guildId, userId 
  };
}

export async function getUserActivity(guildId: string, userId: string) {
  return userActivity[`${guildId}-${userId}`] || null;
}

export async function getAllGuildActivity(guildId: string) {
  return Object.values(userActivity).filter((a: any) => a.guildId === guildId);
}

export async function resetUserActivity(guildId: string, userId: string) {
  delete userActivity[`${guildId}-${userId}`];
}

export async function markWarningSent(guildId: string, userId: string) {
  const activity = userActivity[`${guildId}-${userId}`];
  if (activity) activity.warningSentAt = new Date();
}

export async function markStaffAlertSent(guildId: string, userId: string) {
  const activity = userActivity[`${guildId}-${userId}`];
  if (activity) activity.staffAlertSentAt = new Date();
}
