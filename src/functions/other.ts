import type { Client } from "discord.js";

export function registerOtherHandlers(client: Client) {
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
}
