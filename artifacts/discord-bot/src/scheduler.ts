import { Client, TextChannel, EmbedBuilder } from "discord.js";
import { getGuildConfig } from "./config.js";
import {
  getAllGuildActivity,
  markWarningSent,
  markStaffAlertSent,
  recordActivity,
} from "./activity.js";
import { getActiveLeaveForUser } from "./leaveRequests.js";
import { assignInactiveRole, removeInactiveRoles } from "./roles.js";

const INTERVAL_MS = 60 * 60 * 1000;

export function startScheduler(client: Client): void {
  setInterval(() => runInactivityCheck(client), INTERVAL_MS);
  console.log("Inactivity scheduler started (runs every hour).");
}

export async function runInactivityCheck(client: Client): Promise<void> {
  console.log("Running inactivity check...");

  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const config = await getGuildConfig(guildId);
      const activities = await getAllGuildActivity(guildId);
      const now = new Date();

      for (const activity of activities) {
        const member = guild.members.cache.get(activity.userId)
          ?? await guild.members.fetch(activity.userId).catch(() => null);
        if (!member || member.user.bot) continue;

        const activeLease = await getActiveLeaveForUser(guildId, activity.userId);

        if (activeLease) {
          continue;
        }

        const lastMessageMs = activity.lastMessageAt.getTime();
        const daysSinceActivity = (now.getTime() - lastMessageMs) / (1000 * 60 * 60 * 24);

        if (daysSinceActivity < config.inactivityDays) {
          if (activity.isInactive) {
            await removeInactiveRoles(member);
          }
          continue;
        }

        if (daysSinceActivity >= config.inactivityDays && !activity.warningSentAt) {
          await sendInactivityWarning(client, config, guildId, activity.userId, Math.floor(daysSinceActivity));
          await markWarningSent(guildId, activity.userId);
          await assignInactiveRole(member);
        }

        if (daysSinceActivity >= config.kickThresholdDays && !activity.staffAlertSentAt) {
          await sendStaffAlert(client, config, guildId, activity.userId, Math.floor(daysSinceActivity));
          await markStaffAlertSent(guildId, activity.userId);
        }
      }
    } catch (err) {
      console.error(`Error checking guild ${guildId}:`, err);
    }
  }
}

async function sendInactivityWarning(
  client: Client,
  config: Awaited<ReturnType<typeof getGuildConfig>>,
  guildId: string,
  userId: string,
  daysSince: number
): Promise<void> {
  if (!config.warningChannelId) return;

  try {
    const channel = client.channels.cache.get(config.warningChannelId) as TextChannel | undefined;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("⚠️ Inactivity Warning")
      .setDescription(
        `<@${userId}>, you have been inactive for **${daysSince} day(s)**.\n\n` +
        `Please become active again or submit a leave request with \`/leaverequest\` to explain your absence.\n\n` +
        `If no action is taken, staff may be notified.`
      )
      .setTimestamp();

    await channel.send({ content: `<@${userId}>`, embeds: [embed] });
  } catch (err) {
    console.error(`Failed to send warning for ${userId}:`, err);
  }
}

async function sendStaffAlert(
  client: Client,
  config: Awaited<ReturnType<typeof getGuildConfig>>,
  guildId: string,
  userId: string,
  daysSince: number
): Promise<void> {
  if (!config.staffChannelId) return;

  try {
    const channel = client.channels.cache.get(config.staffChannelId) as TextChannel | undefined;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("🚨 Extended Inactivity Alert")
      .setDescription(
        `<@${userId}> has been inactive for **${daysSince} day(s)** (threshold: ${config.kickThresholdDays} days).\n\n` +
        `Please review and decide if further action is required.`
      )
      .setFooter({ text: "The bot will NOT auto-kick. All moderation decisions are yours." })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`Failed to send staff alert for ${userId}:`, err);
  }
}
