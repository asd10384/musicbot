import { ChatInputApplicationCommandData, CommandInteraction, Message } from "discord.js";

export interface SlashCommand {
  run: (args: CommandInteraction) => any;
  metadata: ChatInputApplicationCommandData;
}

export interface MsgCommand {
  run: (message: Message, args: string[]) => any;
  metadata: {
    name: string,
    description: string,
    aliases: string[]
  };
}