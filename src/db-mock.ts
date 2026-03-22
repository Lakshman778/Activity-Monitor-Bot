// Fake database for deployment - no real DB needed for Discord bot
export const db = {
  select: () => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({}),
        limit: () => ({}),
        all: async () => []
      })
    })
  }),
  insert: () => ({
    values: async () => {}
  }),
  update: () => ({
    set: () => ({
      returning: async () => ([])
    })
  })
};

export const userActivityTable = {};
export const guildConfigTable = {};
export const leaveRequestTable = {};

export type UserActivity = { id: string; userId: string };
export type GuildConfig = { guildId: string; giveawayChannelIds: string[] };
export type LeaveRequest = { id: string; endDate?: Date };
