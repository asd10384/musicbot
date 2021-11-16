import { client, msg, slash } from "..";
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

/** help 명령어 */
export default class HelpCommand implements Command {
  /** 해당 명령어 설명 */
  metadata = <D>{
    name: 'help',
    description: '명령어 확인'
  };

  /** 실행되는 부분 */
  async run(interaction: I) {
    const slashcmdembed = mkembed({
      title: `\` slash (/) \` 명령어`,
      description: `명령어\n명령어 설명`,
      color: client.embedcolor
    });
    const msgcmdembed = mkembed({
      title: `\` 기본 (${client.prefix}) \` 명령어`,
      description: `명령어 [같은 명령어]\n명령어 설명`,
      footer: { text: `PREFIX: ${client.prefix}` },
      color: client.embedcolor
    });
    let cmdlist: { label: string, description: string, value: string }[] = [];
    slash.commands.forEach((cmd) => {
      if (cmd.metadata.name === this.metadata.name) return;
      cmdlist.push({ label: `/${cmd.metadata.name}`, description: `${cmd.metadata.description}`, value: `${cmd.metadata.name}` });
      slashcmdembed.addField(`**/${cmd.metadata.name}**`, `${cmd.metadata.description}`, true);
    });
    msg.commands.forEach((cmd) => {
      // cmdlist.push({ label: `${client.prefix}${cmd.metadata.name} [${(cmd.metadata.aliases) ? cmd.metadata.aliases : ''}]`, description: `${cmd.metadata.description}`, value: `${cmd.metadata.name}` });
      msgcmdembed.addField(`**${client.prefix}${cmd.metadata.name} [${(cmd.metadata.aliases) ? cmd.metadata.aliases : ''}]**`, `${cmd.metadata.description}`, true);
    });
    const rowhelp = mkembed({
      title: '\` 명령어 상세보기 \`',
      description: `명령어의 자세한 내용은\n아래의 선택박스에서 선택해\n확인할수있습니다.`,
      footer: { text: '여러번 가능' },
      color: client.embedcolor
    });
    const row = new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setCustomId('help')
        .setPlaceholder('명령어를 선택해주세요.')
        .addOptions(cmdlist)
    );
    await interaction.editReply({ embeds: [ slashcmdembed, msgcmdembed, rowhelp ], components: [ row ] });
  }
}