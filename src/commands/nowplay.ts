import { client } from "../index";
import { Command } from "../interfaces/Command";
// import { Logger } from "../utils/Logger";
import { Message, EmbedBuilder, ChatInputApplicationCommandData, CommandInteraction, Guild } from "discord.js";
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
  name = "nowplay";
  visible = true;
  description = "nowplay";
  information = "nowplay";
  aliases: string[] = [ "np" ];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashRun(interaction: CommandInteraction) {
    return await interaction.followUp({ embeds: [ await this.np(interaction.guild!) ] });
  }
  async messageRun(message: Message, _args: string[]) {
    return message.channel.send({ embeds: [ await this.np(message.guild!) ] }).then(m => client.msgdelete(m, 2));
  }

  help(): EmbedBuilder {
    return client.help(this.metadata.name, this.metadata, this.msgmetadata)!;
  }

  async np(guild: Guild): Promise<EmbedBuilder> {
    const mc = client.getmc(guild);
    if (!mc.playing || !mc.nowplaysong || !mc.nowResource) return client.mkembed({
      title: `노래가 재생되고있지않음`,
      color: "DarkRed"
    });
    const gdb = await QDB.guild.get(guild);
    const data = mc.nowplaysong;
    return client.mkembed({
      title: `**[${mc.setTime(data.duration)}] ${(gdb.options.author) ? `${data.author.replace(" - Topic","")} - ` : ''}${data.title}**`,
      image: data.image,
      url: data.id ? "https://youtu.be/" + data.id : undefined
    });
  }
}