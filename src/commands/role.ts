import { Bot } from "../index";
import { ApplicationCommandOptionType, ChatInputApplicationCommandData, CommandInteraction, Message } from "discord.js";
import { Command } from "../interfaces/Command";
import { embedCreate } from "../utils/embedCreate";
import { msgDelete } from "../utils/msgDelete";

export default class implements Command {
  permissions: boolean = true;
  name: string = "역할";
  description: string = "관리자 권한 설정";
  alias: string[] = [];
  data: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "목록",
        description: "등록된 역할 목록 확인"
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "추가",
        description: "역할 등록",
        options: [{
          type: ApplicationCommandOptionType.Role,
          name: "역할",
          description: "등록할 역할",
          required: true
        }]
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "제거",
        description: "역할 제거",
        options: [{
          type: ApplicationCommandOptionType.Role,
          name: "역할",
          description: "제거할 역할",
          required: true
        }]
      }
    ]
  };
  msgData: { name: string; des: string; }[] = [];
  async msgRun(message: Message, _args: string[]) {
    return message.channel.send({ embeds: [ embedCreate({
      title: "아직 제작되지 않음",
      color: "DarkRed"
    }) ] }).then(m => msgDelete(m, 1));
  }
  async slashRun(interaction: CommandInteraction) {
    const cmd = interaction.options.data[0];
    let gdb = await Bot.db.guild.get(interaction.guild!.id);
    if (!gdb) return interaction.reply({ embeds: [ embedCreate({
      title: `\` 데이터베이스 오류 \``,
      description: "데이터베이스를 찾을수 없음",
      color: "DarkRed"
    }) ], ephemeral: true });
    if (cmd.name === "목록") return interaction.reply({ embeds: [ embedCreate({
      title: `\` 역할 ${cmd.name} \``,
      description: gdb.roles.length === 0
      ? "없음"
      : gdb.roles.replace(/ +/g,'').split(',').map(rid => `<@&${rid}>`).join('\n')
    }) ], ephemeral: true });
    const role = cmd.options![0].role!;
    if (cmd.name === "추가") gdb.roles = gdb.roles.replace(/ +/g,'')+(gdb.roles.replace(/ +/g,'').length === 0 ? '' : ',')+role.id;
    if (cmd.name === "제거") gdb.roles = gdb.roles.replace(/ +/g,'').split(',').filter(rid => rid !== role.id).join(',');
    gdb = await Bot.db.guild.set(interaction.guild!.id, { roles: gdb.roles });
    if (!gdb) return interaction.reply({ embeds: [ embedCreate({
      title: `\` 데이터베이스 오류 \``,
      description: "데이터베이스를 찾을수 없음",
      color: "DarkRed"
    }) ], ephemeral: true });
    return interaction.reply({ embeds: [ embedCreate({
      title: `\` 역할 ${cmd.name} \``,
      description: `<@&${role.id}> ${cmd.name} 완료`
    }) ], ephemeral: true });
  }
}