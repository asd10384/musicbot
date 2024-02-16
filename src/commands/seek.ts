import { config } from "../config/config";
import { Bot } from "../index";
import { ApplicationCommandOptionType, ChatInputApplicationCommandData, CommandInteraction, EmbedBuilder, Guild, Message } from "discord.js";
import { Command } from "../interfaces/Command";
import { embedCreate } from "../utils/embedCreate";
import { msgDelete } from "../utils/msgDelete";

export default class implements Command {
  permissions: boolean = false;
  name: string = "seek";
  description: string = "music begin play";
  alias: string[] = [];
  data: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
    options: [{
      type: ApplicationCommandOptionType.Integer,
      name: "sec",
      description: "초 입력",
      min_value: 1,
      required: true
    }]
  };
  msgData: { name: string; des: string; }[] = [ { name: this.data.options![0].name, des: this.data.options![0].description } ];
  async msgRun(message: Message, args: string[]) {
    let mdb = Bot.music.getMDB(message.guild!.id);
    if (!mdb.playing?.id) return message.channel.send({ embeds: [ embedCreate({
      title: `\` seek 오류 \``,
      description: `현재 재생중인 노래가 없습니다.`,
      color: "DarkRed"
    }) ] }).then(m => msgDelete(m, 1));
    if (!args[0] || isNaN(Number(args[0])) || Number(args[0]) <= 0) return message.channel.send({ embeds: [ embedCreate({
      title: `\` seek 오류 \``,
      description: `${config.prefix}${this.name} [sec] <- 오류\n초는 정수로 입력해주세요.`,
      color: "DarkRed"
    }) ] }).then(m => msgDelete(m, 1));
    return message.channel.send({ embeds: [ this.getEmbed(message.guild!, Number(args[0])) ] }).then(m => msgDelete(m, 6));
  }
  async slashRun(interaction: CommandInteraction) {
    const cmd = interaction.options.data[0];
    return interaction.reply({ embeds: [ this.getEmbed(interaction.guild!, cmd.value as number) ], ephemeral: true });
  }

  getEmbed(guild: Guild, seek: number): EmbedBuilder {
    let mdb = Bot.music.getMDB(guild.id);
    Bot.music.play(guild, mdb.playing!, undefined, seek);
    return embedCreate({ title: "재생" });
  }
}