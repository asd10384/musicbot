import { SelectMenuInteraction as S } from "discord.js";
import { client, msg, slash } from "../..";
import mkembed from "../mkembed";

export default async function Help(interaction: S, args: string[]) {
  const slashcommand = slash.commands.get(args[0]);
  const msgcommand = msg.commands.get(args[0]);
  const embed = mkembed({ color: client.embedcolor });
  if (slashcommand) {
    embed.setTitle(`\` /${args[0]} \` 명령어`)
      .setDescription(`이름: ${args[0]}\n설명: ${slashcommand.metadata.description}`)
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
  return await interaction.editReply({ embeds: [ embed ] });
}