import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { getEnv } from "./utils.js";

const token = getEnv("DISCORD_TOKEN", true);
const clientId = getEnv("CLIENT_ID", true);
const guildId = getEnv("GUILD_ID", true);

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Checks if the bot is alive"),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
  body: commands,
});

console.log("✅ Slash commands successfully registered (guild).");
