import { Bot } from "../index";
import { config } from "../config/config";
import { ActionRowBuilder, AnySelectMenuInteraction, ApplicationCommandOptionType, ChatInputApplicationCommandData, Message, StringSelectMenuBuilder } from "discord.js";
import { Command } from "../interfaces/Command";
import { embedCreate } from "../utils/embedCreate";
import { msgDelete } from "../utils/msgDelete";

export default class implements Command {
  permissions: boolean = false;
  name: string = "help";
  description: string = "command description";
  alias: string[] = [];
  data: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
  };
  msgData: { name: string; des: string; }[] = [];
  async msgRun(message: Message, _args: string[]) {
    return message.channel.send({ embeds: [
      embedCreate({
        title: "` 명령어 확인 `",
        description: "명령어의 자세한 내용은\n아래의 선택박스에서 선택해\n확인할수 있습니다.",
        footer: { text: "여러번 가능" }
      })
    ], components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("help")
          .setPlaceholder("명령어를 선택해주세요.")
          .addOptions(Bot.commandsMap.map(cmd => {
            return {
              label: `${config.prefix}${cmd.name}${cmd.alias.length > 0 ? ` [${cmd.alias.join(',')}]` : ''}`,
              description: `${cmd.description}`,
              value: `${cmd.name}`
            };
          }))
      )
    ] }).then(m => msgDelete(m, 6));
  }

  async menuRun(interaction: AnySelectMenuInteraction, args: string[]) {
    const command = Bot.commandsMap.get(args[0]);
    if (!command) return await interaction.reply({ embeds: [ embedCreate({
      title: `\` 명령어 검색 오류 \``,
      description: `${args[0]} 명령어를 찾을수 없습니다.`,
      color: "DarkRed"
    }) ], ephemeral: true });
    return await interaction.reply({ embeds: [ embedCreate({
      title: `\` ${command.name} 도움말 \``,
      description: `설명: ${command.description}${
        command.data.options && command.data.options.length > 0
        ? "\n\n"+command.data.options.map((v) => `/${command.name} ${
          v.type === ApplicationCommandOptionType.Subcommand || v.type === ApplicationCommandOptionType.SubcommandGroup
          ? v.name
          : v.type === ApplicationCommandOptionType.Channel
          ? '[#'+v.name+']'
          : v.type === ApplicationCommandOptionType.User || v.type === ApplicationCommandOptionType.Role
          ? '[@'+v.name+']'
          : '['+v.name+']'
        }${
          (v.type === ApplicationCommandOptionType.Subcommand || v.type === ApplicationCommandOptionType.SubcommandGroup) && v.options && v.options.length > 0
          ? v.options.map((v2) => ` ${
            v2.type === ApplicationCommandOptionType.Subcommand
            ? v2.name
            : v2.type === ApplicationCommandOptionType.Channel
            ? '[#'+v2.name+']'
            : v2.type === ApplicationCommandOptionType.User || v2.type === ApplicationCommandOptionType.Role
            ? '[@'+v2.name+']'
            : '['+v2.name+']'
          }`)
          : ''
        }\n : ${v.description}`).join('\n')
        : ''
      }${
        command.msgData.length > 0
        ? "\n\n"+command.msgData.map((v) => `${config.prefix}${command.name} ${v.name}\n : ${v.des}`).join('\n')
        : ''
      }`
    }) ], ephemeral: true });
  }
}