import { client } from "../index";
import { Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js.js";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import QDB, { nowplay } from "../database/Quickdb";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 */

/** Remove 명령어 */
export default class RemoveCommand implements Command {
  /** 해당 명령어 설명 */
  name = "remove";
  visible = true;
  description = "remove queue song";
  information = "목록에 있는 노래 제거";
  aliases: string[] = [  ];
  metadata: D = {
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
  async slashrun(interaction: I) {
    let number = interaction.options.get('number', true).value as number;
    return await interaction.followUp({ embeds: [ await this.remove(interaction, number) ] });
  }

  async remove(message: M | I, number: number): Promise<EmbedBuilder> {
    const queue = await QDB.queue(message.guildId!);
    const mc = client.getmc(message.guild!);
    if (number > 0 && queue.length >= number) {
      let list: nowplay[] = [];
      queue.forEach((data, i) => {
        if (i !== number-1) list.push(data);
      });
      await QDB.setqueue(message.guildId!, list);
      mc.setmsg();
      return client.mkembed({
        title: `${number}번 노래 제거 완료`,
        description: `/queue 로 번호를 확인해주세요.`,
        color: client.embedcolor
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