import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { registerForumHandlers } from "./forum/services.js";
import { registerOtherHandlers } from "./other.js";
import { getEnv } from "./utils.js";

const token = getEnv("DISCORD_TOKEN", true);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user!.tag}`);
});

registerForumHandlers(client);
registerOtherHandlers(client);

client.login(token);
