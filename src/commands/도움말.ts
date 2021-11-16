import { client, msg, slash } from "..";
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

/** 도움말 명령어 */
export default class 도움말Command implements Command {
  /** 해당 명령어 설명 */
  metadata = <D>{
    name: '도움말',
    description: '명령어 확인',
    options: [{
      type: 'STRING',
      name: '명령어',
      description: '명령어 이름을 입력해 자세한 정보 확인',
      required: false
    }]
  };

  /** 실행되는 부분 */
  async run(interaction: I) {
    const commandName = interaction.options.getString('명령어', false);
    if (commandName) {
      const slashcommand = slash.commands.get(commandName);
      const msgcommand = msg.commands.get(commandName);
      let embed = mkembed({ color: client.embedcolor });
      if (slashcommand) {
        embed.setTitle(`\` /${commandName} \` 명령어`)
          .setDescription(`이름: ${commandName}\n설명: ${slashcommand.metadata.description}`)
          .setFooter(`도움말: /도움말`);
      } else if (msgcommand) {
        embed.setTitle(`\` ${client.prefix}${commandName} \` 명령어`)
          .setDescription(`이름: ${commandName}\nAND: ${(msgcommand.metadata.aliases) ? msgcommand.metadata.aliases : ''}\n설명: ${msgcommand.metadata.description}`)
          .setFooter(`PREFIX: ${client.prefix}`);
      } else {
        embed.setTitle(`\` ${commandName} \` 명령어`)
          .setDescription(`명령어를 찾을수 없습니다.`)
          .setFooter(`도움말: /도움말`)
          .setColor('DARK_RED');
      }
      return await interaction.editReply({ embeds: [ embed ] });
    }
    let slashcmdembed = mkembed({
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
      if (cmd.metadata.name === this.metadata.name) return;
      slashcmdembed.addField(`**/${cmd.metadata.name}**`, `${cmd.metadata.description}`, true);
    });
    msg.commands.forEach((cmd) => {
      msgcmdembed.addField(`**${client.prefix}${cmd.metadata.name} [${(cmd.metadata.aliases) ? cmd.metadata.aliases : ''}]**`, `${cmd.metadata.description}`, true);
    });
    await interaction.editReply({ embeds: [ slashcmdembed, msgcmdembed ] });
  }
}