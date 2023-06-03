import { client } from "../index";
import { Command } from "../interfaces/Command";
import { ApplicationCommandOptionType, ChatInputApplicationCommandData, CommandInteraction, EmbedBuilder } from "discord.js";
// import { QDB } from "../databases/Quickdb";

/**
 * DB
 * let GDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 */

export default class implements Command {
  /** 해당 명령어 설명 */
  name = "remove";
  visible = true;
  description = "remove queue song";
  information = "목록에 있는 노래 제거";
  aliases: string[] = [];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
    options: [{
      type: ApplicationCommandOptionType.Integer,
      name: "number",
      description: "삭제할 곡 번호 (참고: queue)",
      required: true
    }]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashRun(interaction: CommandInteraction) {
    let number = interaction.options.data[0].value as number;
    return await interaction.followUp({ embeds: [ await this.remove(interaction, number) ] });
  }

  async remove(message: CommandInteraction, number: number): Promise<EmbedBuilder> {
    // const queue = await QDB.guild.queue(message.guildId!);
    const mc = client.getmc(message.guild!);
    let queue = mc.queue;
    if (number > 0 && queue.length >= number) {
      queue = queue.filter((_v, i) => number !== i+1);
      // await QDB.guild.setqueue(message.guildId!, list);
      mc.setQueue(queue);
      mc.setMsg({});
      return client.mkembed({
        title: `${number}번 노래 제거 완료`,
        description: `/queue 로 번호를 확인해주세요.`,
        color: client.embedColor
      });
    } else {
      return client.mkembed({
        title: `노래를 찾을수없음`,
        description: `/queue 로 번호를 확인해주세요.`,
        color: "DarkRed"
      });
    }
  }
}