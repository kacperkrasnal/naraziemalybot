import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  throw new Error("Brakuje DISCORD_TOKEN / CLIENT_ID / GUILD_ID w .env");
}

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Sprawdza czy bot żyje"),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
  body: commands,
});

console.log("✅ Zarejestrowano komendy slash (guild).");
