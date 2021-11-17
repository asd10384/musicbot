import { client } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { SlashCommand as Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js";
import { MessageActionRow, MessageButton, MessageSelectMenu } from "discord.js";
import mkembed from "../function/mkembed";
import MDB from "../database/Mongodb";

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
    description: 'check queue'
  };

  /** 실행되는 부분 */
  async run(interaction: I) {
    let guildDB = await MDB.get.guild(interaction);
    var list: { label: string, description: string, value: string }[] = [];
    if (guildDB && guildDB.playing) {
      const number = Math.ceil(guildDB.queue.length / client.maxqueue);
      for (let i=0; i<number; i++) {
        list.push({ label: `${i+1}번`, description: `${(i*client.maxqueue)+1} ~ ${(i*client.maxqueue)+client.maxqueue}`, value: `${i}` });
      }
      if (list && list.length > 0) {
        const row = new MessageActionRow().addComponents(
          new MessageSelectMenu()
            .setCustomId('queue')
            .setPlaceholder('번호를 선택해주세요.')
            .addOptions(list)
        );
        await interaction.editReply({
          embeds: [
            mkembed({
              title: `QUEUE 확인`,
              description: `확인할 번호를 선택해주세요.\n한번에 ${client.maxqueue}개씩 볼수있습니다.`,
              footer: { text: `아래 메뉴로 선택해주세요.` },
              color: client.embedcolor
            })
          ],
          components: [ row ]
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