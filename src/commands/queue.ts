import { client } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { SlashCommand as Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js";
import { MessageActionRow, MessageButton, MessageSelectMenu } from "discord.js";
import mkembed from "../function/mkembed";
import MDB from "../database/Mongodb";
import Queue from "../function/SelectMenus/Queue";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 */

/** queue 명령어 */
export default class QueueCommand implements Command {
  /** 해당 명령어 설명 */
  metadata = <D>{
    name: 'queue',
    description: 'check queue',
    options: [{
      type: "INTEGER",
      name: "number",
      description: "QUEUE 번호",
      required: false
    }]
  };

  /** 실행되는 부분 */
  async run(interaction: I) {
    const getnumber = interaction.options.getInteger('number');
    let guildDB = await MDB.get.guild(interaction);
    var list: { label: string, description: string, value: string }[] = [];
    if (guildDB && guildDB.playing) {
      const number = Math.ceil(guildDB.queue.length / client.maxqueue);
      for (let i=0; i<number; i++) {
        list.push({ label: `${i+1}번`, description: `${(i*client.maxqueue)+1} ~ ${(i*client.maxqueue)+client.maxqueue}`, value: `${i}` });
      }
      if (list && list.length > 0) {
        if (getnumber) {
          if (getnumber < 1) return await interaction.editReply({
            embeds: [
              mkembed({
                title: `QUEUE 오류`,
                description: `번호는 0보다 커야합니다.`,
                color: 'DARK_RED'
              })
            ]
          });
          if (getnumber > list.length) return await interaction.editReply({
            embeds: [
              mkembed({
                title: `QUEUE 오류`,
                description: `입력한 번호가 너무 큽니다.\n현재 \` 1~${list.length} \` 번까지 입력가능합니다.`,
                color: 'DARK_RED'
              })
            ]
          });
          return Queue(interaction, [ (getnumber-1).toString() ]);
        }
        await interaction.editReply({
          embeds: [
            mkembed({
              title: `QUEUE 확인`,
              description: `확인할 번호를 선택해주세요.\n현재 \` 1~${list.length} \` 번까지 있습니다.\n한번에 ${client.maxqueue}개씩 볼수있습니다.`,
              footer: { text: `/queue number:[번호] 로선택해주세요.` },
              color: client.embedcolor
            })
          ]
        });
      } else {
        await interaction.editReply({
          embeds: [
            mkembed({
              title: `QUEUE 확인`,
              description: `QUEUE가 없습니다.\n대기중인 노래가 없습니다.`,
              color: "DARK_RED"
            })
          ]
        });
      }
    } else {
      await interaction.editReply({
        embeds: [
          mkembed({
            title: `QUEUE 확인`,
            description: `현재 노래가 재생되고있지 않습니다.`,
            color: "DARK_RED"
          })
        ]
      });
    }
  }
}