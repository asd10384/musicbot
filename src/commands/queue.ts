import { client } from "../index";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js";
import { ApplicationCommandOptionType, Guild } from "discord.js";
import QDB, { guilddata } from "../database/Quickdb";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 */

/** queue 명령어 */
export default class QueueCommand implements Command {
  /** 해당 명령어 설명 */
  name = "queue";
  visible = true;
  description = "check queue";
  information = "queue 확인";
  aliases: string[] = [  ];
  metadata: D = {
    name: this.name,
    description: this.description,
    options: [{
      type: ApplicationCommandOptionType.Integer,
      name: "number",
      description: "QUEUE 번호",
      required: false
    }]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    const getnumber = interaction.options.get('number') ? interaction.options.get('number')?.value as number : null;
    let guildDB = await QDB.get(interaction.guild!);
    return await interaction.followUp({ embeds: [ await this.list(interaction.guild!, guildDB, getnumber) ] });
  }

  async list(guild: Guild, guildDB: guilddata, getnumber: number | null) {
    const mc = client.getmc(guild);
    const queue = await QDB.queue(guild.id);
    if (mc.playing) {
      var list: { label: string, description: string, value: string }[] = [];
      const number = Math.ceil(queue.length / client.maxqueue);
      for (let i=0; i<number; i++) {
        list.push({ label: `${i+1}번`, description: `${(i*client.maxqueue)+1} ~ ${(i*client.maxqueue)+client.maxqueue}`, value: `${i}` });
      }
      if (list && list.length > 0) {
        if (getnumber) {
          if (getnumber < 1) return client.mkembed({
            title: `QUEUE 오류`,
            description: `번호는 0보다 커야합니다.`,
            color: "DarkRed"
          });
          if (getnumber > list.length) return client.mkembed({
            title: `QUEUE 오류`,
            description: `입력한 번호가 너무 큽니다.\n현재 \` 1~${list.length} \` 번까지 입력가능합니다.`,
            color: "DarkRed"
          });
          let options = guildDB.options;
          var list2: string[] = [];
          queue.forEach((data, i) => {
            if (!list2[Math.floor(i/client.maxqueue)]) list2[Math.floor(i/client.maxqueue)] = '';
            list2[Math.floor(i/client.maxqueue)] += `${i+1}. ${data.title} [${data.duration}]${(options.player) ? ` ~ ${data.player}` : ''}\n`;
          });
          return client.mkembed({
            title: `${Number(getnumber)}번째 QUEUE ${((Number(getnumber)-1)*client.maxqueue)+1}~${((Number(getnumber)-1)*30)+30}`,
            description: list2[Number(getnumber)-1],
            color: client.embedcolor
          });
        }
        return client.mkembed({
          title: `QUEUE 확인`,
          description: `확인할 번호를 선택해주세요.\n현재 \` 1~${list.length} \` 번까지 있습니다.\n한번에 ${client.maxqueue}개씩 볼수있습니다.`,
          footer: { text: `/queue number:[번호] 로선택해주세요.` },
          color: client.embedcolor
        });
      } else {
        return client.mkembed({
          title: `QUEUE 확인`,
          description: `QUEUE가 없습니다.\n대기중인 노래가 없습니다.`,
          color: "DarkRed"
        });
      }
    } else {
      return client.mkembed({
        title: `QUEUE 확인`,
        description: `현재 노래가 재생되고있지 않습니다.`,
        color: "DarkRed"
      });
    }
  }
}