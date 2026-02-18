import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// klient bota
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// komenda /ping
const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Sprawdza czy bot żyje"),
].map((cmd) => cmd.toJSON());

// rejestracja slash komendy na serwerze (dev)
const rest = new REST({ version: "10" }).setToken(token);
await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
  body: commands,
});

client.once("ready", () => {
  console.log(`🤖 Zalogowano jako ${client.user.tag}`);
});

// !ping (klasyczna komenda)
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.content === "!ping") {
    message.reply("pong 🏓");
  }
});

// /ping
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "ping") {
    await interaction.reply("pong 🏓");
  }
});

client.login(token);
