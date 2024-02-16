import { ChatInputApplicationCommandData, CommandInteraction, Message } from "discord.js";
import { Command } from "../interfaces/Command";
import { embedCreate } from "../utils/embedCreate";
import { msgDelete } from "../utils/msgDelete";

export default class implements Command {
  permissions: boolean = false;
  name: string = "ping";
  description: string = "ping to pong";
  alias: string[] = [ "핑" ];
  data: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
  };
  msgData: { name: string; des: string; }[] = [];
  async msgRun(message: Message, _args: string[]) {
    return message.channel.send({ embeds: [ embedCreate({ title: "PONG!" }) ] }).then(m => msgDelete(m, 1));
  }
  async slashRun(interaction: CommandInteraction) {
    return interaction.reply({ embeds: [ embedCreate({ title: "PONG!" }) ], ephemeral: true });
  }
}