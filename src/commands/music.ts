import { Bot } from "../index";
// import { config } from "../config/config";
import { ApplicationCommandOptionType, ChannelType, ChatInputApplicationCommandData, CommandInteraction, Message, VoiceBasedChannel } from "discord.js";
import { Command } from "../interfaces/Command";
import { embedCreate } from "../utils/embedCreate";
import { msgDelete } from "../utils/msgDelete";

export default class implements Command {
  permissions: boolean = true;
  name: string = "music";
  description: string = "music command";
  alias: string[] = [ "음악" ];
  data: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "채널생성",
        description: "음악재생 및 관리를 위한 채널 생성"
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "채널참가",
        description: "음악을 재생할 채널에 참가",
        options: [{
          type: ApplicationCommandOptionType.Channel,
          name: "음성채널",
          description: "음성 채널 선택",
          channel_types: [ ChannelType.GuildVoice, ChannelType.GuildStageVoice ],
          required: true
        }]
      }
    ]
  };
  msgData: { name: string; des: string; }[] = [
    {
      name: this.data.options![0].name,
      des: this.data.options![0].description
    },
    {
      name: this.data.options![1].name + " #음성채널",
      des: this.data.options![1].description
    }
  ];
  async msgRun(message: Message, _args: string[]) {
    return message.channel.send({ embeds: [ embedCreate({
      title: "아직 제작되지 않음",
      color: "DarkRed"
    }) ] }).then(m => msgDelete(m, 1));
  }
  async slashRun(interaction: CommandInteraction) {
    const cmd = interaction.options.data[0];
    if (cmd.name === "채널생성") {
      const check = await Bot.music.makeChannel(interaction.guild!);
      if (!check) return interaction.reply({ embeds: [ embedCreate({
        title: `채널생성 실패`,
        color: "DarkRed"
      }) ], ephemeral: true });
      return interaction.reply({ embeds: [ embedCreate({
        title: `채널생성 성공`,
        description: `<#${check}>`
      }) ], ephemeral: true });
    }
    if (cmd.name === "채널참가") {
      if (Bot.music.joinChannel(cmd.options![0].channel as VoiceBasedChannel)) return interaction.reply({ embeds: [ embedCreate({
        title: `채널참가 성공`,
        description: `<#${cmd.options![0].channel!.id}>`
      }) ], ephemeral: true });
      return interaction.reply({ embeds: [ embedCreate({
        title: `채널참가 실패`,
        description: `<#${cmd.options![0].channel!.id}>`,
        color: "DarkRed"
      }) ], ephemeral: true });
    }
    return;
  }
}