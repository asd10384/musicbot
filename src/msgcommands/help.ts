import { client, msg, slash } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { MsgCommand as Command } from "../interfaces/Command";
import { I, D, M } from "../aliases/discord.js";
import { MessageActionRow, MessageButton } from "discord.js";
import mkembed from "../function/mkembed";
import MDB from "../database/Mongodb";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

/** help 명령어 */
export default class HelpCommand implements Command {
  /** 해당 명령어 설명 */
  metadata = {
    name: 'help',
    description: '명령어 확인',
    aliases: ['도움말', '명령어']
  };

  /** 실행되는 부분 */
  async run(message: M, args: string[]) {
    if (args[0]) {
      const slashcommand = slash.commands.get(args[0]);
      const msgcommand = msg.commands.get(args[0]) || msg.commands.find((cmd) => cmd.metadata.aliases && cmd.metadata.aliases.includes(args[0]));
      let embed = mkembed({ color: client.embedcolor });
      if (slashcommand) {
        embed.setTitle(`\` /${args[0]} \` 명령어`)
          .setDescription(`이름: ${args[0]}\n설명: ${slashcommand.metadata.description}\n옵션: ${slashcommand.metadata.options}`)
          .setFooter(`도움말: /help`);
      } else if (msgcommand) {
        embed.setTitle(`\` ${client.prefix}${args[0]} \` 명령어`)
          .setDescription(`이름: ${args[0]}\nAND: ${(msgcommand.metadata.aliases) ? msgcommand.metadata.aliases : ''}\n설명: ${msgcommand.metadata.description}`)
          .setFooter(`PREFIX: ${client.prefix}`);
      } else {
        embed.setTitle(`\` ${args[0]} \` 명령어`)
          .setDescription(`명령어를 찾을수 없습니다.`)
          .setFooter(`도움말: /help`)
          .setColor('DARK_RED');
      }
      return message.channel.send({ embeds: [ embed ] }).then(m => client.msgdelete(m, 2.5));
    }
    let slashcmdembed = mkembed({
      author: { name: message.guild?.name!, iconURL: message.guild?.iconURL()! },
      title: `\` slash (/) \` 명령어`,
      description: `명령어\n명령어 설명`,
      color: client.embedcolor
    });
    let msgcmdembed = mkembed({
      title: `\` 기본 (${client.prefix}) \` 명령어`,
      description: `명령어 [같은 명령어]\n명령어 설명`,
      footer: { text: `PREFIX: ${client.prefix}` },
      color: client.embedcolor
    });
    slash.commands.forEach((cmd) => {
      slashcmdembed.addField(`**/${cmd.metadata.name}**`, `${cmd.metadata.description}`, true);
    });
    msg.commands.forEach((cmd) => {
      msgcmdembed.addField(`**${client.prefix}${cmd.metadata.name} [${(cmd.metadata.aliases) ? cmd.metadata.aliases : ''}]**`, `${cmd.metadata.description}`, true);
    });
    if (message.member && message.member.user) return message.member.user.send({ embeds: [ slashcmdembed, msgcmdembed ] });
    return message.channel.send({ embeds: [ slashcmdembed, msgcmdembed ] }).then(m => client.msgdelete(m, 3));
  }
}