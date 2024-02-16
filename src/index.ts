import { Client, GatewayIntentBits } from "discord.js";
import { BotClass } from "./structs/Bot";

export const Bot = new BotClass(new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    // GatewayIntentBits.DirectMessages
  ]
}));