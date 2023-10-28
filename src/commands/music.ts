import "dotenv/config";
import { client } from "../index";
import { check_permission as ckper, embed_permission as emper } from "../utils/Permission";
import { Command } from "../interfaces/Command";
import { ApplicationCommandOptionType, ChannelType, ChatInputApplicationCommandData, CommandInteraction, EmbedBuilder, Message, TextChannel } from "discord.js";
import { QDB, guildData } from "../databases/Quickdb";
import { DiscordGatewayAdapterCreator, joinVoiceChannel } from "@discordjs/voice";
import { BOT_NUMBER } from "../databases/Quickdb";
import { Logger } from "../utils/Logger";
import { makeButton } from "../config/config";

/**
 * DB
 * let GDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 */

export default class implements Command {
  /** 해당 명령어 설명 */
  name = "music";
  visible = true;
  description = "play music";
  information = "디스코드에서 노래 재생";
  aliases: string[] = [ "음악" ];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'create_channel',
        description: 'Create a channel for the bot to use'
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'fix',
        description: 'error resolution'
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "join",
        description: "bot join voice channel",
        options: [{
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ 2, 13 ], // ChannelType.GuildVoice, ChannelType.GuildStageVoice
          name: "channel",
          description: "set channel",
          required: true
        }]
      }
    ]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashRun(interaction: CommandInteraction) {
    const cmd = interaction.options.data[0];
    if (cmd.name === 'create_channel') {
      if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
      return await interaction.followUp({ content: await this.create_channel(interaction, await QDB.guild.get(interaction.guild!)) });
    }
    if (cmd.name === 'fix') {
      if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
      return await interaction.followUp({ content: await this.fix(interaction, await QDB.guild.get(interaction.guild!)) });
    }
    if (cmd.name === "join") {
      const channel = cmd.options![0].channel!;
      joinVoiceChannel({
        adapterCreator: interaction.guild!.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        channelId: channel.id,
        guildId: interaction.guildId!
      });
      return await interaction.followUp({ content: "done!" });
    }
    if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
    return await interaction.followUp({ embeds: [ this.help() ] });
  }

  help(): EmbedBuilder {
    return client.help(this.metadata.name, this.metadata, this.msgmetadata)!;
  }

  async create_channel(message: Message | CommandInteraction, GDB: guildData): Promise<string> {
    if (!GDB) return `데이터베이스 오류\n다시시도해주세요.`;
    const channel = await message.guild?.channels.create({
      name: `MUSIC_CHANNEL${BOT_NUMBER}`,
      type: ChannelType.GuildText,
      topic: `Type in chat to play`
    });
    const msg = await channel?.send({
      content: `__**대기열 목록:**__\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`,
      embeds: [
        client.mkembed({
          title: `**현재 노래가 재생되지 않았습니다**`,
          image: `https://cdn.hydra.bot/hydra_no_music.png`,
          footer: { text: `PREFIX: ${client.prefix}` },
          color: client.embedColor
        })
      ]
    });
    return await QDB.guild.set(message.guild!, {
      channelId: channel?.id ? channel.id : "null",
      msgId: msg?.id ? msg.id : "null"
    }).then((val) => {
      if (!val) return `데이터베이스 오류\n다시시도해주세요.`;
      msg?.edit({ content: msg.content, embeds: msg.embeds, components: [ makeButton() ] });
      return `<#${channel?.id!}> creation complete!`;
    }).catch(() => {
      return `데이터베이스 오류\n다시시도해주세요.`;
    });
  }

  async fix(message: Message | CommandInteraction, GDB: guildData): Promise<string> {
    let channel = message.guild?.channels.cache.get(GDB.channelId);
    if (channel) {
      await (channel as TextChannel).messages.fetch().then((msg) => {
        try {
          if (msg.size > 0) (channel as TextChannel).bulkDelete(msg.size).catch(() => {
            if (client.debug) Logger.error('메세지 전체 삭제 오류');
          });
        } catch (err) {}
      });
    } else {
      channel = await message.guild?.channels.create({
        name: `MUSIC_CHANNEL${BOT_NUMBER}`,
        type: ChannelType.GuildText,
        topic: `Type in chat to play`
      });
    }
    const msg = await (channel as TextChannel).send({
      content: `__**대기열 목록:**__\n음성 채널에 참여한 후 노래제목 혹은 url로 노래를 대기열에 추가하세요.`,
      embeds: [
        client.mkembed({
          title: `**현재 노래가 재생되지 않았습니다**`,
          image: `https://cdn.hydra.bot/hydra_no_music.png`,
          footer: { text: `PREFIX: ${client.prefix}` },
          color: client.embedColor
        })
      ]
    });
    return await QDB.guild.set(message.guild!, {
      channelId: channel?.id ? channel.id : "null",
      msgId: msg?.id ? msg.id : "null"
    }).then((val) => {
      if (!val) return `데이터베이스 오류\n다시시도해주세요.`;
      msg?.edit({ content: msg.content, embeds: msg.embeds, components: [ makeButton() ] });
      client.getmc(msg.guild!).stop({});
      return `Error correction completed!`;
    }).catch(() => {
      return `데이터베이스 오류\n다시시도해주세요.`;
    });
  }
}