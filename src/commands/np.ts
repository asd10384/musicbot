import { client } from "../index";
// import { check_permission as ckper, embed_permission as emper } from "../utils/Permission";
import { Command } from "../interfaces/Command";
import { Message, EmbedBuilder, ChatInputApplicationCommandData, CommandInteraction } from "discord.js";
// import { QDB } from "../databases/Quickdb";

/**
 * DB
 * let GDB = await QDB.get(interaction.guild!);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

export default class implements Command {
  /** 해당 명령어 설명 */
  name = "np";
  visible = true;
  description = "현재 노래정보를 알려줍니다.";
  information = "현재 노래정보를 알려줍니다.";
  aliases: string[] = [];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashRun(interaction: CommandInteraction) {
    const mc = client.getmc(interaction.guild!);
    if (!mc.playing || !mc.nowplaying) return await interaction.followUp({ embeds: [
      client.mkembed({
        title: `현재 재생중인 노래가 없습니다.`,
        color: "DarkRed"
      })
    ] });
    return await interaction.followUp({ embeds: [
      client.mkembed({
        title: `${mc.nowplaying.title}`,
        description: `가수 : ${
          mc.nowplaying.author
        }\n신청자 : ${
          mc.nowplaying.player
        }\n현재시간 : ${
          mc.nowplaying.duration === "0" ? "실시간" : mc.np()
        }\n전체시간 : ${
          mc.nowplaying.duration === "0" ? "실시간" : mc.nowplaying.duration
        }\n재생여부 : ${
          mc.playstatus()
        }`,
        url: mc.nowplaying.url,
        thumbnail: mc.nowplaying.image
      })
    ] });
  }
  async messageRun(message: Message, _args: string[]) {
    const mc = client.getmc(message.guild!);
    if (!mc.playing || !mc.nowplaying) return message.channel.send({ embeds: [
      client.mkembed({
        title: `현재 재생중인 노래가 없습니다.`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
    return message.channel.send({ embeds: [
      client.mkembed({
        title: `${mc.nowplaying.title}`,
        description: `가수 : ${
          mc.nowplaying.author
        }\n신청자 : ${
          mc.nowplaying.player
        }\n현재시간 : ${
          mc.np()
        }\n전체시간 : ${
          mc.nowplaying.duration === "0" ? "실시간" : mc.np()
        }\n재생여부 : ${
          mc.playstatus()
        }`,
        url: mc.nowplaying.url,
        thumbnail: mc.nowplaying.image
      })
    ] }).then(m => client.msgdelete(m, 3));
  }

  help(): EmbedBuilder {
    return client.help(this.metadata.name, this.metadata, this.msgmetadata)!;
  }
}