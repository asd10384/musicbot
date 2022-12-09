import { ChatInputApplicationCommandData, CommandInteraction, Message, StringSelectMenuInteraction } from "discord.js";

export interface Command {
  name: string;
  visible: boolean;
  description: string;
  information: string;
  aliases: string[];
  metadata: ChatInputApplicationCommandData;
  msgmetadata?: { name: string, des: string }[];
  slashrun?: (args: CommandInteraction) => Promise<any>;
  msgrun?: (message: Message, args: string[]) => Promise<any>;
  menurun?: (interaction: StringSelectMenuInteraction, args: string[]) => Promise<any>;
}