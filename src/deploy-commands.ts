import { REST, Routes, SlashCommandBuilder } from "discord.js";
import * as setup from "./commands/setup.js";
import * as leaverequest from "./commands/leaverequest.js";
import * as review from "./commands/review.js";
import * as inactive from "./commands/inactive.js";
import * as mystatus from "./commands/mystatus.js";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token) throw new Error("DISCORD_BOT_TOKEN is required.");
if (!clientId) throw new Error("DISCORD_CLIENT_ID is required.");

const commands = [
  setup.data,
  leaverequest.data,
  review.data,
  inactive.data,
  mystatus.data,
].map((c) => c.toJSON());

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands globally...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Slash commands registered successfully.");
  } catch (err) {
    console.error("Failed to register commands:", err);
    process.exit(1);
  }
})();
