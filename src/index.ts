import "dotenv/config";
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  TextBasedChannel,
} from "discord.js";
import { FORUM_CHANNEL_ID, ANNOUNCE_CHANNEL_ID } from "./config.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error("Brakuje DISCORD_TOKEN w .env");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`🤖 Zalogowano jako ${client.user!.tag}`);
});

client.on("threadCreate", async (thread) => {
  if (thread.parentId !== FORUM_CHANNEL_ID) return;

  const parent = thread.parent;
  if (!parent || parent.type !== ChannelType.GuildForum) return;

  const announceChannel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
  if (!announceChannel) {
    console.error("Nie można znaleźć kanału o id: " + ANNOUNCE_CHANNEL_ID);
    return;
  }

  if (announceChannel.type === ChannelType.GuildText) {
    await announceChannel.send(`🆕 nowa sesja: ${thread.url}`);
  }
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.content === "!ping") {
    message.reply("pong 🏓");
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("pong 🏓");
  }
});

client.login(token);
