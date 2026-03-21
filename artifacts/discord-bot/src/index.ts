import {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  type ChatInputCommandInteraction,
} from "discord.js";
import { recordActivity } from "./activity.js";
import { startScheduler, runInactivityCheck } from "./scheduler.js";
import { getActiveLeaveForUser } from "./leaveRequests.js";
import { removeInactiveRoles } from "./roles.js";
import * as setup from "./commands/setup.js";
import * as leaverequest from "./commands/leaverequest.js";
import * as review from "./commands/review.js";
import * as inactive from "./commands/inactive.js";
import * as mystatus from "./commands/mystatus.js";
import * as settings from "./commands/settings.js";
import * as loa from "./commands/loa.js";
import * as checkwinner from "./commands/checkwinner.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) throw new Error("DISCORD_BOT_TOKEN is required.");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

type Command = {
  data: { name: string; toJSON(): object };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
};

const commands = new Collection<string, Command>();

for (const cmd of [setup, leaverequest, review, inactive, mystatus, settings, loa, checkwinner]) {
  commands.set(cmd.data.name, cmd as Command);
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);

  await registerCommands(readyClient.user.id, token);

  startScheduler(client);

  console.log("Running initial inactivity check...");
  await runInactivityCheck(client);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guildId) return;

  try {
    await recordActivity(message.guildId, message.author.id);

    const member = message.guild?.members.cache.get(message.author.id);
    if (member) {
      const activeLease = await getActiveLeaveForUser(message.guildId, message.author.id);
      if (!activeLease) {
        await removeInactiveRoles(member);
      }
    }
  } catch (err) {
    console.error("Error recording activity:", err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const msg = { content: "❌ An error occurred while executing this command.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

async function registerCommands(clientId: string, token: string): Promise<void> {
  const { REST, Routes } = await import("discord.js");
  const rest = new REST().setToken(token);

  const commandData = [...commands.values()].map((c) => c.data.toJSON());
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
    console.log("Slash commands registered.");
  } catch (err) {
    console.error("Failed to register slash commands:", err);
  }
}

client.login(token);
