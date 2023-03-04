import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../utils/Permission";
import { Command } from "../interfaces/Command";
import { Message, EmbedBuilder, ChatInputApplicationCommandData, TextChannel } from "discord.js";
// import { QDB } from "../databases/Quickdb";

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
  name = "어드민명령어";
  visible = false;
  description = "admin command";
  information = "admin command";
  aliases: string[] = [];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async messageRun(message: Message, args: string[]) {
    if (!(await ckper(message))) return (message.channel as TextChannel).send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
    if (args[0] === "채널삭제") {
      if (!args[1]) return (message.channel as TextChannel).send({ embeds: [
        client.mkembed({
          title: `채널아이디 입력`,
          color: "DarkRed"
        })
      ] }).then(m => client.msgdelete(m, 1));
      let channel = message.guild?.channels.cache.get(args[1]);
      if (!channel) return (message.channel as TextChannel).send({ embeds: [
        client.mkembed({
          title: `채널없음`,
          color: "DarkRed"
        })
      ] }).then(m => client.msgdelete(m, 1));
      channel.delete().catch(() => {});
      return;
    }

    if (args[0] === "채널이름") {
      if (!args[1]) return (message.channel as TextChannel).send({ embeds: [
        client.mkembed({
          title: `채널아이디 입력`,
          color: "DarkRed"
        })
      ] }).then(m => client.msgdelete(m, 1));
      if (!args[2]) return (message.channel as TextChannel).send({ embeds: [
        client.mkembed({
          title: `채널이름 입력`,
          color: "DarkRed"
        })
      ] }).then(m => client.msgdelete(m, 1));
      let channel = message.guild?.channels.cache.get(args[1]);
      if (!channel) return (message.channel as TextChannel).send({ embeds: [
        client.mkembed({
          title: `채널없음`,
          color: "DarkRed"
        })
      ] }).then(m => client.msgdelete(m, 1));
      channel.setName(args.slice(2).join(" ")).catch(() => {});
      return;
    }

    return (message.channel as TextChannel).send({ embeds: [
      client.mkembed({
        title: `실패`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
  }

  help(): EmbedBuilder {
    return client.help(this.metadata.name, this.metadata, this.msgmetadata)!;
  }
}