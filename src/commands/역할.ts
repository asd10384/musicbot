import { client } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { SlashCommand as Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js.js";
import { MessageActionRow, MessageButton } from "discord.js";
import mkembed from "../function/mkembed";
import MDB from "../database/Mongodb";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 */

/** 역할 명령어 */
export default class 역할Command implements Command {
  /** 해당 명령어 설명 */
  metadata = <D>{
    name: '역할',
    description: '특정 명령어 사용가능한 역할 설정',
    options: [
      {
        type: 'SUB_COMMAND',
        name: '목록',
        description: '등록된 역할 확인'
      },
      {
        type: 'SUB_COMMAND',
        name: '추가',
        description: '특정 명령어 사용가능한 역할 추가',
        options: [{
          type: 'ROLE',
          name: '역할',
          description: '역할',
          required: true
        }]
      },
      {
        type: 'SUB_COMMAND',
        name: '제거',
        description: '특정 명령어 사용가능한 역할 제거',
        options: [{
          type: 'ROLE',
          name: '역할',
          description: '역할',
          required: true
        }]
      }
    ]
  };

  /** 실행되는 부분 */
  async run(interaction: I) {
    if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
    const cmd = interaction.options.getSubcommand(false);
    const role = interaction.options.getRole('역할', false);
    let guildDB = await MDB.get.guild(interaction);
    if (cmd === '목록') {
      let text: string = '';
      guildDB!.role.forEach((roleID) => {
        text += `<@&${roleID}>\n`;
      });
      await interaction.editReply({
        embeds: [
          mkembed({
            title: `\` 역할 목록 \``,
            description: (text && text !== '') ? text : '등록된 역할 없음',
            color: client.embedcolor
          })
        ]
      });
    }
    if (cmd === '추가') {
      if (guildDB!.role.includes(role!.id)) {
        await interaction.editReply({
          embeds: [
            mkembed({
              title: `\` 역할 추가 오류 \``,
              description: `<@&${role!.id}> 역할이 이미 등록되어 있습니다.`,
              footer: { text: `목록: /역할 목록` },
              color: 'DARK_RED'
            })
          ]
        });
      } else {
        guildDB!.role.push(role!.id);
        guildDB!.save().catch((err) => console.error(err));
        await interaction.editReply({
          embeds: [
            mkembed({
              title: `\` 역할 추가 \``,
              description: `<@&${role!.id}> 역할 추가 완료`,
              footer: { text: `목록: /역할 목록` },
              color: client.embedcolor
            })
          ]
        });
      }
    }
    if (cmd === '제거') {
      if (guildDB!.role.includes(role!.id)) {
        let list: string[] = [];
        guildDB!.role.forEach((roleID) => {
          if (roleID !== role!.id) list.push(roleID);
        });
        guildDB!.role = list;
        guildDB!.save().catch((err) => console.error(err));
        await interaction.editReply({
          embeds: [
            mkembed({
              title: `\` 역할 제거 \``,
              description: `<@&${role!.id}> 역할 제거 완료`,
              footer: { text: `목록: /역할 목록` },
              color: client.embedcolor
            })
          ]
        });
      } else {
        await interaction.editReply({
          embeds: [
            mkembed({
              title: `\` 역할 제거 오류 \``,
              description: `<@&${role!.id}> 역할이 등록되어있지 않습니다.`,
              footer: { text: `목록: /역할 목록` },
              color: 'DARK_RED'
            })
          ]
        });
      }
    }
  }
}