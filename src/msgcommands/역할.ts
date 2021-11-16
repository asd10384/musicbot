import { client } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { MsgCommand as Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js.js";
import { MessageActionRow, MessageButton, Role } from "discord.js";
import mkembed from "../function/mkembed";
import MDB from "../database/Mongodb";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

/** 역할 명령어 */
export default class 역할Command implements Command {
  /** 해당 명령어 설명 */
  metadata = {
    name: '역할',
    description: '특정 명령어 사용가능한 역할 설정',
    aliases: ['role']
  };

  /** 실행되는 부분 */
  async run(message: M, args: string[]) {
    if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
    let guildDB = await MDB.get.guild(message);
    let role: Role | undefined;
    if (args[1]) {
      if (args[1].startsWith('<@&') && args[1].endsWith('>')) {
        role = message.guild?.roles.cache.get(args[1].replace(/\<\@\&|\>/g,''));
      } else {
        return message.channel.send({
          embeds: [
            mkembed({
              title: `\` 역할 오류 \``,
              description: `입력한 역할을 찾을수 없습니다.`,
              footer: { text: `도움말: ${client.prefix}역할 도움말` },
              color: 'DARK_RED'
            })
          ]
        }).then(m => client.msgdelete(m, 1));
      }
    }
    if (args[0] === '목록') {
      let text: string = '';
      guildDB!.role.forEach((roleID) => {
        text += `<@&${roleID}>\n`;
      });
      return message.channel.send({
        embeds: [
          mkembed({
            title: `\` 역할 목록 \``,
            description: (text && text !== '') ? text : '등록된 역할 없음',
            color: client.embedcolor
          })
        ]
      }).then(m => client.msgdelete(m, 2.5));
    }
    if (args[0] === '추가') {
      if (role) {
        if (guildDB!.role.includes(role.id)) {
          return message.channel.send({
            embeds: [
              mkembed({
                title: `\` 역할 추가 오류 \``,
                description: `<@&${role.id}> 역할이 이미 등록되어 있습니다.`,
                footer: { text: `목록: ${client.prefix}역할 목록` },
                color: 'DARK_RED'
              })
            ]
          }).then(m => client.msgdelete(m, 1));
        } else {
          guildDB!.role.push(role.id);
          guildDB!.save().catch((err) => console.error(err));
          return message.channel.send({
            embeds: [
              mkembed({
                title: `\` 역할 추가 \``,
                description: `<@&${role.id}> 역할 추가 완료.`,
                footer: { text: `목록: ${client.prefix}역할 목록` },
                color: client.embedcolor
              })
            ]
          }).then(m => client.msgdelete(m, 1.8));
        }
      } else {
        return message.channel.send({
          embeds: [
            mkembed({
              title: `\` 역할 추가 오류 \``,
              description: `역할을 찾을수 없음\n사용법: ${client.prefix}역할 추가 @역할\n예시: ${client.prefix}역할 추가 @everyone`,
              footer: { text: `도움말: ${client.prefix}역할 도움말` },
              color: 'DARK_RED'
            })
          ]
        }).then(m => client.msgdelete(m, 1));
      }
    }
    if (args[0] === '제거') {
      if (role) {
        if (guildDB!.role.includes(role.id)) {
          role = role;
          let list: string[] = [];
          guildDB!.role.forEach((roleID) => {
            if (roleID !== role!.id) list.push(roleID);
          });
          guildDB!.role = list;
          guildDB!.save().catch((err) => console.error(err));
          return message.channel.send({
            embeds: [
              mkembed({
                title: `\` 역할 제거 \``,
                description: `<@&${role.id}> 역할 제거 완료.`,
                footer: { text: `목록: ${client.prefix}역할 목록` },
                color: client.embedcolor
              })
            ]
          }).then(m => client.msgdelete(m, 1.8));
        } else {
          return message.channel.send({
            embeds: [
              mkembed({
                title: `\` 역할 제거 오류 \``,
                description: `<@&${role.id}> 역할이 등록되어 있지 않습니다.`,
                footer: { text: `목록: ${client.prefix}역할 목록` },
                color: 'DARK_RED'
              })
            ]
          }).then(m => client.msgdelete(m, 1));
        }
      } else {
        return message.channel.send({
          embeds: [
            mkembed({
              title: `\` 역할 제거 오류 \``,
              description: `역할을 찾을수 없음\n사용법: ${client.prefix}역할 추가 @역할\n예시: ${client.prefix}역할 추가 @everyone`,
              footer: { text: `도움말: ${client.prefix}역할 도움말` },
              color: 'DARK_RED'
            })
          ]
        }).then(m => client.msgdelete(m, 1));
      }
    }
    return message.channel.send({
      embeds: [
        mkembed({
          title: `\` 역할 도움말 \``,
          description: `
            ${client.prefix}역할 목록
             : 등록된 역할 확인
            ${client.prefix}역할 추가 @역할
             : 특정 명령어 사용가능한 역할 추가
            ${client.prefix}역할 제거 @역할
             : 특정 명령어 사용가능한 역할 제거
          `,
          color: client.embedcolor
        })
      ]
    }).then(m => client.msgdelete(m, 4));
  }
}