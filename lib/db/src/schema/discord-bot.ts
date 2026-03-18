import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guildConfigTable = pgTable("guild_config", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull().unique(),
  inactivityDays: integer("inactivity_days").notNull().default(2),
  kickThresholdDays: integer("kick_threshold_days").notNull().default(7),
  warningChannelId: text("warning_channel_id"),
  staffChannelId: text("staff_channel_id"),
  inactiveRoleId: text("inactive_role_id"),
  onLeaveRoleId: text("on_leave_role_id"),
  giveawayChannelIds: text("giveaway_channel_ids").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGuildConfigSchema = createInsertSchema(guildConfigTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGuildConfig = z.infer<typeof insertGuildConfigSchema>;
export type GuildConfig = typeof guildConfigTable.$inferSelect;

export const userActivityTable = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  warningSentAt: timestamp("warning_sent_at"),
  staffAlertSentAt: timestamp("staff_alert_sent_at"),
  isInactive: boolean("is_inactive").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserActivitySchema = createInsertSchema(userActivityTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivityTable.$inferSelect;

export const leaveRequestTable = pgTable("leave_request", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  reason: text("reason").notNull(),
  durationDays: integer("duration_days").notNull(),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequestTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequestTable.$inferSelect;
