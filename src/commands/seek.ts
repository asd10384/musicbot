import { client } from "../index";
import { Command } from "../interfaces/Command";
// import { Logger } from "../utils/Logger";
import { Message, EmbedBuilder, ApplicationCommandOptionType, ChatInputApplicationCommandData, CommandInteraction, Guild } from "discord.js";
// import { check_permission as ckper, embed_permission as emper } from "../utils/Permission";
import { QDB } from "../databases/Quickdb";

/**
 * DB
 * let GDB = await QDB.get(interaction.guild!);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 * if (!(await ckper(message))) return (message.channel as TextChannel).send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

export default class implements Command {
  /** 해당 명령어 설명 */
  name = "seek";
  visible = true;
  description = "seek";
  information = "seek";
  aliases: string[] = [];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
    options: [
      {
        type: ApplicationCommandOptionType.Integer,
        name: "time",
        description: "time",
        required: true
      }
    ]

  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashRun(interaction: CommandInteraction) {
    const cmd = interaction.options.data[0];
    const data = cmd.options ? cmd.options[0]?.value : undefined;
    return await interaction.followUp({ embeds: [ await this.seek(interaction.guild!, data as number) ] });
  }
  async messageRun(message: Message, args: string[]) {
    if (!args[0]) return message.channel.send({ embeds: [ client.mkembed({
      title: `시간을 입력해주세요.`,
      description: `${client.prefix}seek [number]\n${client.prefix}seek 분:초\n${client.prefix}seek 시간:분:초`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 1));
    let time = 0;
    let err = "";
    let list = args[0].replace(/ +/g,"").split(":");
    if (list.length > 3) return message.channel.send({ embeds: [ client.mkembed({
      title: `시간:분:초 형식으로 입력해주세요.`,
      description: `${client.prefix}seek [number]\n${client.prefix}seek 분:초\n${client.prefix}seek 시간:분:초`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 1));
    for (let i=0; i<list.length; i++) {
      let text = list[i];
      if (isNaN(Number(text))) {
        err = "시간은 숫자(초) 혹은 분:초  혹은 시간:분:초 형식으로만 입력가능합니다.";
        break;
      }
      if (Number(args[0]) <= 0) {
        err = "시간은 1이상으로 입력해주세요";
        break;
      }
    }
    if (err.length !== 0) return message.channel.send({ embeds: [ client.mkembed({
      title: err,
      description: `${client.prefix}seek [number]\n${client.prefix}seek 분:초\n${client.prefix}seek 시간:분:초`,
      color: "DarkRed"
    }) ] }).then(m => client.msgdelete(m, 1));
    if (list.length === 1) {
      time = Number(list[0]);
    } else if (list.length === 2) {
      time = Number(list[0])*60;
      time += Number(list[1]);
    } else {
      time = Number(list[0])*3600;
      time += Number(list[1])*60;
      time += Number(list[2]);
    }
    return message.channel.send({ embeds: [ await this.seek(message.guild!, Number(args[0])) ] }).then(m => client.msgdelete(m, 2));
  }

  help(): EmbedBuilder {
    return client.help(this.metadata.name, this.metadata, this.msgmetadata)!;
  }

  async seek(guild: Guild, time: number): Promise<EmbedBuilder> {
    const mc = client.getmc(guild);
    if (!mc.playing || !mc.nowplaysong || !mc.nowResource) return client.mkembed({
      title: `노래가 재생되고있지않음`,
      color: "DarkRed"
    });
    if (time > Number(mc.nowplaysong.duration)) return client.mkembed({
      title: `노래 시간보다 입력시간이 더 큼`,
      color: "DarkRed"
    });
    const gdb = await QDB.guild.get(guild);
    const data = mc.nowplaysong;
    mc.play({ playData: data, startTime: time });
    return client.mkembed({
      title: `**${(gdb.options.author) ? `${data.author.replace(" - Topic","")} - ` : ''}${data.title}**`,
      description: `현재재생시간: ${mc.setTime(time)}\n영상재생시간: ${mc.setTime(data.duration)}`,
      image: data.image,
      url: data.id ? "https://youtu.be/" + data.id : undefined
    });
  }
}