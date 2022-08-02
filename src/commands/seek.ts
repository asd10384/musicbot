import { client } from "../index";
import { Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js.js";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { entersState, getVoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 */

/** Seek 명령어 */
export default class SeekCommand implements Command {
  /** 해당 명령어 설명 */
  name = "seek";
  visible = true;
  description = "move to time";
  information = "설정한 시간으로 이동";
  aliases: string[] = [  ];
  metadata: D = {
    name: this.name,
    description: this.description,
    options: [{
      type: ApplicationCommandOptionType.String,
      name: "time",
      description: "00:00 or 00:00:00",
      required: true
    }]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    let time = interaction.options.get('time', true).value as string;
    return await interaction.editReply({ embeds: [ await this.seek(interaction, time) ] });
  }
  async msgrun(message: M, args: string[]) {
    return await message.channel.send({ embeds: [ await this.seek(message, args.join(":")) ] });
  }

  async seek(message: M | I, time: string): Promise<EmbedBuilder> {
    const mc = client.getmc(message.guild!);
    if (!mc.playing || !mc.nowplaying?.duration) return this.err(`재생중인 노래가 없습니다.`);
    const timelist = time.replace(/ +/g,"").split(":");
    if (timelist.length < 2 || timelist.length > 3) return this.err(`형식이 올바르지않습니다.\n00:00 or 00:00:00`);
    const sec = parseInt(mc.nowplaying.duration);
    const setsec = this.makesec(timelist);
    if (sec < 0 || setsec < 0) return this.err(`시간을 불러올수 없습니다.`);
    if (sec < setsec) return this.err(`시간이 너무 큽니다.\n현재노래길이 : ${mc.settime(sec)}`);
    if (getVoiceConnection(mc.guild.id)) {
      await entersState(getVoiceConnection(mc.guild.id)!, VoiceConnectionStatus.Ready, 5_000).catch((err) => {});
      mc.play(message, undefined, setsec);
    }
    return client.mkembed({
      title: `\` SEEK 실행 \``,
      description: `노래를 ${time.replace(/ +/g,"")} 시간으로 이동`
    });
  }

  makesec(list: string[]): number {
    if (list.length === 2) return parseInt(list[0])*60 + parseInt(list[1]);
    if (list.length === 3) return parseInt(list[0])*3600 + parseInt(list[1])*60 + parseInt(list[2]);
    return -1;
  }

  err(text: string): EmbedBuilder {
    return client.mkembed({
      title: `\` SEEK 오류 \``,
      description: `${text}`,
      color: "DarkRed"
    });
  }
}