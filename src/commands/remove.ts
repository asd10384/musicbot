import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js.js";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 */

/** Remove 명령어 */
export default class RemoveCommand implements Command {
  /** 해당 명령어 설명 */
  name = "remove";
  visible = true;
  description = "remove queue song";
  information = "목록에 있는 노래 제거";
  aliases = [];
  metadata = <D>{
    name: this.name,
    description: this.description,
    options: [{
      type: "INTEGER",
      name: "number",
      description: "삭제할 곡 번호 (참고: queue)",
      required: true
    }]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    let number = interaction.options.getInteger('number', true);
    return await interaction.editReply({ embeds: [ this.remove(interaction, number) ] });
  }

  remove(message: M | I, number: number): MessageEmbed {
    const mc = client.getmc(message.guild!);
    if (number > 0 && mc.queuenumber.length >= number) {
      let list: number[] = [];
      mc.queuenumber.forEach((num, i) => {
        if (i !== number-1) list.push(num);
      });
      mc.setqueuenumber(list);
      mc.setmsg(message.guild!);
      return client.mkembed({
        title: `${number}번 노래 제거 완료`,
        description: `/queue 로 번호를 확인해주세요.`,
        color: client.embedcolor
      });
    } else {
      return client.mkembed({
        title: `노래를 찾을수없음`,
        description: `/queue 로 번호를 확인해주세요.`,
        color: "DARK_RED"
      });
    }
  }
}