import { Bot } from "../index";
import { ApplicationCommandOptionType, ChatInputApplicationCommandData, CommandInteraction, EmbedBuilder, Message } from "discord.js";
import { Command } from "../interfaces/Command";
import { embedCreate } from "../utils/embedCreate";
import { msgDelete } from "../utils/msgDelete";
import { config } from "../config/config";

export default class implements Command {
  permissions: boolean = false;
  name: string = "제거";
  description: string = "music remove";
  alias: string[] = [ "remove" ];
  data: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
    options: [{
      type: ApplicationCommandOptionType.Integer,
      name: "번호",
      description: "삭제할 노래 번호",
      min_value: 1,
      required: true
    }]
  };
  msgData: { name: string; des: string; }[] = [{
      name: this.data.options![0].name,
      des: this.data.options![0].description
  }];
  async msgRun(message: Message, args: string[]) {
    if (!args[0]) return message.channel.send({ embeds: [ embedCreate({ title: `\` 제거 오류 \``, description: `${config.prefix}${this.name} [번호]`, color: "DarkRed" }) ] }).then(m => msgDelete(m, 1));
    if (isNaN(Number(args[0]))) return message.channel.send({ embeds: [ embedCreate({ title: `\` 제거 오류 \``, description: `${config.prefix}${this.name} [번호] <- 숫자만 입력가능`, color: "DarkRed" }) ] }).then(m => msgDelete(m, 1));
    if (Number(args[0]) <= 0) return message.channel.send({ embeds: [ embedCreate({ title: `\` 제거 오류 \``, description: `${config.prefix}${this.name} [번호] <- 1이상만 입력가능`, color: "DarkRed" }) ] }).then(m => msgDelete(m, 1));
    return message.channel.send({ embeds: [ this.remove(message.guild!.id, Number(args[0])) ] }).then(m => msgDelete(m, 6));
  }
  async slashRun(interaction: CommandInteraction) {
    const cmd = interaction.options.data[0];
    const num = (cmd.value || 0) as number;
    if (num <= 0) return interaction.reply({ embeds: [ embedCreate({ title: `\` 제거 오류 \``, description: `/${this.name} [번호] <- 1이상만 입력가능`, color: "DarkRed" }) ], ephemeral: true });
    return interaction.reply({ embeds: [ this.remove(interaction.guild!.id, num) ], ephemeral: true });
  }

  remove(guildId: string, num: number): EmbedBuilder {
    let mdb = Bot.music.getMDB(guildId);
    if (!mdb.playing) return embedCreate({
      title: `\` 제거 오류 \``,
      description: `노래가 재생중이지 않음`,
      color: "DarkRed"
    });
    if (!mdb.queue) return embedCreate({
      title: `\` 제거 오류 \``,
      description: `대기중인 노래가 없음`,
      color: "DarkRed"
    });
    if (num > mdb.queue.length) return embedCreate({
      title: `\` 제거 오류 \``,
      description: `번호가 너무 큽니다.\n현재 대기중인 노래 : ${mdb.queue.length}곡`,
      color: "DarkRed"
    });
    let del_list = mdb.queue.splice(num-1, 1);
    if (!del_list) return embedCreate({
      title: `\` 제거 오류 \``,
      description: `노래를 찾을수 없음`,
      color: "DarkRed"
    });
    mdb = Bot.music.setMDB(guildId, {
      queue: mdb.queue
    });
    return embedCreate({
      title: `\` 노래 제거 : ${num}번 \``,
      description: `제거번호 : ${num}번\n제목 : ${del_list[0].title}`
    });
  }
}