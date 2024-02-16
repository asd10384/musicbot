import { AnySelectMenuInteraction, ButtonInteraction, ChatInputApplicationCommandData, CommandInteraction, Message } from "discord.js";

export interface Command {
  permissions: boolean;
  name: string;
  description: string;
  alias: string[];
  data: ChatInputApplicationCommandData;
  msgData: { name: string; des: string; }[];
  msgRun?: (message: Message, args: string[]) => Promise<any>;
  btnRun?: (interaction: ButtonInteraction, args: string[]) => Promise<any>;
  slashRun?: (interaction: CommandInteraction) => Promise<any>;
  menuRun?: (interaction: AnySelectMenuInteraction, args: string[]) => Promise<any>;
}
